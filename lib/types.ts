interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
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
}

interface Store {
  workouts: Workout[];
  addWorkout: (workout: Workout) => void;
  addExercise: (exercise: Exercise, workoutId: string) => void;
  editWorkout: (workout: Workout) => void;
  editExercise: (exercise: Exercise) => void;
  deleteWorkout: (workoutId: string) => void;
  deleteExercise: (exerciseId: string) => void;

  getWorkoutById: (workoutId: string) => Workout | undefined;
  getExerciseById: (exerciseId: string) => Exercise | undefined;
}

export type { Workout, Exercise, Store };
