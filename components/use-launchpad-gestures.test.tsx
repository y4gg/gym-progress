import { afterEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { useState } from "react";

const browser = new Window({ url: "http://localhost" });
for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "MutationObserver",
  "Event",
  "PointerEvent",
  "DOMMatrixReadOnly",
  "getComputedStyle",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? browser : browser[name],
  });
}

const { cleanup, fireEvent, render } = await import("@testing-library/react");
const { useLaunchpadGestures } = await import("./use-launchpad-gestures");

afterEach(() => {
  cleanup();
  browser.happyDOM.settings.device.prefersReducedMotion = "no-preference";
});

function Menu() {
  const [open, setOpen] = useState(true);
  const { sheetRef, startDrag, moveDrag, endDrag, resetDrag, prepareClose } =
    useLaunchpadGestures(open, setOpen);
  return (
    <>
      <div
        ref={sheetRef}
        role="dialog"
        aria-label="Menu"
        data-state={open ? "open" : "closed"}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={resetDrag}
      >
        <input aria-label="Name" />
      </div>
      <button onClick={prepareClose}>Prepare close</button>
    </>
  );
}

function setup(offset = 0) {
  const view = render(<Menu />);
  const sheet = view.getByRole("dialog");
  // Happy DOM has no animation clock. Supply the transform that a browser
  // reports while the entrance or snap-back is in progress.
  sheet.style.transform = `matrix(1, 0, 0, 1, ${offset}, 0)`;
  sheet.setPointerCapture = () => {};
  sheet.hasPointerCapture = () => false;
  return { view, sheet };
}

function pointer(sheet: HTMLElement, type: string, x: number, y = 100) {
  fireEvent(
    sheet,
    new PointerEvent(type, {
      bubbles: true,
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  );
}

test("dragging during the entrance continues from the visible position", () => {
  const { sheet } = setup(120);
  pointer(sheet, "pointerdown", 40);
  pointer(sheet, "pointermove", 60);
  expect(sheet.style.animation).toBe("none");
  expect(sheet.style.getPropertyValue("--launchpad-drag-x")).toBe("140px");
  pointer(sheet, "pointermove", 80);
  expect(sheet.style.getPropertyValue("--launchpad-drag-x")).toBe("160px");
});

test("closing during snap-back preserves its current position", () => {
  const { view, sheet } = setup(45);
  sheet.style.animation = "none";
  sheet.style.transition = "transform 180ms ease-out";
  fireEvent.click(view.getByRole("button", { name: "Prepare close" }));
  expect(sheet.style.getPropertyValue("--launchpad-drag-x")).toBe("45px");
  expect(sheet.style.transition).toBe("none");
  expect(sheet.style.animation).toBe("");
});

test("a completed swipe starts dismissal at the release position", () => {
  const { sheet } = setup();
  pointer(sheet, "pointerdown", 40);
  pointer(sheet, "pointermove", 140);
  sheet.style.transform = "matrix(1, 0, 0, 1, 100, 0)";
  pointer(sheet, "pointerup", 140);
  expect(sheet.dataset.state).toBe("closed");
  expect(sheet.style.getPropertyValue("--launchpad-drag-x")).toBe("100px");
  expect(sheet.style.animation).toBe("");
});

test("canceling a drag returns to the resting position", () => {
  const { sheet } = setup();
  pointer(sheet, "pointerdown", 40);
  pointer(sheet, "pointermove", 60);
  pointer(sheet, "pointercancel", 60);
  expect(sheet.dataset.state).toBe("open");
  expect(sheet.style.getPropertyValue("--launchpad-drag-x")).toBe("0px");
  expect(sheet.style.transition).toBe("transform 180ms ease-out");
});

test("vertical scrolling does not take over the entrance animation", () => {
  const { sheet } = setup(120);
  pointer(sheet, "pointerdown", 40);
  pointer(sheet, "pointermove", 45, 125);
  expect(sheet.style.animation).toBe("");
  expect(sheet.style.getPropertyValue("--launchpad-drag-x")).toBe("");
});

test("reduced motion disables the snap-back transition", () => {
  browser.happyDOM.settings.device.prefersReducedMotion = "reduce";
  const { sheet } = setup();
  pointer(sheet, "pointerdown", 40);
  pointer(sheet, "pointermove", 60);
  pointer(sheet, "pointercancel", 60);
  expect(sheet.style.getPropertyValue("--launchpad-drag-x")).toBe("0px");
  expect(sheet.style.transition).toBe("none");
});
