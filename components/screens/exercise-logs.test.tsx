import {
  afterEach,
  beforeEach,
  expect,
  mock,
  setSystemTime,
  test,
} from "bun:test";
import { Window } from "happy-dom";
import type { ComponentProps } from "react";
import type { Exercise, ExerciseLog } from "@/lib/types";

const browser = new Window({ url: "http://localhost" });
for (const name of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "HTMLInputElement",
  "Element",
  "Node",
  "NodeFilter",
  "DocumentFragment",
  "MutationObserver",
  "CustomEvent",
  "Event",
  "getComputedStyle",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? browser : browser[name],
  });
}

const push = mock(() => {});
let searchParams = new URLSearchParams();
mock.module("@/components/app-navigation", () => ({
  useAppRouter: () => ({ push }),
  useAppSearchParams: () => searchParams,
  AppLink: (props: ComponentProps<"a">) => <a {...props} />,
}));

const { cleanup, fireEvent, render } =
  await import("@testing-library/react");
const { useStore } = await import("@/lib/store");
const { default: ExerciseLogsPage } = await import("./exercise-logs");

const today = new Date(2026, 9, 4, 12);
const exercise: Exercise = {
  id: "bench",
  name: "Bench press",
  workoutId: "push",
  position: 0,
  weight: 70,
  sets: 4,
  logging: true,
  notes: "",
  step: 2.5,
  createdAt: today.toISOString(),
  updatedAt: today.toISOString(),
};

function log(
  id: string,
  day: number,
  weight: number,
  reps: number,
): ExerciseLog {
  const timestamp = new Date(2026, 10, day, 12).toISOString();
  return {
    id,
    exerciseId: exercise.id,
    workoutId: exercise.workoutId,
    weight,
    reps,
    performedAt: timestamp,
    createdAt: timestamp,
  };
}

beforeEach(async () => {
  browser.localStorage.clear();
  useStore.getState().clearData();
  useStore.setState({
    workouts: [
      {
        id: "push",
        name: "Push",
        exercises: [exercise],
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
    ],
    exerciseLogs: [
      log("a", 3, 70, 7),
      log("b", 3, 70, 7),
      log("c", 3, 70, 7),
      log("d", 1, 60, 8),
      log("e", 1, 70, 6),
    ],
  });
  await useStore.persist.rehydrate();
  searchParams = new URLSearchParams();
});

afterEach(() => {
  cleanup();
  setSystemTime();
});

test("summarizes each day newest first with set counts, total reps and weight ranges", () => {
  const view = render(<ExerciseLogsPage exerciseId={exercise.id} />);
  const summaries = view.container.querySelectorAll("summary");
  expect(summaries).toHaveLength(2);
  expect(summaries[0].textContent).toBe("3 Nov 20263 sets · 21 reps70 kg");
  expect(summaries[1].textContent).toBe("1 Nov 20262 sets · 14 reps60–70 kg");
  expect(view.container.querySelector("details")?.open).toBe(false);
});

test("reps-only days omit weight", () => {
  useStore.setState({ exerciseLogs: [log("bodyweight", 3, 0, 12)] });
  const view = render(<ExerciseLogsPage exerciseId={exercise.id} />);
  expect(view.container.querySelector("summary")?.textContent).toBe(
    "3 Nov 20261 set · 12 reps",
  );
});

test("select mode opens the individual sets and retains set selection", () => {
  searchParams = new URLSearchParams("select=1");
  const view = render(<ExerciseLogsPage exerciseId={exercise.id} />);
  expect(
    [...view.container.querySelectorAll("details")].every(
      (details) => details.open,
    ),
  ).toBe(true);
  const set = view.getByRole("button", { name: "Set 2: 7 reps, 70 kg" });
  fireEvent.click(set);
  expect(set.getAttribute("aria-pressed")).toBe("true");
  expect(view.getByRole("button", { name: "Delete selected" })).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Clear" }));
  expect(set.getAttribute("aria-pressed")).toBe("false");
});
