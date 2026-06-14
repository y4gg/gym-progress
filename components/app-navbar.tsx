"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Home,
  Plus,
  Settings,
  UserRound,
  Weight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateWorkoutDialog } from "@/components/create-workout-dialog";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  active?: boolean;
  children: React.ReactNode;
  href: string;
  label: string;
};

function navItemClass(active?: boolean) {
  return cn(
    "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
    "text-muted-foreground hover:bg-muted hover:text-foreground",
    active && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
  );
}

function NavLink({ active, children, href, label }: NavLinkProps) {
  return (
    <Link aria-label={label} className={navItemClass(active)} href={href}>
      {children}
    </Link>
  );
}

function getWorkoutId(pathname: string) {
  const match = pathname.match(/^\/w\/([^/]+)/);
  return match?.[1];
}

function PageSpecificNavItem({ pathname }: { pathname: string }) {
  const workoutId = getWorkoutId(pathname);

  if (pathname === "/") {
    return (
      <CreateWorkoutDialog
        trigger={
          <Button
            aria-label="Create workout"
            className={navItemClass(false)}
            type="button"
            variant="ghost"
          >
            <Plus />
            <span>Create</span>
          </Button>
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
      <NavLink href="/" label="Workouts">
        <Weight />
        <span>Workouts</span>
      </NavLink>
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

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-6 pointer-events-none"
    >
      <div className="pointer-events-auto grid h-16 w-full max-w-sm grid-cols-3 items-center gap-1 rounded-xl border border-border bg-background/90 p-1 shadow-lg backdrop-blur-md">
        <NavLink active={pathname === "/"} href="/" label="Home">
          <Home />
          <span>Home</span>
        </NavLink>
        <PageSpecificNavItem pathname={pathname} />
        <NavLink
          active={pathname === "/account"}
          href="/account"
          label="Account"
        >
          <UserRound />
          <span>Account</span>
        </NavLink>
      </div>
    </nav>
  );
}
