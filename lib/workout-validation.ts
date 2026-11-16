import { z } from "zod";
import { DEFAULT_WORKOUT_ICON, WORKOUT_ICON_NAMES } from "@/lib/workout-icons";

// Match PostgreSQL numeric(8, 2), so a valid local edit cannot block syncing.
export const weightSchema = z
  .number()
  .nonnegative("Weight cannot be negative.")
  .max(999_999.99, "Weight must be below 1,000,000 kg.");

export const workoutFieldsSchema = z.object({
  name: z.string().trim().min(1, "Enter a workout name."),
  icon: z.enum(WORKOUT_ICON_NAMES).default(DEFAULT_WORKOUT_ICON),
});

export const exerciseFieldsSchema = z.object({
  name: z.string().trim().min(4, "Exercise names need at least 4 characters."),
  icon: z.enum(WORKOUT_ICON_NAMES).default(DEFAULT_WORKOUT_ICON),
  weight: weightSchema,
  notes: z.string().default(""),
  sets: z
    .number()
    .int("Sets must be a whole number.")
    .min(1, "Enter at least one set."),
  maxReps: z.number().int().min(1).optional(),
  logging: z.boolean(),
  step: z
    .number()
    .min(0.01, "Weight step must be at least 0.01 kg.")
    .max(999_999.99, "Weight step must be below 1,000,000 kg.")
    .multipleOf(0.01, "Use at most two decimal places for the weight step.")
    .default(2.5),
});
