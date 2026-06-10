"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useStore.persist.hasHydrated());
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (!useStore.persist.hasHydrated()) {
      useStore.persist.rehydrate();
    }
    return unsub;
  }, []);

  return hydrated;
}
