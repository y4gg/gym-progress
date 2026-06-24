import type { Exercise, ExerciseLog, SyncOperation, Workout } from "@/lib/types";

const DEFAULT_STEP = 2.5;

function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }

  return new Date().toISOString();
}

function compareUpdatedAt(a: { updatedAt: string }, b: { updatedAt: string }) {
  return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
}

function compareCreatedAt(a: { createdAt: string }, b: { createdAt: string }) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function normalizePosition(position: unknown) {
  const numericPosition = Number(position);
  return Number.isFinite(numericPosition) && numericPosition >= 0
    ? Math.floor(numericPosition)
    : 0;
}

export function sortExercisesByPosition(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((firstExercise, secondExercise) => {
    const positionComparison = firstExercise.position - secondExercise.position;
    if (positionComparison !== 0) return positionComparison;

    const createdAtComparison = compareCreatedAt(firstExercise, secondExercise);
    if (createdAtComparison !== 0) return createdAtComparison;

    return firstExercise.id.localeCompare(secondExercise.id);
  });
}

export function normalizeExercise(exercise: Exercise): Exercise {
  return {
    ...exercise,
    position: normalizePosition(exercise.position),
    weight: Number(exercise.weight),
    sets: Number(exercise.sets),
    maxReps:
      exercise.maxReps === null || typeof exercise.maxReps === "undefined"
        ? undefined
        : Number(exercise.maxReps),
    logging: Boolean(exercise.logging),
    notes: exercise.notes ?? "",
    step:
      typeof exercise.step === "number" && Number.isFinite(exercise.step)
        ? exercise.step
        : DEFAULT_STEP,
    createdAt: toIsoString(exercise.createdAt),
    updatedAt: toIsoString(exercise.updatedAt),
  };
}

export function normalizeExerciseLog(exerciseLog: ExerciseLog): ExerciseLog {
  return {
    ...exerciseLog,
    reps: Number(exerciseLog.reps),
    weight: Number(exerciseLog.weight),
    performedAt: toIsoString(exerciseLog.performedAt),
    createdAt: toIsoString(exerciseLog.createdAt),
  };
}

export function normalizeWorkout(workout: Workout): Workout {
  return {
    ...workout,
    exercises: sortExercisesByPosition(
      (workout.exercises ?? []).map((exercise, index) =>
        normalizeExercise({
          ...exercise,
          position: exercise.position ?? index,
          workoutId: workout.id,
        }),
      ),
    ),
    createdAt: toIsoString(workout.createdAt),
    updatedAt: toIsoString(workout.updatedAt),
  };
}

function getExerciseWorkoutId(workouts: Workout[], exerciseId: string) {
  for (const workout of workouts) {
    if (workout.exercises.some((exercise) => exercise.id === exerciseId)) {
      return workout.id;
    }
  }
  return null;
}

function getOperationEntity(operation: SyncOperation) {
  if (
    operation.type === "addWorkout" ||
    operation.type === "editWorkout" ||
    operation.type === "deleteWorkout"
  ) {
    return "workout";
  }

  if (
    operation.type === "addExercise" ||
    operation.type === "editExercise" ||
    operation.type === "deleteExercise"
  ) {
    return "exercise";
  }

  return "exerciseLog";
}

function getOperationTargetId(operation: SyncOperation) {
  if ("workout" in operation) return operation.workout.id;
  if ("exercise" in operation) return operation.exercise.id;
  if ("exerciseLog" in operation) return operation.exerciseLog.id;
  if ("workoutId" in operation) return operation.workoutId;
  if ("exerciseId" in operation) return operation.exerciseId;
  return operation.exerciseLogId;
}

export function compactSyncQueue(
  existing: SyncOperation[],
  nextOperation: SyncOperation,
): SyncOperation[] {
  let queue = existing;

  if (nextOperation.type === "deleteWorkout") {
    queue = queue.filter((operation) => {
      if (
        (operation.type === "addExercise" || operation.type === "editExercise") &&
        operation.exercise.workoutId === nextOperation.workoutId
      ) {
        return false;
      }
      if (
        operation.type === "addExerciseLog" &&
        operation.exerciseLog.workoutId === nextOperation.workoutId
      ) {
        return false;
      }
      return true;
    });
  }

  if (nextOperation.type === "deleteExercise") {
    queue = queue.filter((operation) => {
      if (
        operation.type === "addExerciseLog" &&
        operation.exerciseLog.exerciseId === nextOperation.exerciseId
      ) {
        return false;
      }
      return true;
    });
  }

  const targetId = getOperationTargetId(nextOperation);
  const entityKind = getOperationEntity(nextOperation);

  const previousIndex = queue.findIndex((operation) => {
    if (entityKind === "workout") {
      if ("workout" in operation) return operation.workout.id === targetId;
      if ("workoutId" in operation) return operation.workoutId === targetId;
      return false;
    }

    if (entityKind === "exerciseLog") {
      if ("exerciseLog" in operation) return operation.exerciseLog.id === targetId;
      if ("exerciseLogId" in operation) return operation.exerciseLogId === targetId;
      return false;
    }

    if ("exercise" in operation) return operation.exercise.id === targetId;
    if ("exerciseId" in operation) return operation.exerciseId === targetId;
    return false;
  });

  if (previousIndex === -1) {
    return [...queue, nextOperation];
  }

  const previous = queue[previousIndex];
  const before = queue.slice(0, previousIndex);
  const after = queue.slice(previousIndex + 1);

  if (
    (previous.type === "addWorkout" && nextOperation.type === "editWorkout") ||
    (previous.type === "addExercise" && nextOperation.type === "editExercise")
  ) {
    return [
      ...before,
      {
        ...previous,
        ...(previous.type === "addWorkout" && nextOperation.type === "editWorkout"
          ? { workout: nextOperation.workout }
          : {}),
        ...(previous.type === "addExercise" && nextOperation.type === "editExercise"
          ? { exercise: nextOperation.exercise }
          : {}),
        queuedAt: previous.queuedAt,
      } as SyncOperation,
      ...after,
    ];
  }

  if (
    (previous.type === "editWorkout" && nextOperation.type === "editWorkout") ||
    (previous.type === "editExercise" && nextOperation.type === "editExercise")
  ) {
    return [...before, nextOperation, ...after];
  }

  if (
    (previous.type === "addWorkout" && nextOperation.type === "deleteWorkout") ||
    (previous.type === "addExercise" && nextOperation.type === "deleteExercise") ||
    (previous.type === "addExerciseLog" &&
      nextOperation.type === "deleteExerciseLog")
  ) {
    return [...before, ...after];
  }

  if (
    (previous.type === "editWorkout" && nextOperation.type === "deleteWorkout") ||
    (previous.type === "editExercise" && nextOperation.type === "deleteExercise")
  ) {
    return [...before, nextOperation, ...after];
  }

  return [...queue, nextOperation];
}

export function mergeInitialData(
  localWorkouts: Workout[],
  remoteWorkouts: Workout[],
  localExerciseLogs: ExerciseLog[],
  remoteExerciseLogs: ExerciseLog[],
): {
  workouts: Workout[];
  exerciseLogs: ExerciseLog[];
  operationsToQueue: SyncOperation[];
} {
  const now = new Date().toISOString();
  const workoutsById = new Map<string, Workout>();
  const exerciseLogsById = new Map<string, ExerciseLog>();
  const operationsToQueue: SyncOperation[] = [];

  for (const workout of remoteWorkouts.map(normalizeWorkout)) {
    workoutsById.set(workout.id, workout);
  }

  for (const exerciseLog of remoteExerciseLogs.map(normalizeExerciseLog)) {
    exerciseLogsById.set(exerciseLog.id, exerciseLog);
  }

  for (const localWorkout of localWorkouts.map(normalizeWorkout)) {
    const remoteWorkout = workoutsById.get(localWorkout.id);

    if (!remoteWorkout) {
      workoutsById.set(localWorkout.id, localWorkout);
      operationsToQueue.push({
        id: `${localWorkout.id}:addWorkout:${now}`,
        type: "addWorkout",
        workout: localWorkout,
        queuedAt: now,
      });
    } else if (compareUpdatedAt(localWorkout, remoteWorkout) > 0) {
      workoutsById.set(localWorkout.id, {
        ...localWorkout,
        exercises: remoteWorkout.exercises,
      });
      operationsToQueue.push({
        id: `${localWorkout.id}:editWorkout:${now}`,
        type: "editWorkout",
        workout: { ...localWorkout, exercises: remoteWorkout.exercises },
        queuedAt: now,
      });
    }

    const remoteExercisesById = new Map(
      (remoteWorkout?.exercises ?? []).map((exercise) => [exercise.id, exercise]),
    );

    for (const localExercise of localWorkout.exercises) {
      const remoteExercise = remoteExercisesById.get(localExercise.id);

      if (!remoteExercise) {
        remoteExercisesById.set(localExercise.id, localExercise);
        operationsToQueue.push({
          id: `${localExercise.id}:addExercise:${now}`,
          type: "addExercise",
          exercise: localExercise,
          queuedAt: now,
        });
      } else if (compareUpdatedAt(localExercise, remoteExercise) > 0) {
        remoteExercisesById.set(localExercise.id, localExercise);
        operationsToQueue.push({
          id: `${localExercise.id}:editExercise:${now}`,
          type: "editExercise",
          exercise: localExercise,
          queuedAt: now,
        });
      }
    }

    const currentWorkout = workoutsById.get(localWorkout.id);
    if (currentWorkout) {
      workoutsById.set(localWorkout.id, {
        ...currentWorkout,
        exercises: Array.from(remoteExercisesById.values()),
      });
    }
  }

  for (const localExerciseLog of localExerciseLogs.map(normalizeExerciseLog)) {
    const remoteExerciseLog = exerciseLogsById.get(localExerciseLog.id);

    if (!remoteExerciseLog) {
      exerciseLogsById.set(localExerciseLog.id, localExerciseLog);
      operationsToQueue.push({
        id: `${localExerciseLog.id}:addExerciseLog:${now}`,
        type: "addExerciseLog",
        exerciseLog: localExerciseLog,
        queuedAt: now,
      });
    } else if (compareCreatedAt(localExerciseLog, remoteExerciseLog) < 0) {
      exerciseLogsById.set(localExerciseLog.id, remoteExerciseLog);
    }
  }

  return {
    workouts: Array.from(workoutsById.values()).map(normalizeWorkout),
    exerciseLogs: Array.from(exerciseLogsById.values()),
    operationsToQueue,
  };
}

export function applyPendingOperations(
  snapshotWorkouts: Workout[],
  snapshotExerciseLogs: ExerciseLog[],
  operations: SyncOperation[],
): { workouts: Workout[]; exerciseLogs: ExerciseLog[] } {
  let workouts = snapshotWorkouts.map(normalizeWorkout);
  let exerciseLogs = snapshotExerciseLogs.map(normalizeExerciseLog);

  for (const operation of operations) {
    if (operation.type === "addWorkout") {
      const normalizedWorkout = normalizeWorkout(operation.workout);
      const existing = workouts.find((workout) => workout.id === normalizedWorkout.id);
      workouts = existing
        ? workouts.map((workout) =>
            workout.id === normalizedWorkout.id ? normalizedWorkout : workout,
          )
        : [...workouts, normalizedWorkout];
    }

    if (operation.type === "editWorkout") {
      const normalizedWorkout = normalizeWorkout(operation.workout);
      workouts = workouts.map((workout) =>
        workout.id === normalizedWorkout.id
          ? { ...normalizedWorkout, exercises: workout.exercises }
          : workout,
      );
    }

    if (operation.type === "deleteWorkout") {
      workouts = workouts.filter((workout) => workout.id !== operation.workoutId);
      exerciseLogs = exerciseLogs.filter(
        (exerciseLog) => exerciseLog.workoutId !== operation.workoutId,
      );
    }

    if (operation.type === "addExercise") {
      const normalizedExercise = normalizeExercise(operation.exercise);
      workouts = workouts.map((workout) =>
        workout.id === normalizedExercise.workoutId
          ? {
              ...workout,
              exercises: workout.exercises.some(
                (exercise) => exercise.id === normalizedExercise.id,
              )
                ? workout.exercises.map((exercise) =>
                    exercise.id === normalizedExercise.id ? normalizedExercise : exercise,
                  )
                : [...workout.exercises, normalizedExercise],
            }
          : workout,
      );
    }

    if (operation.type === "editExercise") {
      const normalizedExercise = normalizeExercise(operation.exercise);
      workouts = workouts.map((workout) => ({
        ...workout,
        exercises: workout.exercises.map((exercise) =>
          exercise.id === normalizedExercise.id ? normalizedExercise : exercise,
        ),
      }));
    }

    if (operation.type === "deleteExercise") {
      const workoutId = getExerciseWorkoutId(workouts, operation.exerciseId);
      workouts = workouts.map((workout) =>
        workout.id === workoutId
          ? {
              ...workout,
              exercises: workout.exercises.filter(
                (exercise) => exercise.id !== operation.exerciseId,
              ),
            }
          : workout,
      );
      exerciseLogs = exerciseLogs.filter(
        (exerciseLog) => exerciseLog.exerciseId !== operation.exerciseId,
      );
    }

    if (operation.type === "addExerciseLog") {
      const normalizedExerciseLog = normalizeExerciseLog(operation.exerciseLog);
      const existing = exerciseLogs.find(
        (exerciseLog) => exerciseLog.id === normalizedExerciseLog.id,
      );
      exerciseLogs = existing
        ? exerciseLogs.map((exerciseLog) =>
            exerciseLog.id === normalizedExerciseLog.id
              ? normalizedExerciseLog
              : exerciseLog,
          )
        : [...exerciseLogs, normalizedExerciseLog];
    }

    if (operation.type === "deleteExerciseLog") {
      exerciseLogs = exerciseLogs.filter(
        (exerciseLog) => exerciseLog.id !== operation.exerciseLogId,
      );
    }
  }

  return { workouts: workouts.map(normalizeWorkout), exerciseLogs };
}
