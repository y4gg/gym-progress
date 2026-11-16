import { beforeEach, expect, mock, test } from "bun:test";
import type { SyncOperation } from "@/lib/types";
import type {
  workout as workoutTable,
  exercise as exerciseTable,
} from "@/db/schema";

const getSession = mock(async () => ({ user: { id: "account-a" } }));
mock.module("@/lib/auth", () => ({ auth: { api: { getSession } } }));
mock.module("next/headers", () => ({ headers: async () => new Headers() }));
type OwnerRow = { userId: string; updatedAt: Date; workoutId?: string };
const ownerRows: OwnerRow[][] = [];
const select = mock(() => {
  const rows = ownerRows.shift() ?? [];
  const query = { where: () => ({ limit: async () => rows }) };
  return { from: () => ({ ...query, innerJoin: () => query }) };
});
const insertValues = mock(async (values: unknown) => values);
const insert = mock(() => ({ values: insertValues }));
const updateValues = mock((values: unknown) => ({ where: async () => values }));
const update = mock(() => ({ set: updateValues }));
const findWorkouts = mock(
  async (): Promise<(typeof workoutTable.$inferSelect & {
    exercises: (typeof exerciseTable.$inferSelect)[];
  })[]> => [],
);
const findLogs = mock(async () => []);
const transaction = mock(
  async (
    callback: (client: {
      select: typeof select;
      insert: typeof insert;
      update: typeof update;
    }) => unknown,
  ) => callback({ select, insert, update }),
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
function deletion(
  index: number,
): Extract<SyncOperation, { type: "deleteWorkout" }> {
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
  ownerRows.length = 0;
  insertValues.mockClear();
  updateValues.mockClear();
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

const legacyExercise = {
  id: "clh3bpd7000013b6k6d3w4j2m",
  workoutId,
  name: "Bench press",
  position: 0,
  weight: 20,
  sets: 3,
  logging: false,
  notes: "",
  step: 0.125,
  createdAt: timestamp,
  updatedAt: timestamp,
};

test.each([
  ["addExercise", 0.125, 0.13],
  ["editExercise", 0.125, 0.13],
  ["addExercise", 0.001, 0.01],
] as const)(
  "%s normalizes legacy step %s to %s without blocking unrelated changes",
  async (type, step, expectedStep) => {
    ownerRows.push(
      [{ userId: "account-a", updatedAt: new Date(timestamp) }],
      type === "editExercise"
        ? [{ userId: "account-a", workoutId, updatedAt: new Date(0) }]
        : [],
      [],
    );
    const operations: SyncOperation[] = [
      {
        id: "legacy-exercise",
        type,
        exercise: { ...legacyExercise, step },
        queuedAt: timestamp,
      },
      { ...deletion(1), workoutId: "clh3bpd7000023b6k6d3w4j2m" },
    ];
    const result = await syncOperations(operations, "account-a");
    expect(result.success).toBe(true);
    expect(
      "appliedOperationIds" in result && result.appliedOperationIds,
    ).toEqual(["legacy-exercise", "delete-1"]);
    expect(
      type === "addExercise" ? insertValues : updateValues,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ step: expectedStep, icon: "dumbbell" }),
    );
    expect(operations[0]).toMatchObject({ exercise: { step } });
  },
);

test("legacy steps nested in workout payloads do not block a sync batch", async () => {
  const result = await syncOperations([
    {
      id: "legacy-workout",
      type: "addWorkout",
      queuedAt: timestamp,
      workout: {
        id: workoutId,
        name: "Push",
        exercises: [legacyExercise],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    { ...deletion(1), workoutId: "clh3bpd7000023b6k6d3w4j2m" },
  ]);
  expect(result.success).toBe(true);
  expect("appliedOperationIds" in result && result.appliedOperationIds).toEqual(
    ["legacy-workout", "delete-1"],
  );
});

test("invalid step values still fail validation before database writes", async () => {
  for (const step of [0, -0.125, NaN, Infinity, 1_000_000, "0.125"]) {
    const result = await syncOperations([
      {
        id: "invalid-exercise",
        type: "addExercise",
        queuedAt: timestamp,
        exercise: { ...legacyExercise, step: step as number },
      },
    ]);
    expect(result).toEqual({ success: false, status: "invalid_payload" });
  }
  expect(transaction).not.toHaveBeenCalled();
});

test.each(["addWorkout", "editWorkout", "upsertWorkout"] as const)(
  "%s persists the chosen workout icon and returns it in the snapshot",
  async (type) => {
    if (type !== "addWorkout") {
      ownerRows.push([{ userId: "account-a", updatedAt: new Date(0) }]);
    }
    findWorkouts.mockResolvedValueOnce([
      {
        id: workoutId,
        userId: "account-a",
        name: "Push",
        icon: "chest",
        exercises: [],
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
      },
    ]);
    const result = await syncOperations([
      {
        id: "workout-icon",
        type: type === "editWorkout" ? "editWorkout" : "addWorkout",
        queuedAt: timestamp,
        workout: {
          id: workoutId,
          name: "Push",
          icon: "chest",
          exercises: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      },
    ]);

    expect(result.success).toBe(true);
    expect(
      type === "addWorkout" ? insertValues : updateValues,
    ).toHaveBeenCalledWith(expect.objectContaining({ icon: "chest" }));
    expect("workouts" in result && result.workouts[0].icon).toBe("chest");
  },
);

test("legacy workout payloads get the default icon and unknown icons are rejected", async () => {
  const operation: SyncOperation = {
    id: "legacy-workout",
    type: "addWorkout",
    queuedAt: timestamp,
    workout: {
      id: workoutId,
      name: "Push",
      exercises: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
  expect((await syncOperations([operation])).success).toBe(true);
  expect(insertValues).toHaveBeenCalledWith(
    expect.objectContaining({ icon: "dumbbell" }),
  );

  transaction.mockClear();
  const invalid = {
    ...operation,
    workout: { ...operation.workout, icon: "unknown" },
  };
  expect(await syncOperations([invalid as SyncOperation])).toEqual({
    success: false,
    status: "invalid_payload",
  });
  expect(transaction).not.toHaveBeenCalled();
});

test.each(["addExercise", "editExercise", "upsertExercise"] as const)(
  "%s persists the exercise icon and includes it in the sync snapshot",
  async (type) => {
    ownerRows.push(
      [{ userId: "account-a", updatedAt: new Date(0) }],
      type === "addExercise"
        ? []
        : [{ userId: "account-a", workoutId, updatedAt: new Date(0) }],
    );
    findWorkouts.mockResolvedValueOnce([
      {
        id: workoutId,
        userId: "account-a",
        name: "Push",
        icon: "upper-body",
        createdAt: new Date(timestamp),
        updatedAt: new Date(timestamp),
        exercises: [{
          ...legacyExercise,
          icon: "chest",
          maxReps: null,
          step: 2.5,
          createdAt: new Date(timestamp),
          updatedAt: new Date(timestamp),
        }],
      },
    ]);
    const result = await syncOperations([
      {
        id: "exercise-icon",
        type: type === "editExercise" ? "editExercise" : "addExercise",
        queuedAt: timestamp,
        exercise: { ...legacyExercise, step: 2.5, icon: "chest" },
      },
    ]);
    expect(result.success).toBe(true);
    expect(
      type === "addExercise" ? insertValues : updateValues,
    ).toHaveBeenCalledWith(expect.objectContaining({ icon: "chest" }));
    expect("workouts" in result && result.workouts[0].exercises[0].icon).toBe(
      "chest",
    );
  },
);
