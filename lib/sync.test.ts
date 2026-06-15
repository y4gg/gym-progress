import { describe, expect, test } from "bun:test";
import { createId } from "@paralleldrive/cuid2";

import {
  applyPendingOperations,
  compactSyncQueue,
  mergeInitialWorkouts,
  normalizeWorkout,
} from "@/lib/sync";
import type { Exercise, SyncOperation, Workout } from "@/lib/types";

const early = "2026-01-01T00:00:00.000Z";
const middle = "2026-01-02T00:00:00.000Z";
const late = "2026-01-03T00:00:00.000Z";
type SyncOperationInput = SyncOperation extends infer Operation
  ? Operation extends SyncOperation
    ? Omit<Operation, "id" | "queuedAt">
    : never
  : never;

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  const workoutId = overrides.workoutId ?? createId();

  return {
    id: createId(),
    name: "Bench press",
    workoutId,
    weight: 20,
    sets: 3,
    logging: false,
    notes: "",
    step: 2.5,
    createdAt: early,
    updatedAt: early,
    ...overrides,
  };
}

function workout(overrides: Partial<Workout> = {}): Workout {
  const id = overrides.id ?? createId();

  return {
    id,
    name: "Push",
    exercises: [],
    createdAt: early,
    updatedAt: early,
    ...overrides,
  };
}

function operation(
  overrides: SyncOperationInput,
): SyncOperation {
  return {
    id: createId(),
    queuedAt: late,
    ...overrides,
  } as SyncOperation;
}

describe("mergeInitialWorkouts", () => {
  test("uploads local-only workouts and exercises", () => {
    const localWorkout = workout();
    const localExercise = exercise({ workoutId: localWorkout.id });
    localWorkout.exercises = [localExercise];

    const result = mergeInitialWorkouts([localWorkout], []);

    expect(result.workouts).toEqual([localWorkout]);
    expect(result.operationsToQueue.map((item) => item.type)).toEqual([
      "addWorkout",
      "addExercise",
    ]);
  });

  test("downloads remote-only workouts", () => {
    const remoteWorkout = workout({ name: "Pull" });

    const result = mergeInitialWorkouts([], [remoteWorkout]);

    expect(result.workouts).toEqual([remoteWorkout]);
    expect(result.operationsToQueue).toEqual([]);
  });

  test("chooses the newer matching workout and exercise by updatedAt", () => {
    const workoutId = createId();
    const exerciseId = createId();
    const remoteExercise = exercise({
      id: exerciseId,
      workoutId,
      notes: "remote",
      updatedAt: middle,
    });
    const localExercise = exercise({
      id: exerciseId,
      workoutId,
      notes: "local",
      updatedAt: late,
    });
    const remoteWorkout = workout({
      id: workoutId,
      name: "Remote",
      exercises: [remoteExercise],
      updatedAt: late,
    });
    const localWorkout = workout({
      id: workoutId,
      name: "Local",
      exercises: [localExercise],
      updatedAt: early,
    });

    const result = mergeInitialWorkouts([localWorkout], [remoteWorkout]);

    expect(result.workouts[0].name).toBe("Remote");
    expect(result.workouts[0].exercises[0].notes).toBe("local");
    expect(result.operationsToQueue.map((item) => item.type)).toEqual([
      "editExercise",
    ]);
  });
});

describe("applyPendingOperations", () => {
  test("overlays pending add, edit, and delete operations", () => {
    const baseWorkout = workout({ name: "Remote" });
    const firstExercise = exercise({ workoutId: baseWorkout.id });
    const secondExercise = exercise({ workoutId: baseWorkout.id });
    const addedExercise = exercise({
      workoutId: baseWorkout.id,
      name: "Incline press",
    });
    const remoteSnapshot = [
      { ...baseWorkout, exercises: [firstExercise, secondExercise] },
    ];

    const result = applyPendingOperations(remoteSnapshot, [
      operation({
        type: "editExercise",
        exercise: { ...firstExercise, weight: 25, updatedAt: late },
      }),
      operation({ type: "addExercise", exercise: addedExercise }),
      operation({ type: "deleteExercise", exerciseId: secondExercise.id }),
    ]);

    expect(result[0].exercises.map((item) => item.id)).toEqual([
      firstExercise.id,
      addedExercise.id,
    ]);
    expect(result[0].exercises[0].weight).toBe(25);
  });

  test("delete workout removes nested exercises", () => {
    const baseWorkout = workout();
    const nestedExercise = exercise({ workoutId: baseWorkout.id });

    const result = applyPendingOperations(
      [{ ...baseWorkout, exercises: [nestedExercise] }],
      [operation({ type: "deleteWorkout", workoutId: baseWorkout.id })],
    );

    expect(result).toEqual([]);
  });
});

describe("compactSyncQueue", () => {
  test("collapses add followed by edit", () => {
    const baseWorkout = workout();
    const queue = compactSyncQueue(
      [operation({ type: "addWorkout", workout: baseWorkout })],
      operation({
        type: "editWorkout",
        workout: { ...baseWorkout, name: "Edited" },
      }),
    );

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("addWorkout");
    expect("workout" in queue[0] ? queue[0].workout.name : "").toBe("Edited");
  });

  test("removes add followed by delete", () => {
    const baseWorkout = workout();
    const queue = compactSyncQueue(
      [operation({ type: "addWorkout", workout: baseWorkout })],
      operation({ type: "deleteWorkout", workoutId: baseWorkout.id }),
    );

    expect(queue).toEqual([]);
  });

  test("replaces edit followed by delete", () => {
    const baseWorkout = workout();
    const queue = compactSyncQueue(
      [operation({ type: "editWorkout", workout: baseWorkout })],
      operation({ type: "deleteWorkout", workoutId: baseWorkout.id }),
    );

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("deleteWorkout");
  });

  test("collapses repeated edits", () => {
    const baseExercise = exercise();
    const queue = compactSyncQueue(
      [
        operation({
          type: "editExercise",
          exercise: { ...baseExercise, weight: 25 },
        }),
      ],
      operation({
        type: "editExercise",
        exercise: { ...baseExercise, weight: 30 },
      }),
    );

    expect(queue).toHaveLength(1);
    expect("exercise" in queue[0] ? queue[0].exercise.weight : 0).toBe(30);
  });
});

describe("timestamp and step normalization", () => {
  test("normalizes persisted date strings and missing exercise step", () => {
    const oldWorkout = {
      ...workout(),
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
      exercises: [
        {
          ...exercise(),
          createdAt: "2026-01-01",
          updatedAt: "2026-01-02",
          step: undefined,
        },
      ],
    } as unknown as Workout;

    const normalized = normalizeWorkout(oldWorkout);

    expect(normalized.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(normalized.updatedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(normalized.exercises[0].step).toBe(2.5);
    expect(normalized.exercises[0].createdAt).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });
});
