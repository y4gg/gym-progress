"use client";

import { createContext, useContext } from "react";

export const PwaOnboardingContext = createContext({
  canReplay: false,
  replay: () => {},
});

export function usePwaOnboarding() {
  return useContext(PwaOnboardingContext);
}
