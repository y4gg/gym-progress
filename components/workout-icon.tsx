import { BicepsFlexed, Dumbbell } from "lucide-react";
import { MuscleGroupIcon } from "@/components/muscle-group-icon";
import { normalizeWorkoutIcon, type WorkoutIconName } from "@/lib/workout-icons";

export const workoutIcons: Record<
  WorkoutIconName,
  { label: string }
> = {
  dumbbell: { label: "Dumbbell" },
  arms: { label: "Arms" },
  legs: { label: "Legs" },
  chest: { label: "Chest" },
  back: { label: "Back" },
  shoulders: { label: "Shoulders" },
  core: { label: "Core" },
  "upper-body": { label: "Upper body" },
  "lower-body": { label: "Lower body" },
  glutes: { label: "Glutes" },
  calves: { label: "Calves" },
  "full-body": { label: "Full body" },
};

export function WorkoutIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const icon = normalizeWorkoutIcon(name);
  if (icon === "dumbbell" || icon === "arms") {
    const Icon = icon === "arms" ? BicepsFlexed : Dumbbell;
    return <Icon className={className} aria-hidden="true" />;
  }
  return <MuscleGroupIcon group={icon} className={className} />;
}
