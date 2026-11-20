export type WeightUnit = "kg" | "lb";

export const WEIGHT_STORAGE_DECIMALS = 6;

// The international avoirdupois pound is defined as exactly this many kilograms.
const KILOGRAMS_PER_POUND = 0.45359237;
const weightNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const smallWeightNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: WEIGHT_STORAGE_DECIMALS });

export function weightInUnit(kilograms: number, unit: WeightUnit) {
  return unit === "kg" ? kilograms : kilograms / KILOGRAMS_PER_POUND;
}

export function roundKilograms(kilograms: number) {
  return Number(kilograms.toFixed(WEIGHT_STORAGE_DECIMALS));
}

export function toKilograms(weight: number, unit: WeightUnit) {
  const kilograms = unit === "kg" ? weight : weight * KILOGRAMS_PER_POUND;
  return kilograms < 0 ? kilograms : roundKilograms(kilograms);
}

export function weightInputValue(kilograms: number, unit: WeightUnit) {
  const weight = weightInUnit(kilograms, unit);
  return Number(weight.toFixed(2)) || roundKilograms(weight);
}

export function formatWeight(kilograms: number, unit: WeightUnit) {
  const weight = weightInUnit(kilograms, unit);
  const formatter = weight !== 0 && Math.abs(weight) < 0.005 ? smallWeightNumber : weightNumber;
  return formatter.format(weight);
}
