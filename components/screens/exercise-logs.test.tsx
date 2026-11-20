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

const { act, cleanup, fireEvent, render } =
  await import("@testing-library/react");
const { useStore } = await import("@/lib/store");
const { default: ExerciseLogsPage } = await import("./exercise-logs");
const { default: ExerciseHistoryPage } = await import("./exercise-history");

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
    weightUnit: "kg",
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

test("pounds update logs and history without changing saved logs or rep totals", () => {
  useStore.getState().setWeightUnit("lb");
  const savedLogs = useStore.getState().exerciseLogs;
  searchParams = new URLSearchParams("select=1");
  const view = render(<ExerciseLogsPage exerciseId={exercise.id} />);
  expect(view.getByText("132.28–154.32 lb")).toBeTruthy();
  expect(view.getByRole("button", { name: "Set 2: 7 reps, 154.32 lb" })).toBeTruthy();

  view.rerender(<ExerciseHistoryPage exerciseId={exercise.id} />);
  expect(view.getByRole("img", { name: /Weight trend.*154\.32 lb/ })).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Volume" }));
  expect(view.getByRole("img", { name: /Volume trend.*3,240\.8 lb/ })).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Reps" }));
  expect(view.getByRole("img", { name: /Reps trend.*14 to 21 reps/ })).toBeTruthy();
  expect(useStore.getState().exerciseLogs).toBe(savedLogs);
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

test("changing exercises clears selections so another exercise's logs cannot be deleted", async () => {
  searchParams = new URLSearchParams("select=1");
  await act(async () => {
    useStore.setState({
      workouts: [
        {
          ...useStore.getState().workouts[0],
          exercises: [exercise, { ...exercise, id: "fly", position: 1 }],
        },
      ],
      exerciseLogs: [
        ...useStore.getState().exerciseLogs,
        { ...log("fly-set", 3, 20, 10), exerciseId: "fly" },
      ],
    });
  });
  const view = render(<ExerciseLogsPage exerciseId={exercise.id} />);
  fireEvent.click(view.getByRole("button", { name: "Set 2: 7 reps, 70 kg" }));
  view.rerender(<ExerciseLogsPage exerciseId="fly" />);
  expect(view.queryByRole("button", { name: "Delete selected" })).toBeNull();
  expect(
    view
      .getByRole("button", { name: "Set 1: 10 reps, 20 kg" })
      .getAttribute("aria-pressed"),
  ).toBe("false");
});
