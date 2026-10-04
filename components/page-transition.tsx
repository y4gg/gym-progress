"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAppPathname } from "@/components/app-navigation";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useAppPathname();
  const previousPathname = useRef(pathname);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const animation = container.current?.animate(
      [
        { opacity: 0, transform: "translateY(32px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 360, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" },
    );

    return () => animation?.cancel();
  }, [pathname]);

  return (
    <div ref={container} className="min-w-0 flex-1">
      {children}
    </div>
  );
}
