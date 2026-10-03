import { expect, test } from "bun:test";
import {
  applyPendingOperations,
  compactSyncQueue,
  getUnchangedOperationIds,
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
