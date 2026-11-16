"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useAppPathname } from "@/components/app-navigation";
import { PwaOnboardingContext } from "@/components/pwa-context";
import { PwaOnboarding } from "@/components/pwa-onboarding";
import { PwaInstallProvider } from "@/components/pwa-install-button";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import {
  completePwaOnboarding,
  hasCompletedPwaOnboarding,
  isStandalonePwa,
  subscribeToDisplayMode,
  subscribeToOnboarding,
} from "@/lib/pwa-onboarding";

const serverStandalone = () => false;
const serverCompleted = () => true;

export function PwaOnboardingProvider({ children }: { children: ReactNode }) {
  const pathname = useAppPathname();
  const session = authClient.useSession();
  const hydrated = useStoreHydrated();
  const savedUserId = useStore((state) => state.syncUserId);
  const userId = session.data?.user.id ?? savedUserId ?? "guest";
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    isStandalonePwa,
    serverStandalone,
  );
  const completed = useSyncExternalStore(
    subscribeToOnboarding,
    () => hasCompletedPwaOnboarding(userId),
    serverCompleted,
  );
  const [replaying, setReplaying] = useState(false);
  const isWorkoutPage =
    pathname === "/" || pathname === "/offline" || /^\/(w|e)\//.test(pathname);
  const showAutomatically =
    standalone &&
    hydrated &&
    !completed &&
    isWorkoutPage &&
    (!session.isPending || !navigator.onLine);

  return (
    <PwaInstallProvider>
      <PwaOnboardingContext.Provider
        value={{
          canReplay: standalone,
          replay: () => {
            if (standalone) setReplaying(true);
          },
        }}
      >
        {standalone && (replaying || showAutomatically) ? (
          <PwaOnboarding
            key={userId}
            onComplete={() => {
              completePwaOnboarding(userId);
              setReplaying(false);
            }}
          />
        ) : (
          children
        )}
      </PwaOnboardingContext.Provider>
    </PwaInstallProvider>
  );
}
