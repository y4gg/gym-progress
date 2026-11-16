"use client";

import { createContext, useContext } from "react";

export const PwaOnboardingContext = createContext({ replay: () => {} });

export function usePwaOnboarding() {
  return useContext(PwaOnboardingContext);
}
