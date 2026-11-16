export const WORKOUT_ICON_NAMES = [
  "dumbbell",
  "biceps-flexed",
  "person-standing",
  "footprints",
  "activity",
  "heart-pulse",
  "flame",
  "zap",
  "bike",
  "waves",
  "mountain",
  "target",
] as const;

export type WorkoutIconName = (typeof WORKOUT_ICON_NAMES)[number];

export const DEFAULT_WORKOUT_ICON: WorkoutIconName = "dumbbell";

export function normalizeWorkoutIcon(icon: unknown): WorkoutIconName {
  return WORKOUT_ICON_NAMES.includes(icon as WorkoutIconName)
    ? (icon as WorkoutIconName)
    : DEFAULT_WORKOUT_ICON;
}
