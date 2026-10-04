"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useAppPathname } from "@/components/app-navigation";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useAppPathname();
  const previousPathname = useRef(pathname);
  const container = useRef<HTMLDivElement>(null);
  const interruptedFrame = useRef<Keyframe | null>(null);

  // Apply the first frame before the incoming page can paint at its final position.
  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    const firstFrame = interruptedFrame.current;
    interruptedFrame.current = null;
    const element = container.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const animation = element.animate(
      [
        firstFrame ?? { opacity: 0, transform: "translate3d(0, 12px, 0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      { duration: 260, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );

    return () => {
      // Rapid navigation should continue from the visible frame, not restart the slide.
      if (animation.playState === "running") {
        const style = window.getComputedStyle(element);
        interruptedFrame.current = {
          opacity: style.opacity,
          transform: style.transform,
        };
      }
      animation.cancel();
    };
  }, [pathname]);

  return (
    <div ref={container} className="min-w-0 flex-1">
      {children}
    </div>
  );
}
