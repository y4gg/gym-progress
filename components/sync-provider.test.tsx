import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import type { ExerciseLog, SyncOperation, Workout } from "@/lib/types";
import { applyPendingOperations } from "@/lib/sync";

const browser = new Window({ url: "http://localhost" });
for (const name of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "Element",
  "Node",
  "MutationObserver",
  "Event",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? browser : browser[name],
  });
}
let currentUser = "account-a";
mock.module("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: currentUser } },
      isPending: false,
      error: null,
    }),
  },
}));
mock.module("@/lib/use-store-hydrated", () => ({
  useStoreHydrated: () => true,
}));
mock.module("sonner", () => ({ toast: { error: mock(() => {}) } }));
let remote: { workouts: Workout[]; exerciseLogs: ExerciseLog[] };
const getSnapshot = mock(async (expectedUserId?: string): Promise<unknown> => {
  expect(expectedUserId).toBe(currentUser);
  return { success: true, status: "success", ...remote };
});
const send = mock(
  async (
    operations: SyncOperation[],
    expectedUserId?: string,
  ): Promise<unknown> => {
    expect(expectedUserId).toBe(currentUser);
    remote = applyPendingOperations(
      remote.workouts,
      remote.exerciseLogs,
      operations,
    );
    return {
      success: true,
      status: "success",
      ...remote,
      appliedOperationIds: operations.map((operation) => operation.id),
    };
  },
);
mock.module("@/server/sync", () => ({
  getSyncSnapshot: getSnapshot,
  syncOperations: send,
}));
const { act, cleanup, render, waitFor } =
  await import("@testing-library/react");
const { useStore } = await import("@/lib/store");
const { SyncProvider } = await import("./sync-provider");
const timestamp = "2026-10-03T10:00:00.000Z";
const workout: Workout = {
  id: "workout",
  name: "Workout",
  exercises: [],
  createdAt: timestamp,
  updatedAt: timestamp,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  currentUser = "account-a";
  remote = { workouts: [], exerciseLogs: [] };
  browser.localStorage.clear();
  useStore.getState().clearData();
  getSnapshot.mockClear();
  send.mockClear();
});
afterEach(cleanup);

test("large offline queues drain in server-sized batches without losing remaining changes", async () => {
  const operations: SyncOperation[] = Array.from(
    { length: 405 },
    (_, index) => ({
      id: `operation-${index}`,
      type: "addWorkout",
      workout: { ...workout, id: `workout-${index}` },
      queuedAt: timestamp,
    }),
  );
  useStore.setState({
    syncUserId: currentUser,
    pendingSyncOperations: operations,
  });
  render(<SyncProvider />);
  await waitFor(() =>
    expect(useStore.getState().pendingSyncOperations).toHaveLength(0),
  );
  expect(send.mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 5]);
  expect(useStore.getState().workouts).toHaveLength(405);
  expect(
    send.mock.calls.every(
      ([, expectedUserId]) => expectedUserId === currentUser,
    ),
  ).toBe(true);
});

test("deleting a workout while its add is in flight still deletes it on the server", async () => {
  useStore.setState({ syncUserId: currentUser });
  useStore.getState().addWorkout(workout);
  const pending = deferred<unknown>();
  send.mockImplementationOnce(async () => pending.promise);
  render(<SyncProvider />);
  await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  const [sent] = send.mock.calls[0];
  act(() => useStore.getState().deleteWorkout(workout.id));
  remote = { workouts: [workout], exerciseLogs: [] };
  await act(async () =>
    pending.resolve({
      success: true,
      status: "success",
      ...remote,
      appliedOperationIds: sent.map((operation) => operation.id),
    }),
  );
  await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  expect(send.mock.calls[1][0][0].type).toBe("deleteWorkout");
  expect(useStore.getState().workouts).toEqual([]);
  expect(remote.workouts).toEqual([]);
});

test("an initial snapshot failure retries reconciliation before uploading guest data", async () => {
  useStore.getState().addWorkout(workout);
  getSnapshot.mockImplementationOnce(async () => ({
    success: false,
    status: "server_error",
  }));
  render(<SyncProvider />);
  await waitFor(() => expect(getSnapshot).toHaveBeenCalledTimes(2), {
    timeout: 3500,
  });
  await waitFor(() =>
    expect(useStore.getState().pendingSyncOperations).toHaveLength(0),
  );
  expect(useStore.getState().syncUserId).toBe(currentUser);
  expect(remote.workouts.map((value) => value.id)).toEqual([workout.id]);
});

test("switching accounts starts reconciliation even while the old snapshot is pending", async () => {
  const oldSnapshot = deferred<unknown>();
  getSnapshot.mockImplementationOnce(async () => oldSnapshot.promise);
  const view = render(<SyncProvider />);
  await waitFor(() => expect(getSnapshot).toHaveBeenCalledTimes(1));
  currentUser = "account-b";
  remote = { workouts: [{ ...workout, id: "b-workout" }], exerciseLogs: [] };
  view.rerender(<SyncProvider />);
  await waitFor(() => expect(useStore.getState().syncUserId).toBe("account-b"));
  await act(async () =>
    oldSnapshot.resolve({
      success: true,
      status: "success",
      workouts: [workout],
      exerciseLogs: [],
    }),
  );
  expect(useStore.getState().workouts.map((value) => value.id)).toEqual([
    "b-workout",
  ]);
});

test("queue edits are debounced before sending and flush their latest value", async () => {
  useStore.setState({ syncUserId: currentUser });
  render(<SyncProvider />);
  await waitFor(() => expect(useStore.getState().syncStatus).toBe("synced"));
  act(() => {
    useStore.getState().addWorkout(workout);
    useStore.getState().editWorkout({ ...workout, name: "Latest workout" });
  });
  expect(send).not.toHaveBeenCalled();
  await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  expect(remote.workouts[0].name).toBe("Latest workout");
});

test("a rejected operation retains the local payload and does not retry indefinitely", async () => {
  useStore.setState({ syncUserId: currentUser });
  useStore.getState().addWorkout(workout);
  send.mockImplementationOnce(async () => ({
    success: false,
    status: "conflict",
    appliedOperationIds: [],
    workouts: [],
    exerciseLogs: [],
  }));
  render(<SyncProvider />);
  await waitFor(() => expect(useStore.getState().syncStatus).toBe("error"));
  expect(useStore.getState().pendingSyncOperations).toHaveLength(1);
  expect(useStore.getState().workouts[0].id).toBe(workout.id);
  await new Promise((resolve) => setTimeout(resolve, 400));
  expect(send).toHaveBeenCalledTimes(1);
});
