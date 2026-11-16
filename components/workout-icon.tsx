import {
  Activity,
  BicepsFlexed,
  Bike,
  Dumbbell,
  Flame,
  Footprints,
  HeartPulse,
  Mountain,
  PersonStanding,
  Target,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { normalizeWorkoutIcon, type WorkoutIconName } from "@/lib/workout-icons";

export const workoutIcons: Record<
  WorkoutIconName,
  { icon: LucideIcon; label: string }
> = {
  dumbbell: { icon: Dumbbell, label: "Dumbbell" },
  "biceps-flexed": { icon: BicepsFlexed, label: "Biceps" },
  "person-standing": { icon: PersonStanding, label: "Full body" },
  footprints: { icon: Footprints, label: "Footprints" },
  activity: { icon: Activity, label: "Activity" },
  "heart-pulse": { icon: HeartPulse, label: "Heart" },
  flame: { icon: Flame, label: "Flame" },
  zap: { icon: Zap, label: "Lightning" },
  bike: { icon: Bike, label: "Cycling" },
  waves: { icon: Waves, label: "Waves" },
  mountain: { icon: Mountain, label: "Mountain" },
  target: { icon: Target, label: "Target" },
};

export function WorkoutIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const Icon = workoutIcons[normalizeWorkoutIcon(name)].icon;
  return <Icon className={className} aria-hidden="true" />;
}
