"use client";

import { useId } from "react";
import { WorkoutIcon, workoutIcons } from "@/components/workout-icon";
import { WORKOUT_ICON_NAMES, type WorkoutIconName } from "@/lib/workout-icons";

export function WorkoutIconPicker({
  value,
  onChange,
}: {
  value: WorkoutIconName;
  onChange: (icon: WorkoutIconName) => void;
}) {
  const name = useId();

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium">Workout icon</legend>
      <div className="grid grid-cols-6 gap-2">
        {WORKOUT_ICON_NAMES.map((icon) => (
          <label key={icon} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={icon}
              checked={value === icon}
              onChange={() => onChange(icon)}
              aria-label={workoutIcons[icon].label}
              className="peer sr-only"
            />
            <span
              title={workoutIcons[icon].label}
              className="flex min-h-11 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
            >
              <WorkoutIcon name={icon} className="size-5" />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
