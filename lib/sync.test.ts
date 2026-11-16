import { expect, test } from "bun:test";
import {
  applyPendingOperations,
  compactSyncQueue,
  getUnchangedOperationIds,
  normalizeExercise,
  normalizeWorkout,
} from "@/lib/sync";
import type { SyncOperation, Workout } from "@/lib/types";

const workout: Workout = {
  id: "workout",
  name: "Before sync",
  exercises: [],
  createdAt: "2026-10-03T10:00:00.000Z",
  updatedAt: "2026-10-03T10:00:00.000Z",
};
const sent: SyncOperation = {
  id: "add-workout",
  type: "addWorkout",
  workout,
  queuedAt: workout.createdAt,
};

test("a sync acknowledgement keeps an edit compacted into an in-flight add", () => {
  const edited = {
    ...workout,
    name: "Edited during sync",
    updatedAt: "2026-10-03T10:01:00.000Z",
  };
  const queue = compactSyncQueue([sent], {
    id: "edit-workout",
    type: "editWorkout",
    workout: edited,
    queuedAt: edited.updatedAt,
  });
  expect(queue[0].id).toBe(sent.id);
  expect(getUnchangedOperationIds([sent], queue, [sent.id])).toEqual([]);
  expect(applyPendingOperations([workout], [], queue).workouts[0].name).toBe(
    edited.name,
  );
});

test("only unchanged acknowledged operations are removed while new offline changes stay queued", () => {
  const next: SyncOperation = {
    id: "new-workout",
    type: "addWorkout",
    workout: { ...workout, id: "new-workout" },
    queuedAt: workout.createdAt,
  };
  expect(
    getUnchangedOperationIds([sent], [sent, next], [sent.id, next.id]),
  ).toEqual([sent.id]);
  const restored = applyPendingOperations([workout], [], [next]);
  expect(restored.workouts.map((value) => value.id)).toEqual([
    workout.id,
    next.workout.id,
  ]);
});

const exercise = {
  id: "exercise",
  name: "Bench press",
  workoutId: workout.id,
  position: 0,
  weight: 20,
  sets: 3,
  logging: false,
  notes: "",
  step: 2.5,
  createdAt: workout.createdAt,
  updatedAt: workout.updatedAt,
};
const exerciseLog = {
  id: "log",
  exerciseId: exercise.id,
  workoutId: workout.id,
  reps: 8,
  weight: 20,
  performedAt: workout.createdAt,
  createdAt: workout.createdAt,
};
const deletionCases: { add: SyncOperation; deletion: SyncOperation }[] = [
  {
    add: sent,
    deletion: {
      id: "delete-workout",
      type: "deleteWorkout",
      workoutId: workout.id,
      queuedAt: workout.createdAt,
    },
  },
  {
    add: {
      id: "add-exercise",
      type: "addExercise",
      exercise,
      queuedAt: workout.createdAt,
    },
    deletion: {
      id: "delete-exercise",
      type: "deleteExercise",
      exerciseId: exercise.id,
      queuedAt: workout.createdAt,
    },
  },
  {
    add: {
      id: "add-log",
      type: "addExerciseLog",
      exerciseLog,
      queuedAt: workout.createdAt,
    },
    deletion: {
      id: "delete-log",
      type: "deleteExerciseLog",
      exerciseLogId: exerciseLog.id,
      queuedAt: workout.createdAt,
    },
  },
];

test.each(deletionCases)(
  "$add.type followed by $deletion.type retains a delete for an in-flight add",
  ({ add, deletion }) => {
    expect(compactSyncQueue([add], deletion)).toEqual([deletion]);
  },
);

test("replaying a pending workout add preserves exercises already present in the server snapshot", () => {
  const exercise = {
    id: "exercise",
    name: "Bench press",
    workoutId: workout.id,
    position: 0,
    weight: 20,
    sets: 3,
    logging: false,
    notes: "",
    step: 2.5,
    createdAt: workout.createdAt,
    updatedAt: workout.updatedAt,
  };
  const snapshot = { ...workout, exercises: [exercise] };
  const replayed = applyPendingOperations([snapshot], [], [sent]);
  expect(replayed.workouts[0].exercises).toEqual([normalizeExercise(exercise)]);
});

test("legacy and unknown icons fall back while offline icon edits survive queue replay", () => {
  expect(normalizeWorkout(workout).icon).toBe("dumbbell");
  expect(
    normalizeWorkout({ ...workout, icon: "biceps-flexed" } as unknown as Workout).icon,
  ).toBe("arms");
  expect(
    normalizeWorkout({ ...workout, icon: "unknown" } as unknown as Workout).icon,
  ).toBe("dumbbell");
  const edited: Workout = { ...workout, icon: "back" };
  const queue = compactSyncQueue([sent], {
    id: "edit-icon",
    type: "editWorkout",
    workout: edited,
    queuedAt: workout.createdAt,
  });
  expect(applyPendingOperations([workout], [], queue).workouts[0].icon).toBe(
    "back",
  );
});
