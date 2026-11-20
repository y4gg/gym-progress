"use client";

import { useState } from "react";
import {
  AppLink as Link,
  useAppPathname,
  useAppRouter,
} from "@/components/app-navigation";
import {
  ArrowLeft,
  Home,
  LogOut,
  Plus,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { CreateWorkoutDialog } from "@/components/create-workout-dialog";
import { AppLogo } from "@/components/app-logo";
import { Launchpad } from "@/components/launchpad";
import { NavigationMenu } from "@/components/navigation-menu";
import { isSettingsPathname } from "@/lib/app-routes";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { authClient } from "@/lib/auth-client";

type NavLinkProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
  label: string;
};

const navItemClassName =
  "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 lg:flex-none lg:justify-start";

function NavLink({ children, className, href, label }: NavLinkProps) {
  return (
    <Link
      aria-label={label}
      className={cn(navItemClassName, className)}
      href={href}
    >
      {children}
    </Link>
  );
}

function getWorkoutId(pathname: string) {
  const match = pathname.match(/^\/w\/([^/]+)/);
  return match?.[1];
}

function getExerciseId(pathname: string) {
  const match = pathname.match(/^\/e\/([^/]+)/);
  return match?.[1];
}

function isAccountPath(pathname: string) {
  return (
    pathname === "/account" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname.startsWith("/register/")
  );
}

function AccountPageNavItem({
  isLoggedIn,
  isSessionPending,
}: {
  isLoggedIn: boolean;
  isSessionPending: boolean;
}) {
  const router = useAppRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        toast.error(result.error.message ?? "Sign out failed.");
        return;
      }

      useStore.getState().clearData();
      toast.success("Signed out.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Sign out failed.");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isSessionPending || !isLoggedIn) {
    return <div aria-hidden className={cn(navItemClassName, "invisible")} />;
  }

  return (
    <button
      aria-label="Sign out"
      className={navItemClassName}
      disabled={isSigningOut}
      onClick={handleSignOut}
      type="button"
    >
      <LogOut className="size-6" />
      <span>{isSigningOut ? "Signing out" : "Sign out"}</span>
    </button>
  );
}

function PageSpecificNavItem({
  isLoggedIn,
  isSessionPending,
  pathname,
}: {
  isLoggedIn: boolean;
  isSessionPending: boolean;
  pathname: string;
}) {
  const workoutId = getWorkoutId(pathname);
  const exerciseId = getExerciseId(pathname);
  const exerciseWorkoutId = useStore((state) =>
    exerciseId ? state.getExerciseById(exerciseId)?.workoutId : undefined,
  );

  if (pathname === "/") {
    return (
      <CreateWorkoutDialog
        trigger={
          <button
            aria-label="Create workout"
            className={navItemClassName + " cursor-pointer"}
            type="button"
          >
            <Plus className="size-6" />
            <span>Create</span>
          </button>
        }
      />
    );
  }

  if (workoutId && !pathname.endsWith("/create")) {
    return (
      <NavLink href={`/w/${workoutId}/create`} label="Create exercise">
        <Plus />
        <span>Create</span>
      </NavLink>
    );
  }

  if (workoutId && pathname.endsWith("/create")) {
    return (
      <NavLink href={`/w/${workoutId}`} label="Back to workout">
        <ArrowLeft />
        <span>Back</span>
      </NavLink>
    );
  }

  if (exerciseId && pathname === `/e/${exerciseId}/logs`) {
    return (
      <NavLink href={`/e/${exerciseId}`} label="Back to exercise">
        <ArrowLeft />
        <span>Back</span>
      </NavLink>
    );
  }

  if (exerciseId && pathname !== `/e/${exerciseId}`) {
    return (
      <NavLink href={`/e/${exerciseId}`} label="Back to exercise">
        <ArrowLeft />
        <span>Back</span>
      </NavLink>
    );
  }

  if (exerciseId && pathname === `/e/${exerciseId}`) {
    return (
      <NavLink
        href={exerciseWorkoutId ? `/w/${exerciseWorkoutId}` : "/"}
        label="Back to workout"
      >
        <ArrowLeft />
        <span>Back</span>
      </NavLink>
    );
  }

  if (isAccountPath(pathname)) {
    return (
      <AccountPageNavItem
        isLoggedIn={isLoggedIn}
        isSessionPending={isSessionPending}
      />
    );
  }

  if (isSettingsPathname(pathname)) return <div aria-hidden="true" />;

  return (
    <NavLink href="/account" label="Account">
      <Settings />
      <span>Manage</span>
    </NavLink>
  );
}

export function AppNavbar() {
  const pathname = useAppPathname();
  const session = authClient.useSession();
  const isLoggedIn = Boolean(session.data);

  if (pathname === "/offline") return null;

  return (
    <>
      <aside
        aria-label="Sidebar"
        className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 border-b px-5 py-6 text-lg font-bold focus-visible:outline-2 focus-visible:outline-ring"
        >
          <AppLogo className="size-8 shrink-0" />
          Gym Ladder
        </Link>
        <div className="grid shrink-0 px-4 pt-4">
          <PageSpecificNavItem
            isLoggedIn={isLoggedIn}
            isSessionPending={session.isPending}
            pathname={pathname}
          />
        </div>
        <NavigationMenu
          pathname={pathname}
          session={session.data}
          isSessionPending={session.isPending}
        />
      </aside>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-6 pointer-events-none lg:hidden"
      >
        <div className="pointer-events-auto grid h-16 w-full max-w-sm grid-cols-3 items-center gap-1 rounded-xl border border-border bg-background/90 p-1 shadow-lg backdrop-blur-md">
          <NavLink className="ml-1" href="/" label="Home">
            <Home />
            <span>Home</span>
          </NavLink>
          <PageSpecificNavItem
            isLoggedIn={isLoggedIn}
            isSessionPending={session.isPending}
            pathname={pathname}
          />
          <Launchpad
            key={pathname}
            pathname={pathname}
            session={session.data}
            isSessionPending={session.isPending}
            triggerClassName={cn(navItemClassName, "mr-1 cursor-pointer")}
          />
        </div>
      </nav>
    </>
  );
}
