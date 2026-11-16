import type { WorkoutIconName } from "@/lib/workout-icons";

type MuscleGroup = Exclude<WorkoutIconName, "dumbbell" | "arms">;

// Cropped anatomical outlines keep the targeted muscles readable at menu sizes.
const torso =
  "M12 3v3C8 6 6 7 5 10l-2 7c0 2 2 3 3 1l4-7c0 5 2 6 2 10l-1 8h10l-1-8c0-4 2-5 2-10l4 7c1 2 3 1 3-1l-2-7c-1-3-3-4-7-4V3";
const lowerBody =
  "M10 3h12c0 3 3 5 2 10l-2 7c1 3-1 6-1 9h-4l-1-13-1 13h-4c0-3-2-6-1-9l-2-7c-1-5 2-7 2-10Z";
const fullBody =
  "M13 8h6q4 0 5 4l3 6q1 3-2 2l-4-6v6l1 9h-4l-2-8-2 8h-4l1-9v-6l-4 6q-3 1-2-2l3-6q1-4 5-4Z";

const muscleGroups: Record<
  MuscleGroup,
  { outline: string; muscles: string; detail?: string }
> = {
  chest: {
    outline: torso,
    muscles: "M10 10q2-2 5 0v5q-3 2-5-1Z M22 10q-2-2-5 0v5q3 2 5-1Z",
  },
  back: {
    outline: torso,
    muscles: "M11 7l5 3 5-3 1 6-3 9h-6l-3-9Z",
    detail: "M16 10v14M11 12l5 3 5-3",
  },
  shoulders: {
    outline: torso,
    muscles: "M10 7q-5 0-5 5l3 1 3-5Z M22 7q5 0 5 5l-3 1-3-5Z",
  },
  core: {
    outline: torso,
    muscles: "M13 16h6v9h-6Z",
    detail: "M16 16v9M13 19h6M13 22h6",
  },
  "upper-body": {
    outline: torso,
    muscles: "M12 6h8q6 0 7 4l2 7q0 3-3 1l-4-7q0 6-2 8h-8q-2-2-2-8l-4 7q-3 2-3-1l2-7q1-4 7-4Z",
    detail: "M16 10v7M11 14l5 2 5-2",
  },
  legs: {
    outline: lowerBody,
    muscles: "M9 10l6 1-1 8h-3Z M23 10l-6 1 1 8h3Z M11 21h3v7h-2Z M21 21h-3v7h2Z",
  },
  "lower-body": {
    outline: lowerBody,
    muscles: lowerBody,
    detail: "M9 10l7 3 7-3",
  },
  glutes: {
    outline: lowerBody,
    muscles: "M10 7q3-3 6 0v7q-5 2-7-2Z M22 7q-3-3-6 0v7q5 2 7-2Z",
    detail: "M16 7v7",
  },
  calves: {
    outline: lowerBody,
    muscles: "M10 20h5l-1 8h-2Z M22 20h-5l1 8h2Z",
  },
  "full-body": {
    outline: fullBody,
    muscles: fullBody,
  },
};

export function MuscleGroupIcon({
  group,
  className,
}: {
  group: MuscleGroup;
  className?: string;
}) {
  const { outline, muscles, detail } = muscleGroups[group];

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-workout-icon={group}
      aria-hidden="true"
    >
      <path d={outline} opacity="0.55" />
      {group === "full-body" && <circle cx="16" cy="4" r="2.5" />}
      <path d={muscles} fill="currentColor" fillOpacity="0.3" strokeWidth="1.3" />
      {detail && <path d={detail} strokeWidth="1.2" />}
    </svg>
  );
}
