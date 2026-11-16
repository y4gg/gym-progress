"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import { Dumbbell, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLaunchpadGestures } from "@/components/use-launchpad-gestures";
import {
  NavigationMenu,
  type NavigationMenuProps,
} from "@/components/navigation-menu";

type LaunchpadProps = NavigationMenuProps & {
  triggerClassName: string;
};

export function Launchpad({
  pathname,
  session,
  isSessionPending,
  triggerClassName,
}: LaunchpadProps) {
  const [open, setOpen] = useState(false);
  const {
    sheetRef,
    suppressClickUntil,
    dragRef,
    resetDrag,
    prepareClose,
    startDrag,
    moveDrag,
    endDrag,
  } = useLaunchpadGestures(open, setOpen);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    function closeOnDesktop() {
      if (desktop.matches) setOpen(false);
    }
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) resetDrag();
        else prepareClose();
        setOpen(nextOpen);
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" aria-label="Menu" className={triggerClassName}>
          <Menu aria-hidden="true" />
          <span>Menu</span>
        </button>
      </Dialog.Trigger>
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
          <NavigationMenu
            pathname={pathname}
            session={session}
            isSessionPending={isSessionPending}
            onNavigate={() => {
              prepareClose();
              setOpen(false);
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
