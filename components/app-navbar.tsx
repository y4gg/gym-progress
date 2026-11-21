"use client";

import { useState } from "react";
import {
  AppLink as Link,
  useAppPathname,
  useAppRouter,
} from "@/components/app-navigation";
import {
  ArrowLeft,
  BarChart3,
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
import { Button } from "@/components/ui/button";
import { isOverviewPathname, isSettingsPathname } from "@/lib/app-routes";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { authClient } from "@/lib/auth-client";

type NavLinkProps = {
  active?: boolean;
  children: React.ReactNode;
  href: string;
  label: string;
};

const navItemClassName =
  "flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-center text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 max-lg:[&>svg]:size-5 lg:flex-none lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-sm";

const pageActionClassName =
  "pointer-events-auto size-(--page-action-size) rounded-xl shadow-lg";

function NavLink({ active, children, href, label }: NavLinkProps) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(navItemClassName, active && "bg-accent text-foreground")}
      href={href}
    >
      {children}
    </Link>
  );
}

function PageActionLink({ children, href, label }: Omit<NavLinkProps, "active">) {
  return (
    <Button asChild size="icon" className={pageActionClassName}>
      <Link aria-label={label} href={href} title={label}>
        {children}
      </Link>
    </Button>
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

function AccountPageAction() {
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

  const label = isSigningOut ? "Signing out" : "Sign out";
  return (
    <Button
      aria-label={label}
      className={pageActionClassName}
      disabled={isSigningOut}
      onClick={handleSignOut}
      size="icon"
      title={label}
      type="button"
    >
      <LogOut aria-hidden="true" className="size-6" />
    </Button>
  );
}

function PageAction({ pathname }: { pathname: string }) {
  const workoutId = getWorkoutId(pathname);
  const exerciseId = getExerciseId(pathname);
  const exerciseWorkoutId = useStore((state) =>
    exerciseId ? state.getExerciseById(exerciseId)?.workoutId : undefined,
  );

  if (pathname === "/") {
    return (
      <CreateWorkoutDialog
        trigger={
          <Button
            aria-label="Create workout"
            className={pageActionClassName}
            size="icon"
            title="Create workout"
            type="button"
          >
            <Plus aria-hidden="true" className="size-6" />
          </Button>
        }
      />
    );
  }

  if (workoutId) {
    return pathname.endsWith("/create") ? (
      <PageActionLink href={`/w/${workoutId}`} label="Back to workout">
        <ArrowLeft aria-hidden="true" className="size-6" />
      </PageActionLink>
    ) : (
      <PageActionLink href={`/w/${workoutId}/create`} label="Create exercise">
        <Plus aria-hidden="true" className="size-6" />
      </PageActionLink>
    );
  }

  if (exerciseId) {
    return pathname === `/e/${exerciseId}` ? (
      <PageActionLink
        href={exerciseWorkoutId ? `/w/${exerciseWorkoutId}` : "/"}
        label="Back to workout"
      >
        <ArrowLeft aria-hidden="true" className="size-6" />
      </PageActionLink>
    ) : (
      <PageActionLink href={`/e/${exerciseId}`} label="Back to exercise">
        <ArrowLeft aria-hidden="true" className="size-6" />
      </PageActionLink>
    );
  }

  if (isAccountPath(pathname)) {
    return <AccountPageAction />;
  }

  return (
    <PageActionLink href="/account" label="Account">
      <Settings aria-hidden="true" className="size-6" />
    </PageActionLink>
  );
}

export function AppNavbar() {
  const pathname = useAppPathname();
  const session = authClient.useSession();
  const isOverview = isOverviewPathname(pathname);
  const showPageAction =
    !isOverview &&
    !isSettingsPathname(pathname) &&
    (!isAccountPath(pathname) || (!session.isPending && Boolean(session.data)));

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
        <NavigationMenu
          pathname={pathname}
          session={session.data}
          isSessionPending={session.isPending}
        />
      </aside>
      {/* Let the page scroll past the action where it can cover the content. */}
      {showPageAction && (
        <div
          aria-hidden="true"
          className="h-[calc(var(--page-action-size)+var(--bottom-control-gap))] shrink-0 lg:h-8 xl:hidden"
        />
      )}
      <div className="pointer-events-none fixed inset-x-0 bottom-(--bottom-nav-inset) z-50 px-6">
        <div className="mx-auto flex w-full max-w-sm flex-col items-end gap-(--bottom-control-gap) lg:max-w-none">
          {showPageAction && <PageAction pathname={pathname} />}
          <nav
            aria-label="Primary"
            className="pointer-events-auto grid h-(--bottom-nav-height) w-full grid-cols-3 items-center gap-1 rounded-xl border border-border bg-background/90 p-1 shadow-lg backdrop-blur-md lg:hidden"
          >
            <NavLink href="/" label="Home" active={pathname === "/"}>
              <Home />
              <span>Home</span>
            </NavLink>
            <NavLink href="/overview" label="Overview" active={isOverview}>
              <BarChart3 />
              <span>Overview</span>
            </NavLink>
            <Launchpad
              key={pathname}
              isSessionPending={session.isPending}
              pathname={pathname}
              session={session.data}
              triggerClassName={cn(navItemClassName, "cursor-pointer")}
            />
          </nav>
        </div>
      </div>
    </>
  );
}
