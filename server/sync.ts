"use server";

import { and, eq, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { isCuid } from "@paralleldrive/cuid2";
import { z } from "zod";

import { db } from "@/db";
import { exercise, exerciseLog, workout } from "@/db/schema";
import { auth } from "@/lib/auth";
import { normalizeWorkoutIcon } from "@/lib/workout-icons";
import {
  SYNC_BATCH_SIZE,
  normalizeExercise,
  normalizeExerciseLog,
  normalizeWorkout,
} from "@/lib/sync";
import type {
  Exercise,
  ExerciseLog,
  SyncOperation,
  Workout,
} from "@/lib/types";
import {
  exerciseFieldsSchema,
  workoutFieldsSchema,
} from "@/lib/workout-validation";

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

const exerciseSchema: z.ZodType<Exercise> = exerciseFieldsSchema.extend({
  step: z.preprocess((value) => {
    // Older offline clients accepted any positive step. Fit those payloads to
    // numeric(8, 2) before validation, without rounding small steps to zero.
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return value;
    }
    return Math.max(0.01, Math.round((value + Number.EPSILON) * 100) / 100);
  }, exerciseFieldsSchema.shape.step),
  id: cuidSchema,
  workoutId: cuidSchema,
  position: z.number().int().min(0).default(0),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const workoutSchema: z.ZodType<Workout> = workoutFieldsSchema.extend({
  id: cuidSchema,
  exercises: z.array(exerciseSchema),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

const exerciseLogSchema: z.ZodType<ExerciseLog> = z.object({
  id: cuidSchema,
  userId: z.string().optional(),
  exerciseId: cuidSchema,
  workoutId: cuidSchema,
  reps: z.number().int().min(0),
  weight: z.number().min(0),
  performedAt: isoDateSchema,
  createdAt: isoDateSchema,
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
    z.object({
      id: z.string().min(1),
      type: z.literal("addExerciseLog"),
      exerciseLog: exerciseLogSchema,
      queuedAt: isoDateSchema,
    }),
    z.object({
      id: z.string().min(1),
      type: z.literal("deleteExerciseLog"),
      exerciseLogId: cuidSchema,
      queuedAt: isoDateSchema,
    }),
  ],
);

const syncOperationsSchema = z.array(syncOperationSchema).max(SYNC_BATCH_SIZE);

function statusFailure(status: SyncFailureStatus) {
  return { success: false, status } as const;
}

async function getRequiredUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
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
    icon: normalizedWorkout.icon,
    createdAt: toDate(normalizedWorkout.createdAt),
    updatedAt: toDate(normalizedWorkout.updatedAt),
  };
}

function normalizeExerciseForDb(newExercise: Exercise) {
  const normalizedExercise = normalizeExercise(newExercise);

  return {
    id: normalizedExercise.id,
    name: normalizedExercise.name,
    icon: normalizedExercise.icon,
    workoutId: normalizedExercise.workoutId,
    position: normalizedExercise.position,
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

function normalizeExerciseLogForDb(
  newExerciseLog: ExerciseLog,
  userId: string,
) {
  const normalizedExerciseLog = normalizeExerciseLog(newExerciseLog);

  return {
    id: normalizedExerciseLog.id,
    userId,
    exerciseId: normalizedExerciseLog.exerciseId,
    workoutId: normalizedExerciseLog.workoutId,
    reps: normalizedExerciseLog.reps,
    weight: normalizedExerciseLog.weight,
    performedAt: toDate(normalizedExerciseLog.performedAt),
    createdAt: toDate(normalizedExerciseLog.createdAt),
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
    icon: normalizeWorkoutIcon(dbWorkout.icon),
    createdAt: dbWorkout.createdAt.toISOString(),
    updatedAt: dbWorkout.updatedAt.toISOString(),
    exercises: dbWorkout.exercises.map((dbExercise) => ({
      id: dbExercise.id,
      name: dbExercise.name,
      icon: normalizeWorkoutIcon(dbExercise.icon),
      workoutId: dbExercise.workoutId,
      position: dbExercise.position,
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

function toClientExerciseLog(dbExerciseLog: typeof exerciseLog.$inferSelect) {
  return normalizeExerciseLog({
    id: dbExerciseLog.id,
    userId: dbExerciseLog.userId,
    exerciseId: dbExerciseLog.exerciseId,
    workoutId: dbExerciseLog.workoutId,
    reps: dbExerciseLog.reps,
    weight: dbExerciseLog.weight,
    performedAt: dbExerciseLog.performedAt.toISOString(),
    createdAt: dbExerciseLog.createdAt.toISOString(),
  });
}

async function getUserSnapshot(userId: string) {
  const [dbWorkouts, dbExerciseLogs] = await Promise.all([
    db.query.workout.findMany({
      where: eq(workout.userId, userId),
      with: {
        exercises: {
          orderBy: (exercises, { asc }) => [
            asc(exercises.position),
            asc(exercises.createdAt),
            asc(exercises.id),
          ],
        },
      },
    }),
    db.query.exerciseLog.findMany({
      where: eq(exerciseLog.userId, userId),
    }),
  ]);

  return {
    workouts: dbWorkouts.map(toClientWorkout),
    exerciseLogs: dbExerciseLogs.map(toClientExerciseLog),
  };
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

async function findExerciseLogOwner(
  client: SyncDbClient,
  exerciseLogId: string,
) {
  const rows = await client
    .select({ userId: exerciseLog.userId })
    .from(exerciseLog)
    .where(eq(exerciseLog.id, exerciseLogId))
    .limit(1);

  return rows[0] ?? null;
}

async function applyAddWorkout(
  client: SyncDbClient,
  newWorkout: Workout,
  userId: string,
): Promise<"success" | SyncFailureStatus> {
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
        icon: dbWorkout.icon,
        createdAt: dbWorkout.createdAt,
        updatedAt: dbWorkout.updatedAt,
      })
      .where(
        and(
          eq(workout.id, dbWorkout.id),
          eq(workout.userId, userId),
          lt(workout.updatedAt, dbWorkout.updatedAt),
        ),
      );
  }

  return "success";
}

async function applyEditWorkout(
  client: SyncDbClient,
  updatedWorkout: Workout,
  userId: string,
): Promise<"success" | SyncFailureStatus> {
  const dbWorkout = normalizeWorkoutForDb(updatedWorkout, userId);
  const existing = await findWorkoutOwner(client, dbWorkout.id);

  if (!existing) return "not_found";
  if (existing.userId !== userId) return "conflict";
  if (existing.updatedAt >= dbWorkout.updatedAt) return "success";

  await client
    .update(workout)
    .set({
      name: dbWorkout.name,
      icon: dbWorkout.icon,
      updatedAt: dbWorkout.updatedAt,
    })
    .where(
      and(
        eq(workout.id, dbWorkout.id),
        eq(workout.userId, userId),
        lt(workout.updatedAt, dbWorkout.updatedAt),
      ),
    );

  return "success";
}

async function applyDeleteWorkout(
  client: SyncDbClient,
  workoutId: string,
  userId: string,
): Promise<"success" | SyncFailureStatus> {
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
): Promise<"success" | SyncFailureStatus> {
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
        icon: dbExercise.icon,
        workoutId: dbExercise.workoutId,
        position: dbExercise.position,
        weight: dbExercise.weight,
        sets: dbExercise.sets,
        maxReps: dbExercise.maxReps,
        logging: dbExercise.logging,
        notes: dbExercise.notes,
        step: dbExercise.step,
        createdAt: dbExercise.createdAt,
        updatedAt: dbExercise.updatedAt,
      })
      .where(
        and(
          eq(exercise.id, dbExercise.id),
          eq(exercise.workoutId, existing.workoutId),
          lt(exercise.updatedAt, dbExercise.updatedAt),
        ),
      );
  }

  return "success";
}

async function applyEditExercise(
  client: SyncDbClient,
  updatedExercise: Exercise,
  userId: string,
): Promise<"success" | SyncFailureStatus> {
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
      icon: dbExercise.icon,
      workoutId: dbExercise.workoutId,
      position: dbExercise.position,
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
): Promise<"success" | SyncFailureStatus> {
  const existing = await findExerciseOwner(client, exerciseId);

  if (!existing) return "success";
  if (existing.userId !== userId) return "conflict";

  await client.delete(exercise).where(eq(exercise.id, exerciseId));
  return "success";
}

async function applyAddExerciseLog(
  client: SyncDbClient,
  newExerciseLog: ExerciseLog,
  userId: string,
): Promise<"success" | SyncFailureStatus> {
  const dbExerciseLog = normalizeExerciseLogForDb(newExerciseLog, userId);
  const parent = await findExerciseOwner(client, dbExerciseLog.exerciseId);

  if (!parent || parent.userId !== userId) return "not_found";
  if (parent.workoutId !== dbExerciseLog.workoutId) return "invalid_payload";

  const workoutOwner = await findWorkoutOwner(client, dbExerciseLog.workoutId);
  if (!workoutOwner || workoutOwner.userId !== userId) return "not_found";

  const existing = await findExerciseLogOwner(client, dbExerciseLog.id);
  if (existing && existing.userId !== userId) return "conflict";
  if (existing) return "success";

  await client.insert(exerciseLog).values(dbExerciseLog);
  return "success";
}

async function applyDeleteExerciseLog(
  client: SyncDbClient,
  exerciseLogId: string,
  userId: string,
): Promise<"success" | SyncFailureStatus> {
  const existing = await findExerciseLogOwner(client, exerciseLogId);

  if (!existing) return "success";
  if (existing.userId !== userId) return "conflict";

  await client
    .delete(exerciseLog)
    .where(
      and(eq(exerciseLog.id, exerciseLogId), eq(exerciseLog.userId, userId)),
    );
  return "success";
}

async function applyOperation(
  client: SyncDbClient,
  operation: SyncOperation,
  userId: string,
): Promise<"success" | SyncFailureStatus> {
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
    case "addExerciseLog":
      return applyAddExerciseLog(client, operation.exerciseLog, userId);
    case "deleteExerciseLog":
      return applyDeleteExerciseLog(client, operation.exerciseLogId, userId);
  }
}

export async function getSyncSnapshot(expectedUserId?: string) {
  try {
    const userId = await getRequiredUserId();
    if (
      !userId ||
      (expectedUserId !== undefined && expectedUserId !== userId)
    ) {
      return syncUnauthorized;
    }

    return {
      ...syncSuccess,
      ...(await getUserSnapshot(userId)),
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error("getSyncSnapshot failed", error);
    return statusFailure("server_error");
  }
}

export async function syncOperations(
  operations: SyncOperation[],
  expectedUserId?: string,
) {
  try {
    const userId = await getRequiredUserId();
    if (
      !userId ||
      (expectedUserId !== undefined && expectedUserId !== userId)
    ) {
      return syncUnauthorized;
    }

    const validated = validateOperations(operations);
    if (!validated.success) {
      return validated.status === "invalid_id"
        ? syncInvalidId
        : syncInvalidPayload;
    }

    const { appliedOperationIds, failureStatus } = await db.transaction(
      async (transaction) => {
        const appliedOperationIds: string[] = [];
        for (const operation of validated.operations) {
          const status = await applyOperation(transaction, operation, userId);
          if (status !== "success") {
            return { appliedOperationIds, failureStatus: status };
          }
          appliedOperationIds.push(operation.id);
        }
        return { appliedOperationIds, failureStatus: null };
      },
    );

    const snapshot = await getUserSnapshot(userId);
    const serverTime = new Date().toISOString();

    if (failureStatus) {
      return {
        success: false,
        status: failureStatus,
        appliedOperationIds,
        ...snapshot,
        serverTime,
      };
    }

    return {
      ...syncSuccess,
      appliedOperationIds,
      ...snapshot,
      serverTime,
    };
  } catch (error) {
    console.error("syncOperations failed", error);
    return statusFailure("server_error");
  }
}
