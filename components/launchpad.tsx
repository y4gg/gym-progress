"use client";

import { useCallback, useEffect, useState, type SetStateAction } from "react";
import { Dialog } from "radix-ui";
import { Check, Dumbbell, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLaunchpadGestures } from "@/components/use-launchpad-gestures";
import {
  NavigationMenu,
  type NavigationMenuProps,
} from "@/components/navigation-menu";

type LaunchpadProps = NavigationMenuProps & {
  triggerClassName?: string;
  onTutorialComplete?: () => void;
};

export function Launchpad({
  pathname,
  session,
  isSessionPending,
  triggerClassName,
  onTutorialComplete,
}: LaunchpadProps) {
  const [open, setOpen] = useState(false);
  const setMenuOpen = useCallback(
    (action: SetStateAction<boolean>) => {
      const nextOpen = typeof action === "function" ? action(open) : action;
      setOpen(nextOpen);
      if (open && !nextOpen) onTutorialComplete?.();
    },
    [open, onTutorialComplete],
  );
  const {
    sheetRef,
    suppressClickUntil,
    dragRef,
    resetDrag,
    prepareClose,
    startDrag,
    moveDrag,
    endDrag,
  } = useLaunchpadGestures(open, setMenuOpen);
  useEffect(() => {
    if (onTutorialComplete) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    function closeOnDesktop() {
      if (desktop.matches) setOpen(false);
    }
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [onTutorialComplete]);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) resetDrag();
        else prepareClose();
        setMenuOpen(nextOpen);
      }}
    >
      {onTutorialComplete ? (
        <Dialog.Trigger asChild>
          <Button variant="outline" size="lg">
            <Menu aria-hidden="true" />
            Open menu
          </Button>
        </Dialog.Trigger>
      ) : (
        <Dialog.Trigger asChild>
          <button type="button" aria-label="Menu" className={triggerClassName}>
            <Menu aria-hidden="true" />
            <span>Menu</span>
          </button>
        </Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="launchpad-overlay fixed inset-0 z-[60] bg-black/50" />
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
          className="launchpad-sheet fixed z-[60] top-[max(0.5rem,env(safe-area-inset-top))] right-[max(0.5rem,env(safe-area-inset-right))] bottom-[max(0.5rem,env(safe-area-inset-bottom))] flex w-[calc(100%-1rem)] max-w-md flex-col touch-pan-y overflow-hidden rounded-3xl border bg-background shadow-2xl outline-none"
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
          {onTutorialComplete ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
              <Check className="size-16" aria-hidden="true" />
              <h2 className="text-2xl font-bold">You found your launchpad</h2>
              <p className="max-w-xs leading-7 text-muted-foreground">
                Jump between workouts, manage your account, and switch themes
                here. Swipe right or close the menu to continue.
              </p>
              <Dialog.Close asChild>
                <Button size="lg">Continue</Button>
              </Dialog.Close>
            </div>
          ) : (
            <NavigationMenu
              pathname={pathname}
              session={session}
              isSessionPending={isSessionPending}
              onNavigate={() => {
                prepareClose();
                setMenuOpen(false);
              }}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
