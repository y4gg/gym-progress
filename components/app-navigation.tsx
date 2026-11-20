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
import { isLocalAppPathname } from "@/lib/app-routes";

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
  navigate: (
    href: string,
    options?: { replace?: boolean; scroll?: boolean },
  ) => void;
};

const OfflineNavigationContext = createContext<OfflineNavigation | null>(null);

const offlineNavigation: OfflineNavigation = {
  navigate(destination, { replace = false, scroll = true } = {}) {
    const url = new URL(destination, window.location.href);
    // Account pages need a server document once the connection returns.
    if (url.origin !== window.location.origin || !isLocalAppPathname(url.pathname)) {
      window.location[replace ? "replace" : "assign"](url.href);
      return;
    }
    window.history[replace ? "replaceState" : "pushState"](null, "", url);
    window.dispatchEvent(new Event(LOCATION_CHANGED));
    if (scroll) window.scrollTo(0, 0);
  },
};

// Keep local screens available even when the browser still reports online
// after losing internet access.
export function AppNavigation({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();

  return (
    <OfflineNavigationContext.Provider
      value={
        segment === "offline" || isLocalAppPathname(pathname)
          ? offlineNavigation
          : null
      }
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
    push(href: string, options?: Parameters<typeof router.push>[1]) {
      if (offline) offline.navigate(href, options);
      else if (!navigator.onLine) window.location.assign(href);
      else router.push(href, options);
    },
    replace(href: string, options?: Parameters<typeof router.replace>[1]) {
      if (offline) offline.navigate(href, { ...options, replace: true });
      else if (!navigator.onLine) window.location.replace(href);
      else router.replace(href, options);
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
  replace,
  scroll,
  ...props
}: AppLinkProps) {
  const offline = useContext(OfflineNavigationContext);
  return (
    <NextLink
      {...props}
      href={href}
      prefetch={offline ? false : prefetch}
      replace={replace}
      scroll={scroll}
      onNavigate={(event) => {
        let prevented = false;
        onNavigate?.({
          ...event,
          preventDefault() {
            prevented = true;
            event.preventDefault();
          },
        });
        if (prevented) return;
        if (offline || !navigator.onLine) {
          event.preventDefault();
          if (offline) offline.navigate(href, { replace, scroll });
          else window.location[replace ? "replace" : "assign"](href);
        }
      }}
    />
  );
}
