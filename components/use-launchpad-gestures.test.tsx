import { afterEach, expect, mock, spyOn, test } from "bun:test";
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
  "Event",
  "PointerEvent",
  "getComputedStyle",
  "DOMMatrixReadOnly",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? browser : browser[name],
  });
}

const { cleanup, fireEvent, render } = await import("@testing-library/react");
const { useLaunchpadGestures } = await import("./use-launchpad-gestures");
const frames = new Map<number, FrameRequestCallback>();
let frameId = 0;
Object.defineProperty(browser, "requestAnimationFrame", {
  value: (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  },
});
Object.defineProperty(browser, "cancelAnimationFrame", {
  value: (id: number) => {
    frames.delete(id);
  },
});

function flushFrame() {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback(0));
}

function Harness() {
  const [open, setOpen] = useState(true);
  const { sheetRef, startDrag, moveDrag, endDrag, resetDrag, prepareClose } =
    useLaunchpadGestures(open, setOpen);
  return (
    <div>
      <div
        ref={sheetRef}
        role="dialog"
        data-state={open ? "open" : "closed"}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={resetDrag}
      />
      <button
        onClick={() => {
          prepareClose();
          setOpen(false);
        }}
      >
        Close
      </button>
    </div>
  );
}

function setup() {
  const view = render(<Harness />);
  const sheet = view.getByRole("dialog");
  sheet.setPointerCapture = mock(() => {});
  sheet.hasPointerCapture = () => false;
  sheet.releasePointerCapture = mock(() => {});
  return { view, sheet };
}

function pointer(
  sheet: HTMLElement,
  type: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel",
  x: number,
  y = 100,
) {
  fireEvent[type](sheet, {
    pointerId: 1,
    isPrimary: true,
    button: 0,
    clientX: x,
    clientY: y,
  });
}

afterEach(() => {
  cleanup();
  frames.clear();
  mock.restore();
});

test("swipe movement uses the latest position once per animation frame", () => {
  const { sheet } = setup();
  pointer(sheet, "pointerDown", 100);
  pointer(sheet, "pointerMove", 120);
  pointer(sheet, "pointerMove", 150);
  expect(frames.size).toBe(1);
  expect(sheet.style.transform).toBe("");
  flushFrame();
  expect(sheet.style.transform).toBe("translate3d(50px, 0, 0)");
  expect(sheet.style.translate).toBe("");
});

test("dismissal starts from the painted drag position and cancels pending movement", () => {
  const { sheet } = setup();
  pointer(sheet, "pointerDown", 100);
  pointer(sheet, "pointerMove", 190);
  flushFrame();
  pointer(sheet, "pointerMove", 220);
  pointer(sheet, "pointerUp", 220);
  expect(sheet.dataset.state).toBe("closed");
  expect(sheet.style.getPropertyValue("--launchpad-exit-transform")).toBe(
    "translate3d(90px, 0, 0)",
  );
  expect(sheet.style.transform).toBe("translate3d(90px, 0, 0)");
  expect(frames.size).toBe(0);
});

test("closing during a drag preserves its position instead of snapping back", () => {
  const { view, sheet } = setup();
  pointer(sheet, "pointerDown", 100);
  pointer(sheet, "pointerMove", 140);
  flushFrame();
  fireEvent.click(view.getByRole("button", { name: "Close" }));
  expect(sheet.style.getPropertyValue("--launchpad-exit-transform")).toBe(
    "translate3d(40px, 0, 0)",
  );
  expect(sheet.style.transform).toBe("translate3d(40px, 0, 0)");
});

test("a cancelled drag discards queued movement and animates back", () => {
  const { sheet } = setup();
  pointer(sheet, "pointerDown", 100);
  pointer(sheet, "pointerMove", 140);
  pointer(sheet, "pointerCancel", 140);
  expect(frames.size).toBe(0);
  flushFrame();
  expect(sheet.style.transform).toBe("translate3d(0, 0, 0)");
  expect(sheet.style.transition).toBe("transform 180ms ease-out");
});

test("starting a drag preserves an interrupted animation until the next frame", () => {
  const { sheet } = setup();
  sheet.style.transform = "matrix(1, 0, 0, 1, 35, 0)";
  pointer(sheet, "pointerDown", 100);
  pointer(sheet, "pointerMove", 130);
  expect(sheet.style.transform).toBe("matrix(1, 0, 0, 1, 35, 0)");
  expect(sheet.style.animation).toBe("none");
  flushFrame();
  expect(sheet.style.transform).toBe("translate3d(65px, 0, 0)");
});

test("reduced motion disables the snap-back transition", () => {
  const media = browser.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", { value: true });
  spyOn(browser, "matchMedia").mockReturnValue(media);
  const { sheet } = setup();
  pointer(sheet, "pointerDown", 100);
  pointer(sheet, "pointerMove", 140);
  pointer(sheet, "pointerCancel", 140);
  expect(sheet.style.transition).toBe("none");
  expect(frames.size).toBe(0);
});

test("vertical scrolling does not move the sheet", () => {
  const { sheet } = setup();
  pointer(sheet, "pointerDown", 100);
  pointer(sheet, "pointerMove", 105, 140);
  expect(frames.size).toBe(0);
  expect(sheet.style.transform).toBe("");
});

test("unmounting cancels the pending drag frame", () => {
  const { view, sheet } = setup();
  pointer(sheet, "pointerDown", 100);
  pointer(sheet, "pointerMove", 140);
  expect(frames.size).toBe(1);
  view.unmount();
  expect(frames.size).toBe(0);
});
