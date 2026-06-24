import { createId } from "@paralleldrive/cuid2";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  compactSyncQueue,
  normalizeExercise,
  normalizeExerciseLog,
  normalizeWorkout,
} from "@/lib/sync";
import type {
  Exercise,
  ExerciseLog,
  NewExercise,
  NewExerciseLog,
  NewWorkout,
  Store,
  SyncOperation,
  SyncStatus,
  Workout,
} from "@/lib/types";

const STORE_VERSION = 3;

function nowIso() {
  return new Date().toISOString();
}

function createOperation<T extends Omit<SyncOperation, "id" | "queuedAt">>(
  operation: T,
): T & { id: string; queuedAt: string } {
  return {
    ...operation,
    id: createId(),
    queuedAt: nowIso(),
  };
}

function normalizePersistedWorkouts(workouts: unknown): Workout[] {
  if (!Array.isArray(workouts)) return [];
  return workouts.map((workout) => normalizeWorkout(workout as Workout));
}

function normalizePersistedExerciseLogs(exerciseLogs: unknown): ExerciseLog[] {
  if (!Array.isArray(exerciseLogs)) return [];
  return exerciseLogs.map((exerciseLog) =>
    normalizeExerciseLog(exerciseLog as ExerciseLog),
  );
}

function buildExercisePositionMap(workouts: Workout[]) {
  const exercisePositionsById = new Map<string, number>();

  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      exercisePositionsById.set(exercise.id, exercise.position);
    }
  }

  return exercisePositionsById;
}

function normalizePersistedOperations(
  operations: unknown,
  exercisePositionsById: Map<string, number>,
): SyncOperation[] {
  if (!Array.isArray(operations)) return [];

  const normalizedOperations: SyncOperation[] = [];

  for (const operation of operations) {
    const syncOperation = operation as SyncOperation;

    if ("workout" in syncOperation) {
      normalizedOperations.push({
        ...syncOperation,
        workout: normalizeWorkout(syncOperation.workout),
        queuedAt: syncOperation.queuedAt ?? nowIso(),
      });
      continue;
    }

    if ("exercise" in syncOperation) {
      const persistedExercise = syncOperation.exercise as Exercise & {
        position?: number;
      };

      normalizedOperations.push({
        ...syncOperation,
        exercise: normalizeExercise({
          ...persistedExercise,
          position:
            persistedExercise.position ??
            exercisePositionsById.get(persistedExercise.id) ??
            0,
        }),
        queuedAt: syncOperation.queuedAt ?? nowIso(),
      });
      continue;
    }

    if ("exerciseLog" in syncOperation) {
      normalizedOperations.push({
        ...syncOperation,
        exerciseLog: normalizeExerciseLog(syncOperation.exerciseLog),
        queuedAt: syncOperation.queuedAt ?? nowIso(),
      });
      continue;
    }

    normalizedOperations.push({
      ...syncOperation,
      queuedAt: syncOperation.queuedAt ?? nowIso(),
    });
  }

  return normalizedOperations;
}

function migratePersistedState(persistedState: unknown) {
  const state = (persistedState ?? {}) as Partial<Store>;
  const workouts = normalizePersistedWorkouts(state.workouts);
  const exercisePositionsById = buildExercisePositionMap(workouts);

  return {
    ...state,
    workouts,
    exerciseLogs: normalizePersistedExerciseLogs(state.exerciseLogs),
    syncUserId: state.syncUserId ?? null,
    pendingSyncOperations: normalizePersistedOperations(
      state.pendingSyncOperations,
      exercisePositionsById,
    ),
    syncStatus: state.syncStatus ?? "idle",
    lastSyncedAt: state.lastSyncedAt ?? null,
    lastSyncError: state.lastSyncError ?? null,
  };
}

const useStore = create<Store>()(
  persist(
    (set, get) => ({
      workouts: [],
      exerciseLogs: [],
      syncUserId: null,
      pendingSyncOperations: [],
      syncStatus: "idle",
      lastSyncedAt: null,
      lastSyncError: null,
      addWorkout: (workout: NewWorkout) => {
        const timestamp = nowIso();
        const updatedWorkout = normalizeWorkout({
          ...workout,
          updatedAt: timestamp,
          createdAt: timestamp,
        });

        set((state) => ({
          workouts: [...state.workouts, updatedWorkout],
          pendingSyncOperations: compactSyncQueue(
            state.pendingSyncOperations,
            createOperation({ type: "addWorkout", workout: updatedWorkout }),
          ),
        }));
      },
      addExercise: (exercise: NewExercise) => {
        const timestamp = nowIso();
        set((state) => {
          const workout = state.workouts.find(
            (workout) => workout.id === exercise.workoutId,
          );
          if (!workout) return state;

          const updatedExercise = normalizeExercise({
            ...exercise,
            position: exercise.position ?? workout.exercises.length,
            updatedAt: timestamp,
            createdAt: timestamp,
          });

          return {
            workouts: state.workouts.map((workout) => {
              if (workout.id === exercise.workoutId) {
                return normalizeWorkout({
                  ...workout,
                  exercises: [...workout.exercises, updatedExercise],
                });
              }

              return workout;
            }),
            pendingSyncOperations: compactSyncQueue(
              state.pendingSyncOperations,
              createOperation({ type: "addExercise", exercise: updatedExercise }),
            ),
          };
        });
      },
      reorderWorkoutExercises: (workoutId: string, exerciseIds: string[]) => {
        set((state) => {
          const workout = state.workouts.find((workout) => workout.id === workoutId);
          if (!workout) return state;

          const currentIds = workout.exercises.map((exercise) => exercise.id);
          const nextIds = new Set(exerciseIds);
          const idsMatch =
            exerciseIds.length === currentIds.length &&
            nextIds.size === currentIds.length &&
            currentIds.every((exerciseId) => nextIds.has(exerciseId));

          if (!idsMatch) return state;

          const timestamp = nowIso();
          const exercisesById = new Map(
            workout.exercises.map((exercise) => [exercise.id, exercise]),
          );
          const changedExercises: Exercise[] = [];

          const reorderedExercises = exerciseIds.map((exerciseId, index) => {
            const exercise = exercisesById.get(exerciseId);
            if (!exercise) return undefined;

            if (exercise.position === index) {
              return exercise;
            }

            const changedExercise = normalizeExercise({
              ...exercise,
              position: index,
              updatedAt: timestamp,
            });
            changedExercises.push(changedExercise);
            return changedExercise;
          });

          if (reorderedExercises.some((exercise) => !exercise)) return state;

          const pendingSyncOperations = changedExercises.reduce(
            (operations, exercise) =>
              compactSyncQueue(
                operations,
                createOperation({ type: "editExercise", exercise }),
              ),
            state.pendingSyncOperations,
          );

          return {
            workouts: state.workouts.map((workout) =>
              workout.id === workoutId
                ? normalizeWorkout({
                    ...workout,
                    exercises: reorderedExercises as Exercise[],
                  })
                : workout,
            ),
            pendingSyncOperations,
          };
        });
      },
      editWorkout: (updatedWorkout: Workout) => {
        const updatedWorkoutWithTime = normalizeWorkout({
          ...updatedWorkout,
          updatedAt: nowIso(),
        });

        set((state) => ({
          workouts: state.workouts.map((workout) => {
            if (workout.id === updatedWorkout.id) {
              return updatedWorkoutWithTime;
            }

            return workout;
          }),
          pendingSyncOperations: compactSyncQueue(
            state.pendingSyncOperations,
            createOperation({
              type: "editWorkout",
              workout: updatedWorkoutWithTime,
            }),
          ),
        }));
      },
      editExercise: (updatedExercise: Exercise) => {
        const updatedExerciseWithTime = normalizeExercise({
          ...updatedExercise,
          updatedAt: nowIso(),
        });

        set((state) => ({
          workouts: state.workouts.map((workout) =>
            normalizeWorkout({
              ...workout,
              exercises: workout.exercises.map((exercise) => {
                if (exercise.id === updatedExercise.id) {
                  return updatedExerciseWithTime;
                }

                return exercise;
              }),
            }),
          ),
          pendingSyncOperations: compactSyncQueue(
            state.pendingSyncOperations,
            createOperation({
              type: "editExercise",
              exercise: updatedExerciseWithTime,
            }),
          ),
        }));
      },
      addExerciseLog: (exerciseLog: NewExerciseLog) => {
        const updatedExerciseLog = normalizeExerciseLog({
          ...exerciseLog,
          createdAt: nowIso(),
        });

        set((state) => ({
          exerciseLogs: [...state.exerciseLogs, updatedExerciseLog],
          pendingSyncOperations: compactSyncQueue(
            state.pendingSyncOperations,
            createOperation({
              type: "addExerciseLog",
              exerciseLog: updatedExerciseLog,
            }),
          ),
        }));
      },
      deleteWorkout: (workoutId: string) =>
        set((state) => ({
          workouts: state.workouts.filter(
            (workout) => workout.id !== workoutId,
          ),
          exerciseLogs: state.exerciseLogs.filter(
            (exerciseLog) => exerciseLog.workoutId !== workoutId,
          ),
          pendingSyncOperations: compactSyncQueue(
            state.pendingSyncOperations,
            createOperation({ type: "deleteWorkout", workoutId }),
          ),
        })),
      deleteExercise: (exerciseId: string) =>
        set((state) => ({
          workouts: state.workouts.map((workout) =>
            normalizeWorkout({
              ...workout,
              exercises: workout.exercises.filter(
                (exercise) => exercise.id !== exerciseId,
              ),
            }),
          ),
          exerciseLogs: state.exerciseLogs.filter(
            (exerciseLog) => exerciseLog.exerciseId !== exerciseId,
          ),
          pendingSyncOperations: compactSyncQueue(
            state.pendingSyncOperations,
            createOperation({ type: "deleteExercise", exerciseId }),
          ),
        })),
      deleteExerciseLogs: (exerciseLogIds: string[]) =>
        set((state) => {
          const exerciseLogIdsSet = new Set(exerciseLogIds);
          const pendingSyncOperations = exerciseLogIds.reduce(
            (operations, exerciseLogId) =>
              compactSyncQueue(
                operations,
                createOperation({ type: "deleteExerciseLog", exerciseLogId }),
              ),
            state.pendingSyncOperations,
          );

          return {
            exerciseLogs: state.exerciseLogs.filter(
              (exerciseLog) => !exerciseLogIdsSet.has(exerciseLog.id),
            ),
            pendingSyncOperations,
          };
        }),
      replaceWorkouts: (workouts: Workout[]) =>
        set({ workouts: workouts.map(normalizeWorkout) }),
      replaceExerciseLogs: (exerciseLogs: ExerciseLog[]) =>
        set({ exerciseLogs: exerciseLogs.map(normalizeExerciseLog) }),
      setSyncUser: (userId: string | null) => set({ syncUserId: userId }),
      setSyncStatus: (status: SyncStatus, error?: string | null) =>
        set({
          syncStatus: status,
          lastSyncError: error ?? null,
          lastSyncedAt: status === "synced" ? nowIso() : get().lastSyncedAt,
        }),
      enqueueSyncOperation: (operation: SyncOperation) =>
        set((state) => ({
          pendingSyncOperations: compactSyncQueue(
            state.pendingSyncOperations,
            operation,
          ),
        })),
      removeSyncedOperations: (operationIds: string[]) =>
        set((state) => {
          const syncedIds = new Set(operationIds);
          return {
            pendingSyncOperations: state.pendingSyncOperations.filter(
              (operation) => !syncedIds.has(operation.id),
            ),
          };
        }),
      clearData: () =>
        set({
          workouts: [],
          exerciseLogs: [],
          syncUserId: null,
          pendingSyncOperations: [],
          syncStatus: "idle",
          lastSyncedAt: null,
          lastSyncError: null,
        }),
      getWorkoutById: (workoutId: string) =>
        get().workouts.find((workout) => workout.id === workoutId),
      getExerciseById: (exerciseId: string) => {
        for (const workout of get().workouts) {
          const exercise = workout.exercises.find(
            (exercise) => exercise.id === exerciseId,
          );
          if (exercise) {
            return exercise;
          }
        }
        return undefined;
      },
      getExerciseLogsByExerciseId: (exerciseId: string) =>
        get().exerciseLogs.filter(
          (exerciseLog) => exerciseLog.exerciseId === exerciseId,
        ),
      getPreviousExerciseById: (exerciseId: string) => {
        for (const workout of get().workouts) {
          const exerciseIndex = workout.exercises.findIndex(
            (exercise) => exercise.id === exerciseId,
          );

          if (exerciseIndex !== -1) {
            return exerciseIndex > 0
              ? workout.exercises[exerciseIndex - 1]
              : undefined;
          }
        }
        return undefined;
      },
      getNextExerciseById: (exerciseId: string) => {
        for (const workout of get().workouts) {
          const exerciseIndex = workout.exercises.findIndex(
            (exercise) => exercise.id === exerciseId,
          );

          if (exerciseIndex !== -1) {
            return exerciseIndex < workout.exercises.length - 1
              ? workout.exercises[exerciseIndex + 1]
              : undefined;
          }
        }
        return undefined;
      },
    }),
    {
      name: "store",
      skipHydration: true,
      version: STORE_VERSION,
      migrate: migratePersistedState,
    },
  ),
);

export { useStore };
