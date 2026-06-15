import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Workout,
  Exercise,
  Store,
  NewWorkout,
  NewExercise,
} from "./types";

const useStore = create<Store>()(
  persist(
    (set, get) => ({
      workouts: [],
      addWorkout: (workout: NewWorkout) => {
        const updatedWorkout: Workout = {
          ...workout,
          updatedAt: new Date(),
          createdAt: new Date(),
        };
        set((state) => ({ workouts: [...state.workouts, updatedWorkout] }));
      },
      addExercise: (exercise: NewExercise) => {
        const updatedExercise: Exercise = {
          ...exercise,
          updatedAt: new Date(),
          createdAt: new Date(),
        };
        set((state) => ({
          workouts: state.workouts.map((workout) => {
            if (workout.id === exercise.workoutId) {
              return {
                ...workout,
                exercises: [...workout.exercises, updatedExercise],
              };
            }

            return workout;
          }),
        }));
      },
      editWorkout: (updatedWorkout: Workout) => {
        const updatedWorkoutWithTime: Workout = {
          ...updatedWorkout,
          updatedAt: new Date(),
        };
        set((state) => ({
          workouts: state.workouts.map((workout) => {
            if (workout.id === updatedWorkout.id) {
              return updatedWorkoutWithTime;
            }

            return workout;
          }),
        }));
      },
      editExercise: (updatedExercise: Exercise) => {
        const updatedExerciseWithTime: Exercise = {
          ...updatedExercise,
          updatedAt: new Date(),
        };
        set((state) => ({
          workouts: state.workouts.map((workout) => ({
            ...workout,
            exercises: workout.exercises.map((exercise) => {
              if (exercise.id === updatedExercise.id) {
                return updatedExerciseWithTime;
              }

              return exercise;
            }),
          })),
        }));
      },
      deleteWorkout: (workoutId: string) =>
        set((state) => ({
          workouts: state.workouts.filter(
            (workout) => workout.id !== workoutId,
          ),
        })),
      deleteExercise: (exerciseId: string) =>
        set((state) => ({
          workouts: state.workouts.map((workout) => ({
            ...workout,
            exercises: workout.exercises.filter(
              (exercise) => exercise.id !== exerciseId,
            ),
          })),
        })),
      clearData: () => set({ workouts: [] }),
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
      getPreviousExerciseById: (exerciseId: string) => {
        for (const workout of get().workouts) {
          const exerciseIndex = workout.exercises.findIndex(
            (exercise) => exercise.id === exerciseId,
          );

          return exerciseIndex > 0
            ? workout.exercises[exerciseIndex - 1]
            : undefined;
        }
        return undefined;
      },
      getNextExerciseById: (exerciseId: string) => {
        for (const workout of get().workouts) {
          const exerciseIndex = workout.exercises.findIndex(
            (exercise) => exercise.id === exerciseId,
          );

          return exerciseIndex < workout.exercises.length - 1
            ? workout.exercises[exerciseIndex + 1]
            : undefined;
        }
        return undefined;
      },
    }),
    {
      name: "store",
      skipHydration: true,
    },
  ),
);

export { useStore };
