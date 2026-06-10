"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export function useStoreHydrated() {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (!useStore.persist.hasHydrated()) {
      useStore.persist.rehydrate();
    }
    return unsub;
  }, []);

  return hydrated;
}
