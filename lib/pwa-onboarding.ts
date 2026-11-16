const completedThisVisit = new Set<string>();
const listeners = new Set<() => void>();

export function getPwaOnboardingStorageKey(userId: string) {
  return `gym-ladder-pwa-onboarding-1:${userId}`;
}

export function isStandalonePwa() {
  return (
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function subscribeToDisplayMode(listener: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", listener);
  window.addEventListener("pageshow", listener);
  return () => {
    media.removeEventListener("change", listener);
    window.removeEventListener("pageshow", listener);
  };
}

export function hasCompletedPwaOnboarding(userId: string) {
  const key = getPwaOnboardingStorageKey(userId);
  if (completedThisVisit.has(key)) return true;
  try {
    return localStorage.getItem(key) === "complete";
  } catch {
    return false;
  }
}

export function completePwaOnboarding(userId: string) {
  const key = getPwaOnboardingStorageKey(userId);
  completedThisVisit.add(key);
  try {
    localStorage.setItem(key, "complete");
  } catch {
    // Keep completion for this visit when storage is unavailable.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeToOnboarding(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
