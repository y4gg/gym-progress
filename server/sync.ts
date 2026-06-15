"use server";

import { Exercise, Workout } from "@/lib/types";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { exercise, workout } from "@/db/schema";
import { isCuid } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";

const syncSuccess = { success: true, status: "success" } as const;
const syncUnauthorized = { success: false, status: "unauthorized" } as const;
const syncInvalidId = { success: false, status: "invalid_id" } as const;
const syncNotFound = { success: false, status: "not_found" } as const;
const syncConflict = { success: false, status: "conflict" } as const;

export async function addWorkout(newWorkout: Workout) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return syncUnauthorized;
  if (!isCuid(newWorkout?.id)) return syncInvalidId;

  const result = await db
    .insert(workout)
    .values(newWorkout)
    .onConflictDoNothing()
    .returning({ id: workout.id });

  if (result.length === 0) return syncConflict;
  return syncSuccess;
}

export async function addExercise(newExercise: Exercise) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return syncUnauthorized;
  if (!isCuid(newExercise?.id)) return syncInvalidId;
  if (!isCuid(newExercise?.workoutId)) return syncInvalidId;

  const result = await db.query.workout.findFirst({
    where: eq(workout.id, newExercise.workoutId),
  });
  if (!result) return syncNotFound;

  const insertResult = await db
    .insert(exercise)
    .values(newExercise)
    .onConflictDoNothing()
    .returning({ id: exercise.id });

  if (insertResult.length === 0) return syncConflict;
  return syncSuccess;
}

export async function editWorkout(updatedWorkout: Workout) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return syncUnauthorized;
  if (!isCuid(updatedWorkout?.id)) return syncInvalidId;

  const result = await db
    .update(workout)
    .set({
      name: updatedWorkout.name,
      updatedAt: updatedWorkout.updatedAt,
    })
    .where(eq(workout.id, updatedWorkout.id))
    .returning({ id: workout.id });

  if (result.length === 0) return syncNotFound;
  return syncSuccess;
}

export async function editExercise(updatedExercise: Exercise) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return syncUnauthorized;
  if (!isCuid(updatedExercise?.id)) return syncInvalidId;
  if (!isCuid(updatedExercise?.workoutId)) return syncInvalidId;

  const result = await db.query.workout.findFirst({
    where: eq(workout.id, updatedExercise.workoutId),
  });
  if (!result) return syncNotFound;

  const updateResult = await db
    .update(exercise)
    .set({
      name: updatedExercise.name,
      workoutId: updatedExercise.workoutId,
      weight: updatedExercise.weight,
      sets: updatedExercise.sets,
      maxReps: updatedExercise.maxReps ?? null,
      logging: updatedExercise.logging,
      notes: updatedExercise.notes,
      updatedAt: updatedExercise.updatedAt,
    })
    .where(eq(exercise.id, updatedExercise.id))
    .returning({ id: exercise.id });

  if (updateResult.length === 0) return syncNotFound;
  return syncSuccess;
}

export async function deleteWorkout(workoutId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return syncUnauthorized;
  if (!isCuid(workoutId)) return syncInvalidId;

  const result = await db
    .delete(workout)
    .where(eq(workout.id, workoutId))
    .returning({ id: workout.id });

  if (result.length === 0) return syncNotFound;
  return syncSuccess;
}

export async function deleteExercise(exerciseId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return syncUnauthorized;
  if (!isCuid(exerciseId)) return syncInvalidId;

  const result = await db
    .delete(exercise)
    .where(eq(exercise.id, exerciseId))
    .returning({ id: exercise.id });

  if (result.length === 0) return syncNotFound;
  return syncSuccess;
}
