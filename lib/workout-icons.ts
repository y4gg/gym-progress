export const WORKOUT_ICON_NAMES = [
  "dumbbell",
  "arms",
  "legs",
  "chest",
  "back",
  "shoulders",
  "core",
  "upper-body",
  "lower-body",
  "glutes",
  "calves",
  "full-body",
] as const;

export type WorkoutIconName = (typeof WORKOUT_ICON_NAMES)[number];

export const DEFAULT_WORKOUT_ICON: WorkoutIconName = "dumbbell";

export function normalizeWorkoutIcon(icon: unknown): WorkoutIconName {
  // Keep equivalent choices from the original picker when loading saved data.
  if (icon === "biceps-flexed") return "arms";
  if (icon === "person-standing") return "full-body";
  if (icon === "footprints") return "legs";
  return WORKOUT_ICON_NAMES.includes(icon as WorkoutIconName)
    ? (icon as WorkoutIconName)
    : DEFAULT_WORKOUT_ICON;
}
