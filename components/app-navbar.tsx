"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Home,
  LogIn,
  LogOut,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { CreateWorkoutDialog } from "@/components/create-workout-dialog";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { authClient } from "@/lib/auth-client";

type NavLinkProps = {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  href: string;
  label: string;
};

function navItemClass(active?: boolean) {
  return cn(
    "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
    "text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
    active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
  );
}

function NavLink({ active, children, className, href, label }: NavLinkProps) {
  return (
    <Link
      aria-label={label}
      className={cn(navItemClass(active), className)}
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
    pathname === "/register"
  );
}

function AccountPageNavItem({
  isLoggedIn,
  isSessionPending,
}: {
  isLoggedIn: boolean;
  isSessionPending: boolean;
}) {
  const router = useRouter();
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
    return <div aria-hidden className={cn(navItemClass(false), "invisible")} />;
  }

  return (
    <button
      aria-label="Sign out"
      className={navItemClass(false)}
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
            className={navItemClass(false)}
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

  if (pathname.startsWith("/e/")) {
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

  return (
    <NavLink active={pathname === "/account"} href="/account" label="Account">
      <Settings />
      <span>Manage</span>
    </NavLink>
  );
}

export function AppNavbar() {
  const pathname = usePathname();
  const session = authClient.useSession();
  const isLoggedIn = Boolean(session.data);
  const accountHref = !session.isPending && !isLoggedIn ? "/login" : "/account";
  const accountLabel = accountHref === "/login" ? "Login" : "Account";
  const AccountIcon = accountHref === "/login" ? LogIn : UserRound;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-6 pointer-events-none"
    >
      <div className="pointer-events-auto grid h-16 w-full max-w-sm grid-cols-3 items-center gap-1 rounded-xl border border-border bg-background/90 p-1 shadow-lg backdrop-blur-md">
        <NavLink
          active={pathname === "/"}
          className="ml-1"
          href="/"
          label="Home"
        >
          <Home />
          <span>Home</span>
        </NavLink>
        <PageSpecificNavItem
          isLoggedIn={isLoggedIn}
          isSessionPending={session.isPending}
          pathname={pathname}
        />
        <NavLink
          active={pathname === accountHref}
          className="mr-1"
          href={accountHref}
          label={accountLabel}
        >
          <AccountIcon />
          <span>{accountLabel}</span>
        </NavLink>
      </div>
    </nav>
  );
}
