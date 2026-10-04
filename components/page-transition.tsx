"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAppPathname } from "@/components/app-navigation";
import { useStore } from "@/lib/store";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useAppPathname();
  const previousPathname = useRef(pathname);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    const previousExerciseId = /^\/e\/([^/]+)\/?$/.exec(
      previousPathname.current,
    )?.[1];
    const exerciseId = /^\/e\/([^/]+)\/?$/.exec(pathname)?.[1];
    previousPathname.current = pathname;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let keyframes: Keyframe[] = [
      { opacity: 0, transform: "translateY(32px)" },
      { opacity: 1, transform: "translateY(0)" },
    ];

    if (previousExerciseId && exerciseId) {
      const store = useStore.getState();
      const previousExercise = store.getExerciseById(previousExerciseId);
      const workout = previousExercise
        ? store.getWorkoutById(previousExercise.workoutId)
        : undefined;
      const previousIndex =
        workout?.exercises.findIndex(
          (exercise) => exercise.id === previousExerciseId,
        ) ?? -1;
      const nextIndex =
        workout?.exercises.findIndex(
          (exercise) => exercise.id === exerciseId,
        ) ?? -1;

      if (previousIndex >= 0 && nextIndex >= 0 && previousIndex !== nextIndex) {
        keyframes = [
          {
            transform: `translateX(${nextIndex > previousIndex ? "100%" : "-100%"})`,
          },
          { transform: "translateX(0)" },
        ];
      }
    }

    const animation = container.current?.animate(
      keyframes,
      { duration: 360, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
    );

    return () => animation?.cancel();
  }, [pathname]);

  return (
    <div className="min-w-0 flex-1 overflow-x-clip">
      <div ref={container} className="min-w-0">
        {children}
      </div>
    </div>
  );
}
