"use server";

import { Exercise, Workout } from "@/lib/types";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { exercise, workout } from "@/db/schema";
import { isCuid } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";

export async function addWorkout(newWorkout: Workout) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return;
  if (!isCuid(newWorkout.id)) return;

  await db.insert(workout).values(newWorkout);
}

export async function addExercise(newExercise: Exercise) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return;
  if (!isCuid(newExercise.id)) return;

  const result = await db.query.workout.findFirst({
    where: eq(workout.id, newExercise.workoutId),
  });
  if (!result) return;

  await db.insert(exercise).values(newExercise);
  return;
}

export async function editWorkout(updatedWorkout: Workout) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return;
  if (!isCuid(updatedWorkout.id)) return;

  await db
    .update(workout)
    .set({
      name: updatedWorkout.name,
      updatedAt: updatedWorkout.updatedAt,
    })
    .where(eq(workout.id, updatedWorkout.id));
}

export async function editExercise(updatedExercise: Exercise) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return;
  if (!isCuid(updatedExercise.id)) return;
  if (!isCuid(updatedExercise.workoutId)) return;

  const result = await db.query.workout.findFirst({
    where: eq(workout.id, updatedExercise.workoutId),
  });
  if (!result) return;

  await db
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
    .where(eq(exercise.id, updatedExercise.id));
}

export async function deleteWorkout(workoutId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return;
  if (!isCuid(workoutId)) return;

  await db.delete(workout).where(eq(workout.id, workoutId));
}

export async function deleteExercise(exerciseId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return;
  if (!isCuid(exerciseId)) return;

  await db.delete(exercise).where(eq(exercise.id, exerciseId));
}
