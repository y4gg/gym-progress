"use client";

import {
  useEffect,
  useRef,
  type PointerEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

// Match NotifyMind's left swipe to open and right swipe to dismiss.
export function useLaunchpadGestures(
  open: boolean,
  setOpen: Dispatch<SetStateAction<boolean>>,
) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const suppressClickUntil = useRef(0);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    startedAt: number;
    dragging: boolean;
    offset: number;
  } | null>(null);

  useEffect(() => {
    if (open) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    let swipe: {
      id: number;
      x: number;
      y: number;
      startedAt: number;
      horizontal: boolean;
    } | null = null;

    function startSwipe(event: TouchEvent) {
      swipe = null;
      if (
        !mobile.matches ||
        event.touches.length !== 1 ||
        !(event.target instanceof Element)
      )
        return;
      const target = event.target;
      if (
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
        )
      )
        return;
      // Leave horizontal controls and carousels in charge of their own swipes.
      for (
        let element: Element | null = target;
        element;
        element = element.parentElement
      ) {
        const { overflowX, touchAction } = getComputedStyle(element);
        if (
          touchAction === "none" ||
          (element.scrollWidth > element.clientWidth &&
            /auto|scroll/.test(overflowX))
        )
          return;
      }
      const touch = event.touches[0];
      swipe = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startedAt: event.timeStamp,
        horizontal: false,
      };
    }

    function moveSwipe(event: TouchEvent) {
      if (!swipe) return;
      if (event.touches.length !== 1) {
        swipe = null;
        return;
      }
      const touch = event.touches[0];
      if (touch.identifier !== swipe.id) return;
      const distance = swipe.x - touch.clientX;
      const vertical = Math.abs(touch.clientY - swipe.y);
      if (!swipe.horizontal) {
        if (Math.max(Math.abs(distance), vertical) < 10) return;
        if (distance <= vertical * 1.2) {
          swipe = null;
          return;
        }
        swipe.horizontal = true;
      }
      if (event.cancelable) event.preventDefault();
    }

    function endSwipe(event: TouchEvent) {
      const start = swipe;
      swipe = null;
      if (!start || event.touches.length !== 0) return;
      const touch = Array.from(event.changedTouches).find(
        (touch) => touch.identifier === start.id,
      );
      if (!touch) return;
      const distance = start.x - touch.clientX;
      const velocity =
        distance / Math.max(1, event.timeStamp - start.startedAt);
      if (
        start.horizontal &&
        distance > Math.abs(touch.clientY - start.y) * 1.2 &&
        (distance >= 80 || (distance >= 24 && velocity >= 0.5))
      ) {
        setOpen(true);
      }
    }

    function cancelSwipe() {
      swipe = null;
    }

    document.addEventListener("touchstart", startSwipe, { passive: true });
    document.addEventListener("touchmove", moveSwipe, { passive: false });
    document.addEventListener("touchend", endSwipe);
    document.addEventListener("touchcancel", cancelSwipe);
    return () => {
      document.removeEventListener("touchstart", startSwipe);
      document.removeEventListener("touchmove", moveSwipe);
      document.removeEventListener("touchend", endSwipe);
      document.removeEventListener("touchcancel", cancelSwipe);
    };
  }, [open, setOpen]);

  function resetDrag() {
    dragRef.current = null;
    if (sheetRef.current) {
      sheetRef.current.style.transition = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? "none"
        : "transform 180ms ease-out";
      sheetRef.current.style.setProperty("--launchpad-drag-x", "0px");
    }
  }

  function currentOffset(sheet: HTMLDivElement) {
    const transform = getComputedStyle(sheet).transform;
    return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
  }

  function prepareClose() {
    dragRef.current = null;
    const sheet = sheetRef.current;
    if (!sheet) return;
    // Start dismissal at the visible position, including an interrupted snap-back.
    const offset = currentOffset(sheet);
    sheet.style.transition = "none";
    sheet.style.setProperty("--launchpad-drag-x", `${offset}px`);
    sheet.style.removeProperty("animation");
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const target = event.target as Element;
    if (!sheetRef.current?.contains(target)) return;
    if (
      target.closest('[role="dialog"]') !== sheetRef.current ||
      target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]',
      )
    )
      return;
    suppressClickUntil.current = 0;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: event.timeStamp,
      dragging: false,
      offset: 0,
    };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !sheetRef.current)
      return;
    const distance = event.clientX - drag.x;
    if (!drag.dragging) {
      const vertical = Math.abs(event.clientY - drag.y);
      if (Math.max(Math.abs(distance), vertical) < 10) return;
      if (distance <= vertical * 1.2) {
        dragRef.current = null;
        return;
      }
      drag.dragging = true;
      // Take over an in-flight entrance without adding a second translation.
      drag.offset = currentOffset(sheetRef.current);
      event.currentTarget.setPointerCapture(event.pointerId);
      sheetRef.current.style.transition = "none";
      sheetRef.current.style.animation = "none";
    }
    sheetRef.current.style.setProperty(
      "--launchpad-drag-x",
      `${Math.max(0, drag.offset + distance)}px`,
    );
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.x;
    const velocity = distance / Math.max(1, event.timeStamp - drag.startedAt);
    if (drag.dragging) suppressClickUntil.current = event.timeStamp + 500;
    if (
      drag.dragging &&
      distance > Math.abs(event.clientY - drag.y) * 1.2 &&
      (distance >= 80 || (distance >= 24 && velocity >= 0.5))
    ) {
      prepareClose();
      setOpen(false);
    } else {
      resetDrag();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return {
    sheetRef,
    suppressClickUntil,
    dragRef,
    resetDrag,
    prepareClose,
    startDrag,
    moveDrag,
    endDrag,
  };
}
