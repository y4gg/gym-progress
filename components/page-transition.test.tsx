import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { useEffect } from "react";

const browser = new Window({ url: "http://localhost" });
for (const name of ["window", "document", "navigator", "HTMLElement"] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? browser : browser[name],
  });
}

let pathname = "/";
let reducedMotion = false;
Object.defineProperty(browser, "matchMedia", {
  configurable: true,
  value: () => ({ matches: reducedMotion }),
});
mock.module("@/components/app-navigation", () => ({
  useAppPathname: () => pathname,
}));

type TestAnimation = { playState: string; cancel: ReturnType<typeof mock> };
const animations: TestAnimation[] = [];
const animate = mock<
  (frames: Keyframe[], options: KeyframeAnimationOptions) => TestAnimation
>(() => {
  const animation = { playState: "running", cancel: mock(() => {}) };
  animations.push(animation);
  return animation;
});
Object.defineProperty(browser.HTMLElement.prototype, "animate", {
  configurable: true,
  value: animate,
});

const { cleanup, render } = await import("@testing-library/react");
const { PageTransition } = await import("./page-transition");

beforeEach(() => {
  pathname = "/";
  animations.length = 0;
  animate.mockClear();
  reducedMotion = false;
});

afterEach(cleanup);

test("starts the incoming page animation before passive effects can expose a settled frame", () => {
  const animationCounts: number[] = [];
  function Screen({ path }: { path: string }) {
    useEffect(() => {
      animationCounts.push(animate.mock.calls.length);
    }, [path]);
    return <main>{path}</main>;
  }
  const view = render(
    <PageTransition>
      <Screen path={pathname} />
    </PageTransition>,
  );
  expect(animationCounts).toEqual([0]);

  pathname = "/w/push";
  view.rerender(
    <PageTransition>
      <Screen path={pathname} />
    </PageTransition>,
  );
  expect(animationCounts).toEqual([0, 1]);
});

test("leaves initial loads and updates on the same route still", () => {
  const view = render(<PageTransition>Home</PageTransition>);
  view.rerender(<PageTransition>Updated home</PageTransition>);
  expect(animate).not.toHaveBeenCalled();
});

test("quick navigation continues from the visible frame instead of jumping back", () => {
  const view = render(<PageTransition>Home</PageTransition>);
  pathname = "/w/push";
  view.rerender(<PageTransition>Push</PageTransition>);

  // Stand in for the browser's computed styles halfway through the animation.
  const container = view.container.firstElementChild as HTMLDivElement;
  container.style.opacity = "0.6";
  container.style.transform = "matrix(1, 0, 0, 1, 0, 5)";
  pathname = "/e/bench";
  view.rerender(<PageTransition>Bench</PageTransition>);

  expect(animations[0].cancel).toHaveBeenCalledTimes(1);
  expect(animate.mock.calls[1][0][0]).toEqual({
    opacity: "0.6",
    transform: "matrix(1, 0, 0, 1, 0, 5)",
  });
});

test("respects reduced motion and cancels an animation on unmount", () => {
  const view = render(<PageTransition>Home</PageTransition>);
  pathname = "/w/push";
  view.rerender(<PageTransition>Push</PageTransition>);
  expect(animate).toHaveBeenCalledTimes(1);

  reducedMotion = true;
  pathname = "/e/bench";
  view.rerender(<PageTransition>Bench</PageTransition>);
  expect(animations[0].cancel).toHaveBeenCalledTimes(1);
  expect(animate).toHaveBeenCalledTimes(1);

  reducedMotion = false;
  pathname = "/";
  view.rerender(<PageTransition>Home</PageTransition>);
  view.unmount();
  expect(animations[1].cancel).toHaveBeenCalledTimes(1);
});
