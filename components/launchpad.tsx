"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  Dumbbell,
  Home,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppLink, useAppRouter } from "@/components/app-navigation";
import { Button } from "@/components/ui/button";
import { useLaunchpadGestures } from "@/components/use-launchpad-gestures";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const linkClassName =
  "flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring";

type LaunchpadProps = {
  pathname: string;
  session: typeof authClient.$Infer.Session | null;
  isSessionPending: boolean;
  triggerClassName: string;
};

export function Launchpad({
  pathname,
  session,
  isSessionPending,
  triggerClassName,
}: LaunchpadProps) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const workouts = useStore((state) => state.workouts);
  const router = useAppRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const {
    sheetRef,
    suppressClickUntil,
    dragRef,
    resetDrag,
    startDrag,
    moveDrag,
    endDrag,
  } = useLaunchpadGestures(open, setOpen);
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
      setOpen(false);
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
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        resetDrag();
        setOpen(nextOpen);
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Menu"
          className={triggerClassName}
        >
          <Menu aria-hidden="true" />
          <span>Menu</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 transition-opacity data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-200 motion-reduce:animate-none" />
        <Dialog.Content
          ref={sheetRef}
          aria-describedby={undefined}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={resetDrag}
          onLostPointerCapture={(event) => {
            if (event.target === event.currentTarget && dragRef.current)
              resetDrag();
          }}
          onClickCapture={(event) => {
            if (
              event.detail !== 0 &&
              event.timeStamp < suppressClickUntil.current
            ) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          className="fixed z-[60] top-[max(0.5rem,env(safe-area-inset-top))] right-[max(0.5rem,env(safe-area-inset-right))] bottom-[max(0.5rem,env(safe-area-inset-bottom))] flex w-[calc(100%-1rem)] max-w-md flex-col touch-pan-y overflow-hidden rounded-3xl border bg-background shadow-2xl outline-none transition-[translate] data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200 motion-reduce:animate-none"
        >
          <div className="flex shrink-0 select-none items-center justify-between gap-3 border-b px-5 py-3">
            <Dialog.Title className="flex min-w-0 items-center gap-2.5 text-base font-bold">
              <Dumbbell className="size-8 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Gym Ladder{" "}
                <span className="font-normal text-muted-foreground">
                  / Menu
                </span>
              </span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-full"
                aria-label="Close menu"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <nav
            aria-label="Menu"
            className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-4 py-3"
          >
            <Dialog.Close asChild>
              <AppLink
                href="/"
                aria-current={pathname === "/" ? "page" : undefined}
                className={cn(
                  linkClassName,
                  pathname === "/" &&
                    "border-primary/30 bg-primary/10 text-primary",
                )}
              >
                <Home className="size-5 shrink-0" aria-hidden="true" />
                <span className="flex-1">Home</span>
                <ChevronRight
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </AppLink>
            </Dialog.Close>
            {workouts.length > 0 ? (
              <div className="mt-4">
                <p className="mb-1 px-1 text-xs font-bold tracking-wide text-muted-foreground">
                  Workouts
                </p>
                <ul className="space-y-1">
                  {workouts.map((workout) => {
                    const active =
                      pathname === `/w/${workout.id}` ||
                      pathname === `/w/${workout.id}/create`;
                    return (
                      <li key={workout.id}>
                        <Dialog.Close asChild>
                          <AppLink
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
                        </Dialog.Close>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </nav>
          <div className="flex shrink-0 items-center gap-2 border-t bg-muted/20 p-4">
            <Dialog.Close asChild>
              <AppLink
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
            </Dialog.Close>
            <Button
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              aria-label="Toggle theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
