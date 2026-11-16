import { beforeEach, expect, mock, test } from "bun:test";
import type { SyncOperation } from "@/lib/types";

const getSession = mock(async () => ({ user: { id: "account-a" } }));
mock.module("@/lib/auth", () => ({ auth: { api: { getSession } } }));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
const select = mock(() => ({
  from: () => ({ where: () => ({ limit: async () => [] }) }),
}));
const findWorkouts = mock(async () => []);
const findLogs = mock(async () => []);
const transaction = mock(
  async (callback: (client: { select: typeof select }) => unknown) =>
    callback({ select }),
);
mock.module("@/db", () => ({
  db: {
    select,
    transaction,
    query: {
      workout: { findMany: findWorkouts },
      exerciseLog: { findMany: findLogs },
    },
  },
}));
const { getSyncSnapshot, syncOperations } = await import("./sync");
const timestamp = "2026-10-03T10:00:00.000Z";
const workoutId = "clh3bpd7000003b6k6d3w4j2m";
function deletion(index: number): SyncOperation {
  return {
    id: `delete-${index}`,
    type: "deleteWorkout",
    workoutId,
    queuedAt: timestamp,
  };
}

beforeEach(() => {
  getSession.mockClear();
  select.mockClear();
  transaction.mockClear();
  findWorkouts.mockClear();
  findLogs.mockClear();
});

test("account-bound sync requests reject a session switched to another user", async () => {
  expect(await getSyncSnapshot("account-b")).toEqual({
    success: false,
    status: "unauthorized",
  });
  expect(await syncOperations([deletion(0)], "account-b")).toEqual({
    success: false,
    status: "unauthorized",
  });
  expect(transaction).not.toHaveBeenCalled();
  expect(findWorkouts).not.toHaveBeenCalled();
});

test("a full client-sized batch is accepted and acknowledged", async () => {
  const operations = Array.from({ length: 200 }, (_, index) => deletion(index));
  const result = await syncOperations(operations, "account-a");
  expect(result.success).toBe(true);
  expect("appliedOperationIds" in result && result.appliedOperationIds).toEqual(
    operations.map((operation) => operation.id),
  );
});

test("oversized batches are rejected before opening a transaction", async () => {
  const result = await syncOperations(
    Array.from({ length: 201 }, (_, index) => deletion(index)),
  );
  expect(result).toEqual({ success: false, status: "invalid_payload" });
  expect(transaction).not.toHaveBeenCalled();
});

test("partial failures acknowledge only preceding successful operations", async () => {
  const result = await syncOperations([
    deletion(0),
    {
      id: "add-exercise",
      type: "addExercise",
      queuedAt: timestamp,
      exercise: {
        id: "clh3bpd7000013b6k6d3w4j2m",
        workoutId,
        name: "Bench press",
        position: 0,
        weight: 20,
        sets: 3,
        logging: false,
        notes: "",
        step: 2.5,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    deletion(2),
  ]);
  expect(result.success).toBe(false);
  expect(result.status).toBe("not_found");
  expect("appliedOperationIds" in result && result.appliedOperationIds).toEqual(
    ["delete-0"],
  );
  expect(select).toHaveBeenCalledTimes(2);
});
