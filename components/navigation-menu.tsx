"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  Dumbbell,
  Home,
  LogIn,
  LogOut,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { AppLink, useAppRouter } from "@/components/app-navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { usePwaOnboarding } from "@/components/pwa-context";
import { PwaInstallButton } from "@/components/pwa-install-button";

const linkClassName =
  "flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

export type NavigationMenuProps = {
  pathname: string;
  session: typeof authClient.$Infer.Session | null;
  isSessionPending: boolean;
  onNavigate?: () => void;
};

export function NavigationMenu({
  pathname,
  session,
  isSessionPending,
  onNavigate,
}: NavigationMenuProps) {
  const { canReplay, replay } = usePwaOnboarding();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const workouts = useStore((state) => state.workouts);
  const router = useAppRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const exerciseId = pathname.match(/^\/e\/([^/]+)/)?.[1];
  const activeWorkoutId = useStore((state) =>
    exerciseId ? state.getExerciseById(exerciseId)?.workoutId : undefined,
  );
  const accountHref = !isSessionPending && !session ? "/login" : "/account";
  const accountLabel = accountHref === "/login" ? "Login" : "Account";
  const AccountIcon = accountHref === "/login" ? LogIn : UserRound;

  async function signOut() {
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        toast.error(result.error.message ?? "Sign out failed.");
        return;
      }
      useStore.getState().clearData();
      onNavigate?.();
      toast.success("Signed out.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Sign out failed.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <nav
        aria-label="Menu"
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-3"
      >
        <AppLink
          onNavigate={onNavigate}
          href="/"
          aria-current={pathname === "/" ? "page" : undefined}
          className={cn(
            linkClassName,
            pathname === "/" && "border-primary/30 bg-primary/10 text-primary",
          )}
        >
          <Home className="size-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">Home</span>
          <ChevronRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </AppLink>

        {workouts.length > 0 ? (
          <div className="mt-4">
            <p className="mb-1 px-1 text-xs font-bold tracking-wide text-muted-foreground">
              Workouts
            </p>
            <ul className="space-y-1">
              {workouts.map((workout) => {
                const active =
                  pathname === `/w/${workout.id}` ||
                  pathname === `/w/${workout.id}/create` ||
                  activeWorkoutId === workout.id;
                return (
                  <li key={workout.id}>
                    <AppLink
                      onNavigate={onNavigate}
                      href={`/w/${workout.id}?redirect=true`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        linkClassName,
                        active &&
                          "border-primary/30 bg-primary/10 text-primary",
                      )}
                    >
                      <Dumbbell
                        className="size-5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {workout.name}
                      </span>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </AppLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        <div className="mt-5 space-y-2 border-t pt-4 lg:hidden">
          {canReplay && (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                onNavigate?.();
                replay();
              }}
            >
              Replay onboarding
            </Button>
          )}
          <PwaInstallButton />
        </div>
      </nav>
      <div className="flex shrink-0 items-center gap-2 border-t bg-muted/20 p-4">
        <AppLink
          onNavigate={onNavigate}
          href={accountHref}
          aria-label={accountLabel}
          aria-current={pathname === accountHref ? "page" : undefined}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold">
            {session ? (
              session.user.name.charAt(0).toUpperCase()
            ) : (
              <AccountIcon className="size-5" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 text-sm">
            <span className="block truncate font-medium">
              {session?.user.name ?? accountLabel}
            </span>
            {session ? (
              <span className="block truncate text-xs text-muted-foreground">
                {session.user.email}
              </span>
            ) : null}
          </span>
        </AppLink>

        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-xl"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="hidden size-5 dark:block" aria-hidden="true" />
          <Moon className="size-5 dark:hidden" aria-hidden="true" />
        </Button>
        {session ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 rounded-xl text-destructive hover:text-destructive"
            aria-label={isSigningOut ? "Signing out" : "Sign out"}
            disabled={isSigningOut}
            onClick={signOut}
          >
            <LogOut className="size-5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </>
  );
}
