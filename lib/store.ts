import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workout, Exercise, Store } from "./types";

const useStore = create<Store>()(
  persist(
    (set, get) => ({
      workouts: [],
      addWorkout: (workout: Workout) =>
        set((state) => ({ workouts: [...state.workouts, workout] })),
      addExercise: (exercise: Exercise, workoutId: string) =>
        set((state) => ({
          workouts: state.workouts.map((workout) => {
            if (workout.id === workoutId) {
              return {
                ...workout,
                exercises: [...workout.exercises, exercise],
              };
            }

            return workout;
          }),
        })),
      editWorkout: (updatedWorkout: Workout) =>
        set((state) => ({
          workouts: state.workouts.map((workout) => {
            if (workout.id === updatedWorkout.id) {
              return updatedWorkout;
            }

            return workout;
          }),
        })),
      editExercise: (updatedExercise: Exercise) =>
        set((state) => ({
          workouts: state.workouts.map((workout) => ({
            ...workout,
            exercises: workout.exercises.map((exercise) => {
              if (exercise.id === updatedExercise.id) {
                return updatedExercise;
              }

              return exercise;
            }),
          })),
        })),
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
    }),
    {
      name: "store",
    },
  ),
);

export { useStore };
