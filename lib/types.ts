interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];

  updatedAt: string;
  createdAt: string;
}

interface Exercise {
  id: string;
  name: string;
  workoutId: string;
  weight: number;
  sets: number;
  maxReps?: number; // If set not null: Increase weight suggestion is enabled
  logging: boolean;
  notes: string;
  step: number;

  updatedAt: string;
  createdAt: string;
}

interface ExerciseLog {
  id: string;
  userId?: string;
  exerciseId: string;
  workoutId: string;
  reps: number;
  weight: number;
  performedAt: string;
  createdAt: string;
}

export type NewExercise = Omit<Exercise, "updatedAt" | "createdAt">;

export type NewExerciseLog = Omit<ExerciseLog, "createdAt">;

export type NewWorkout = Omit<Workout, "updatedAt" | "createdAt">;

type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error"
  | "unauthorized";

type SyncOperation =
  | { id: string; type: "addWorkout"; workout: Workout; queuedAt: string }
  | { id: string; type: "editWorkout"; workout: Workout; queuedAt: string }
  | { id: string; type: "deleteWorkout"; workoutId: string; queuedAt: string }
  | { id: string; type: "addExercise"; exercise: Exercise; queuedAt: string }
  | { id: string; type: "editExercise"; exercise: Exercise; queuedAt: string }
  | { id: string; type: "deleteExercise"; exerciseId: string; queuedAt: string }
  | { id: string; type: "addExerciseLog"; exerciseLog: ExerciseLog; queuedAt: string }
  | { id: string; type: "deleteExerciseLog"; exerciseLogId: string; queuedAt: string };

interface Store {
  workouts: Workout[];
  exerciseLogs: ExerciseLog[];
  syncUserId: string | null;
  pendingSyncOperations: SyncOperation[];
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  addWorkout: (workout: NewWorkout) => void;
  addExercise: (exercise: NewExercise) => void;
  editWorkout: (workout: Workout) => void;
  editExercise: (exercise: Exercise) => void;
  addExerciseLog: (exerciseLog: NewExerciseLog) => void;
  deleteWorkout: (workoutId: string) => void;
  deleteExercise: (exerciseId: string) => void;
  deleteExerciseLogs: (exerciseLogIds: string[]) => void;
  replaceWorkouts: (workouts: Workout[]) => void;
  replaceExerciseLogs: (exerciseLogs: ExerciseLog[]) => void;
  setSyncUser: (userId: string | null) => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  enqueueSyncOperation: (operation: SyncOperation) => void;
  removeSyncedOperations: (operationIds: string[]) => void;
  clearData: () => void;

  getWorkoutById: (workoutId: string) => Workout | undefined;
  getExerciseById: (exerciseId: string) => Exercise | undefined;
  getExerciseLogsByExerciseId: (exerciseId: string) => ExerciseLog[];

  getPreviousExerciseById: (exerciseId: string) => Exercise | undefined;
  getNextExerciseById: (exerciseId: string) => Exercise | undefined;
}

export type {
  Workout,
  Exercise,
  ExerciseLog,
  Store,
  SyncOperation,
  SyncStatus,
};
