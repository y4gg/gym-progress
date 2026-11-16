"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useStore } from "@/lib/store";

function subscribe(onChange: () => void) {
  if (!useStore.persist) return () => {};
  const unsubscribeStart = useStore.persist.onHydrate(onChange);
  const unsubscribeFinish = useStore.persist.onFinishHydration(onChange);
  return () => {
    unsubscribeStart();
    unsubscribeFinish();
  };
}

function getHydrated() {
  // Zustand omits persist when storage is unavailable (including server renders).
  return useStore.persist?.hasHydrated() ?? true;
}

export function useStoreHydrated() {
  const hydrated = useSyncExternalStore(
    subscribe,
    getHydrated,
    () => false,
  );

  useEffect(() => {
    if (useStore.persist && !useStore.persist.hasHydrated()) {
      void useStore.persist.rehydrate();
    }
  }, []);

  return hydrated;
}
