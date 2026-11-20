import { z } from "zod";
import { DEFAULT_WORKOUT_ICON, WORKOUT_ICON_NAMES } from "@/lib/workout-icons";
import { toKilograms, type WeightUnit } from "@/lib/weight-units";

const MAX_WEIGHT_KG = 999_999.99;

export const weightSchema = z
  .number()
  .nonnegative("Weight cannot be negative.")
  .max(MAX_WEIGHT_KG, "Enter a smaller weight.");

const weightStepSchema = z
  .number()
  .positive("Enter a weight increment greater than zero.")
  .max(MAX_WEIGHT_KG, "Enter a smaller weight increment.");

export function weightStepInputSchema(unit: WeightUnit) {
  return z.number()
    .min(0.01, `The weight increment must be at least 0.01 ${unit}.`)
    .multipleOf(0.01, "Use at most two decimal places for the weight increment.")
    .transform((value) => toKilograms(value, unit))
    .pipe(weightStepSchema);
}

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
    .min(1, "Enter at least one set.")
    .max(2_147_483_647, "Enter fewer sets."),
  maxReps: z.number().int().min(1).optional(),
  logging: z.boolean(),
  step: weightStepSchema.default(2.5),
});

export function parseExerciseFields(
  fields: z.input<typeof exerciseFieldsSchema>,
  stepInput: string | null,
  unit: WeightUnit,
) {
  if (stepInput === null) return exerciseFieldsSchema.safeParse(fields);
  if (stepInput === "") return exerciseFieldsSchema.safeParse({ ...fields, step: undefined });

  const step = weightStepInputSchema(unit).safeParse(Number(stepInput));
  if (!step.success) return step;

  return exerciseFieldsSchema.safeParse({ ...fields, step: step.data });
}
