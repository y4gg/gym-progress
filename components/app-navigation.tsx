"use client";

import NextLink from "next/link";
import {
  usePathname,
  useRouter,
  useSearchParams,
  useSelectedLayoutSegment,
} from "next/navigation";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";

const LOCATION_CHANGED = "gym-location-changed";

function subscribeToLocation(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(LOCATION_CHANGED, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(LOCATION_CHANGED, listener);
  };
}

function getLocation() {
  return window.location.href;
}

function getServerLocation() {
  return null;
}

type OfflineNavigation = {
  navigate: (href: string, replace?: boolean) => void;
};

const OfflineNavigationContext = createContext<OfflineNavigation | null>(null);

const offlineNavigation: OfflineNavigation = {
  navigate(destination, replace = false) {
    const url = new URL(destination, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.assign(url);
      return;
    }
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
    window.dispatchEvent(new Event(LOCATION_CHANGED));
    window.scrollTo(0, 0);
  },
};

// The cached /offline document can render any workout URL without an RSC request.
export function AppNavigation({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();

  return (
    <OfflineNavigationContext.Provider
      value={segment === "offline" ? offlineNavigation : null}
    >
      {children}
    </OfflineNavigationContext.Provider>
  );
}

export function useAppPathname() {
  const offline = useContext(OfflineNavigationContext);
  const pathname = usePathname();
  const href = useSyncExternalStore(
    subscribeToLocation,
    getLocation,
    getServerLocation,
  );
  if (!offline) return pathname;
  if (!href) return "/offline";
  const browserPathname = new URL(href).pathname;
  return browserPathname === "/offline" ? "/" : browserPathname;
}

export function useAppSearchParams() {
  const offline = useContext(OfflineNavigationContext);
  const searchParams = useSearchParams();
  const href = useSyncExternalStore(
    subscribeToLocation,
    getLocation,
    getServerLocation,
  );
  return useMemo(
    () =>
      offline
        ? new URLSearchParams(href ? new URL(href).search : "")
        : searchParams,
    [offline, href, searchParams],
  );
}

export function useAppRouter() {
  const router = useRouter();
  const offline = useContext(OfflineNavigationContext);

  return {
    ...router,
    push(href: string) {
      if (offline) offline.navigate(href);
      else if (!navigator.onLine) window.location.assign(href);
      else router.push(href);
    },
    replace(href: string) {
      if (offline) offline.navigate(href, true);
      else if (!navigator.onLine) window.location.replace(href);
      else router.replace(href);
    },
  };
}

type AppLinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & {
  href: string;
};

export function AppLink({
  href,
  onNavigate,
  prefetch,
  ...props
}: AppLinkProps) {
  const offline = useContext(OfflineNavigationContext);
  return (
    <NextLink
      {...props}
      href={href}
      prefetch={offline ? false : prefetch}
      onNavigate={(event) => {
        onNavigate?.(event);
        if (offline || !navigator.onLine) {
          event.preventDefault();
          if (offline) offline.navigate(href);
          else window.location.assign(href);
        }
      }}
    />
  );
}
