"use server";

import { and, eq, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { isCuid } from "@paralleldrive/cuid2";
import { z } from "zod";

import { db } from "@/db";
import { exercise, workout } from "@/db/schema";
import { auth } from "@/lib/auth";
import { normalizeExercise, normalizeWorkout } from "@/lib/sync";
import type { Exercise, SyncOperation, Workout } from "@/lib/types";

type SyncFailureStatus =
  | "unauthorized"
  | "invalid_id"
  | "invalid_payload"
  | "conflict"
  | "not_found"
  | "server_error";

type SyncDbClient = Pick<typeof db, "select" | "insert" | "update" | "delete">;

const syncSuccess = { success: true, status: "success" } as const;
const syncUnauthorized = { success: false, status: "unauthorized" } as const;
const syncInvalidId = { success: false, status: "invalid_id" } as const;
const syncInvalidPayload = {
  success: false,
  status: "invalid_payload",
} as const;

const isoDateSchema = z.string().refine((value) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}, "invalid_payload");

const cuidSchema = z.string().refine(isCuid, "invalid_id");

const exerciseSchema: z.ZodType<Exercise> = z.object({
  id: cuidSchema,
  name: z.string().min(4),
  workoutId: cuidSchema,
  weight: z.number().min(0),
  sets: z.number().int().min(1),
  maxReps: z.number().int().min(1).optional(),
  logging: z.boolean(),
  notes: z.string(),
  step: z.number().positive(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const workoutSchema: z.ZodType<Workout> = z.object({
  id: cuidSchema,
  name: z.string().min(1),
  exercises: z.array(exerciseSchema),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const syncOperationSchema: z.ZodType<SyncOperation> = z.discriminatedUnion(
  "type",
  [
    z.object({
      id: z.string().min(1),
      type: z.literal("addWorkout"),
      workout: workoutSchema,
      queuedAt: isoDateSchema,
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("editWorkout"),
      workout: workoutSchema,
      queuedAt: isoDateSchema,
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("deleteWorkout"),
      workoutId: cuidSchema,
      queuedAt: isoDateSchema,
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("addExercise"),
      exercise: exerciseSchema,
      queuedAt: isoDateSchema,
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("editExercise"),
      exercise: exerciseSchema,
      queuedAt: isoDateSchema,
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("deleteExercise"),
      exerciseId: cuidSchema,
      queuedAt: isoDateSchema,
    }),
  ],
);

const syncOperationsSchema = z.array(syncOperationSchema).max(200);

function statusFailure(status: SyncFailureStatus) {
  return { success: false, status } as const;
}

async function getRequiredUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

function assertCuid(id: string) {
  return isCuid(id);
}

function toDate(value: string) {
  return new Date(value);
}

function normalizeWorkoutForDb(newWorkout: Workout, userId: string) {
  const normalizedWorkout = normalizeWorkout(newWorkout);

  return {
    id: normalizedWorkout.id,
    userId,
    name: normalizedWorkout.name,
    createdAt: toDate(normalizedWorkout.createdAt),
    updatedAt: toDate(normalizedWorkout.updatedAt),
  };
}

function normalizeExerciseForDb(newExercise: Exercise) {
  const normalizedExercise = normalizeExercise(newExercise);

  return {
    id: normalizedExercise.id,
    name: normalizedExercise.name,
    workoutId: normalizedExercise.workoutId,
    weight: normalizedExercise.weight,
    sets: normalizedExercise.sets,
    maxReps: normalizedExercise.maxReps ?? null,
    logging: normalizedExercise.logging,
    notes: normalizedExercise.notes,
    step: normalizedExercise.step,
    createdAt: toDate(normalizedExercise.createdAt),
    updatedAt: toDate(normalizedExercise.updatedAt),
  };
}

function toClientWorkout(
  dbWorkout: typeof workout.$inferSelect & {
    exercises: (typeof exercise.$inferSelect)[];
  },
): Workout {
  return normalizeWorkout({
    id: dbWorkout.id,
    name: dbWorkout.name,
    createdAt: dbWorkout.createdAt.toISOString(),
    updatedAt: dbWorkout.updatedAt.toISOString(),
    exercises: dbWorkout.exercises.map((dbExercise) => ({
      id: dbExercise.id,
      name: dbExercise.name,
      workoutId: dbExercise.workoutId,
      weight: dbExercise.weight,
      sets: dbExercise.sets,
      maxReps: dbExercise.maxReps ?? undefined,
      logging: dbExercise.logging,
      notes: dbExercise.notes ?? "",
      step: dbExercise.step,
      createdAt: dbExercise.createdAt.toISOString(),
      updatedAt: dbExercise.updatedAt.toISOString(),
    })),
  });
}

async function getUserSnapshot(userId: string) {
  const dbWorkouts = await db.query.workout.findMany({
    where: eq(workout.userId, userId),
    with: {
      exercises: true,
    },
  });

  return dbWorkouts.map(toClientWorkout);
}

function validateOperations(operations: SyncOperation[]) {
  const result = syncOperationsSchema.safeParse(operations);

  if (result.success) {
    return { success: true as const, operations: result.data };
  }

  const hasInvalidId = result.error.issues.some(
    (issue) => issue.message === "invalid_id",
  );

  return {
    success: false as const,
    status: hasInvalidId ? "invalid_id" : "invalid_payload",
  };
}

async function findWorkoutOwner(client: SyncDbClient, workoutId: string) {
  const rows = await client
    .select({ userId: workout.userId, updatedAt: workout.updatedAt })
    .from(workout)
    .where(eq(workout.id, workoutId))
    .limit(1);

  return rows[0] ?? null;
}

async function findExerciseOwner(client: SyncDbClient, exerciseId: string) {
  const rows = await client
    .select({
      userId: workout.userId,
      updatedAt: exercise.updatedAt,
      workoutId: exercise.workoutId,
    })
    .from(exercise)
    .innerJoin(workout, eq(exercise.workoutId, workout.id))
    .where(eq(exercise.id, exerciseId))
    .limit(1);

  return rows[0] ?? null;
}

async function applyAddWorkout(
  client: SyncDbClient,
  newWorkout: Workout,
  userId: string,
) {
  const dbWorkout = normalizeWorkoutForDb(newWorkout, userId);
  const existing = await findWorkoutOwner(client, dbWorkout.id);

  if (existing && existing.userId !== userId) return "conflict";

  if (!existing) {
    await client.insert(workout).values(dbWorkout);
    return "success";
  }

  if (existing.updatedAt < dbWorkout.updatedAt) {
    await client
      .update(workout)
      .set({
        name: dbWorkout.name,
        createdAt: dbWorkout.createdAt,
        updatedAt: dbWorkout.updatedAt,
      })
      .where(and(eq(workout.id, dbWorkout.id), eq(workout.userId, userId)));
  }

  return "success";
}

async function applyEditWorkout(
  client: SyncDbClient,
  updatedWorkout: Workout,
  userId: string,
) {
  const dbWorkout = normalizeWorkoutForDb(updatedWorkout, userId);
  const existing = await findWorkoutOwner(client, dbWorkout.id);

  if (!existing) return "not_found";
  if (existing.userId !== userId) return "conflict";
  if (existing.updatedAt >= dbWorkout.updatedAt) return "success";

  await client
    .update(workout)
    .set({
      name: dbWorkout.name,
      updatedAt: dbWorkout.updatedAt,
    })
    .where(and(eq(workout.id, dbWorkout.id), eq(workout.userId, userId)));

  return "success";
}

async function applyDeleteWorkout(
  client: SyncDbClient,
  workoutId: string,
  userId: string,
) {
  const existing = await findWorkoutOwner(client, workoutId);

  if (existing && existing.userId !== userId) return "conflict";
  if (!existing) return "success";

  await client
    .delete(workout)
    .where(and(eq(workout.id, workoutId), eq(workout.userId, userId)));

  return "success";
}

async function applyAddExercise(
  client: SyncDbClient,
  newExercise: Exercise,
  userId: string,
) {
  const dbExercise = normalizeExerciseForDb(newExercise);
  const parent = await findWorkoutOwner(client, dbExercise.workoutId);

  if (!parent || parent.userId !== userId) return "not_found";

  const existing = await findExerciseOwner(client, dbExercise.id);
  if (existing && existing.userId !== userId) return "conflict";

  if (!existing) {
    await client.insert(exercise).values(dbExercise);
    return "success";
  }

  if (existing.updatedAt < dbExercise.updatedAt) {
    await client
      .update(exercise)
      .set({
        name: dbExercise.name,
        workoutId: dbExercise.workoutId,
        weight: dbExercise.weight,
        sets: dbExercise.sets,
        maxReps: dbExercise.maxReps,
        logging: dbExercise.logging,
        notes: dbExercise.notes,
        step: dbExercise.step,
        createdAt: dbExercise.createdAt,
        updatedAt: dbExercise.updatedAt,
      })
      .where(eq(exercise.id, dbExercise.id));
  }

  return "success";
}

async function applyEditExercise(
  client: SyncDbClient,
  updatedExercise: Exercise,
  userId: string,
) {
  const dbExercise = normalizeExerciseForDb(updatedExercise);
  const parent = await findWorkoutOwner(client, dbExercise.workoutId);

  if (!parent || parent.userId !== userId) return "not_found";

  const existing = await findExerciseOwner(client, dbExercise.id);
  if (!existing) return "not_found";
  if (existing.userId !== userId) return "conflict";
  if (existing.updatedAt >= dbExercise.updatedAt) return "success";

  await client
    .update(exercise)
    .set({
      name: dbExercise.name,
      workoutId: dbExercise.workoutId,
      weight: dbExercise.weight,
      sets: dbExercise.sets,
      maxReps: dbExercise.maxReps,
      logging: dbExercise.logging,
      notes: dbExercise.notes,
      step: dbExercise.step,
      updatedAt: dbExercise.updatedAt,
    })
    .where(
      and(
        eq(exercise.id, dbExercise.id),
        eq(exercise.workoutId, existing.workoutId),
        lt(exercise.updatedAt, dbExercise.updatedAt),
      ),
    );

  return "success";
}

async function applyDeleteExercise(
  client: SyncDbClient,
  exerciseId: string,
  userId: string,
) {
  const existing = await findExerciseOwner(client, exerciseId);

  if (!existing) return "success";
  if (existing.userId !== userId) return "conflict";

  await client.delete(exercise).where(eq(exercise.id, exerciseId));
  return "success";
}

async function applyOperation(
  client: SyncDbClient,
  operation: SyncOperation,
  userId: string,
) {
  switch (operation.type) {
    case "addWorkout":
      return applyAddWorkout(client, operation.workout, userId);
    case "editWorkout":
      return applyEditWorkout(client, operation.workout, userId);
    case "deleteWorkout":
      return applyDeleteWorkout(client, operation.workoutId, userId);
    case "addExercise":
      return applyAddExercise(client, operation.exercise, userId);
    case "editExercise":
      return applyEditExercise(client, operation.exercise, userId);
    case "deleteExercise":
      return applyDeleteExercise(client, operation.exerciseId, userId);
  }
}

export async function getSyncSnapshot() {
  try {
    const userId = await getRequiredUserId();
    if (!userId) return syncUnauthorized;

    return {
      ...syncSuccess,
      workouts: await getUserSnapshot(userId),
      serverTime: new Date().toISOString(),
    };
  } catch {
    return statusFailure("server_error");
  }
}

export async function syncOperations(operations: SyncOperation[]) {
  try {
    const userId = await getRequiredUserId();
    if (!userId) return syncUnauthorized;

    const validated = validateOperations(operations);
    if (!validated.success) {
      return validated.status === "invalid_id" ? syncInvalidId : syncInvalidPayload;
    }

    const appliedOperationIds: string[] = [];
    let failureStatus: SyncFailureStatus | null = null;

    await db.transaction(async (transaction) => {
      for (const operation of validated.operations) {
        const status = await applyOperation(transaction, operation, userId);

        if (status !== "success") {
          failureStatus = status;
          break;
        }

        appliedOperationIds.push(operation.id);
      }
    });

    const snapshot = await getUserSnapshot(userId);
    const serverTime = new Date().toISOString();

    if (failureStatus) {
      return {
        success: false,
        status: failureStatus,
        appliedOperationIds,
        workouts: snapshot,
        serverTime,
      };
    }

    return {
      ...syncSuccess,
      appliedOperationIds,
      workouts: snapshot,
      serverTime,
    };
  } catch {
    return statusFailure("server_error");
  }
}

export async function addWorkout(newWorkout: Workout) {
  if (!assertCuid(newWorkout?.id)) return syncInvalidId;
  const result = await syncOperations([
    {
      id: `add-workout-${newWorkout.id}`,
      type: "addWorkout",
      workout: normalizeWorkout(newWorkout),
      queuedAt: new Date().toISOString(),
    },
  ]);

  return result.success ? syncSuccess : statusFailure(result.status);
}

export async function addExercise(newExercise: Exercise) {
  if (!assertCuid(newExercise?.id) || !assertCuid(newExercise?.workoutId)) {
    return syncInvalidId;
  }

  const result = await syncOperations([
    {
      id: `add-exercise-${newExercise.id}`,
      type: "addExercise",
      exercise: normalizeExercise(newExercise),
      queuedAt: new Date().toISOString(),
    },
  ]);

  return result.success ? syncSuccess : statusFailure(result.status);
}

export async function editWorkout(updatedWorkout: Workout) {
  if (!assertCuid(updatedWorkout?.id)) return syncInvalidId;
  const result = await syncOperations([
    {
      id: `edit-workout-${updatedWorkout.id}`,
      type: "editWorkout",
      workout: normalizeWorkout(updatedWorkout),
      queuedAt: new Date().toISOString(),
    },
  ]);

  return result.success ? syncSuccess : statusFailure(result.status);
}

export async function editExercise(updatedExercise: Exercise) {
  if (!assertCuid(updatedExercise?.id) || !assertCuid(updatedExercise?.workoutId)) {
    return syncInvalidId;
  }

  const result = await syncOperations([
    {
      id: `edit-exercise-${updatedExercise.id}`,
      type: "editExercise",
      exercise: normalizeExercise(updatedExercise),
      queuedAt: new Date().toISOString(),
    },
  ]);

  return result.success ? syncSuccess : statusFailure(result.status);
}

export async function deleteWorkout(workoutId: string) {
  if (!assertCuid(workoutId)) return syncInvalidId;
  const result = await syncOperations([
    {
      id: `delete-workout-${workoutId}`,
      type: "deleteWorkout",
      workoutId,
      queuedAt: new Date().toISOString(),
    },
  ]);

  return result.success ? syncSuccess : statusFailure(result.status);
}

export async function deleteExercise(exerciseId: string) {
  if (!assertCuid(exerciseId)) return syncInvalidId;
  const result = await syncOperations([
    {
      id: `delete-exercise-${exerciseId}`,
      type: "deleteExercise",
      exerciseId,
      queuedAt: new Date().toISOString(),
    },
  ]);

  return result.success ? syncSuccess : statusFailure(result.status);
}
