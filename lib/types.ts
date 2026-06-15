interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];

  updatedAt: Date;
  createdAt: Date;
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
  step?: number;

  updatedAt: Date;
  createdAt: Date;
}

export type NewExercise = Omit<Exercise, "updatedAt" | "createdAt">;

export type NewWorkout = Omit<Workout, "updatedAt" | "createdAt">;

interface Store {
  workouts: Workout[];
  addWorkout: (workout: NewWorkout) => void;
  addExercise: (exercise: NewExercise) => void;
  editWorkout: (workout: Workout) => void;
  editExercise: (exercise: Exercise) => void;
  deleteWorkout: (workoutId: string) => void;
  deleteExercise: (exerciseId: string) => void;
  clearData: () => void;

  getWorkoutById: (workoutId: string) => Workout | undefined;
  getExerciseById: (exerciseId: string) => Exercise | undefined;

  getPreviousExerciseById: (exerciseId: string) => Exercise | undefined;
  getNextExerciseById: (exerciseId: string) => Exercise | undefined;
}

export type { Workout, Exercise, Store };
