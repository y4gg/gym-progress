import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import type { ComponentProps } from "react";
import type { Exercise, Workout } from "@/lib/types";

const browser = new Window({ url: "http://localhost" });
for (const name of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLFormElement",
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

const push = mock();
mock.module("@/components/app-navigation", () => ({
  useAppRouter: () => ({ push }),
  AppLink: (props: ComponentProps<"a">) => <a {...props} />,
}));

const { act, cleanup, fireEvent, render } =
  await import("@testing-library/react");
const { useStore } = await import("@/lib/store");
const { default: WorkoutOverview } = await import("./workout");
const { default: CreateExercisePage } = await import("./create-exercise");
const { TrainingSettings } = await import("./settings");

const timestamp = new Date().toISOString();
const exercise: Exercise = {
  id: "bench",
  name: "Bench press",
  workoutId: "push",
  position: 0,
  weight: 70,
  sets: 3,
  logging: true,
  notes: "",
  step: 2.5,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const workout: Workout = {
  id: "push",
  name: "Push",
  exercises: [
    exercise,
    { ...exercise, id: "fly", name: "Chest fly", position: 1 },
  ],
  createdAt: timestamp,
  updatedAt: timestamp,
};

beforeEach(async () => {
  browser.localStorage.clear();
  useStore.getState().clearData();
  useStore.setState({
    trainingDefaults: { sets: 3, step: 2.5, logging: true },
    workouts: [
      workout,
      { ...workout, id: "pull", name: "Pull", exercises: [] },
    ],
  });
  await useStore.persist.rehydrate();
  push.mockClear();
});
afterEach(cleanup);

test("switching workouts ends the previous workout's sorting session", () => {
  const view = render(<WorkoutOverview id="push" />);
  fireEvent.click(view.getByRole("button", { name: "Sort exercises" }));
  view.rerender(<WorkoutOverview id="pull" />);
  expect(view.queryByRole("button", { name: "Done" })).toBeNull();
  expect(view.getByRole("button", { name: "Sort exercises" })).toBeTruthy();
});

test("sorting includes exercises added through sync while the draft is open", async () => {
  const view = render(<WorkoutOverview id="push" />);
  fireEvent.click(view.getByRole("button", { name: "Sort exercises" }));
  await act(async () => {
    useStore.getState().addExercise({
      ...exercise,
      id: "press",
      name: "Shoulder press",
      icon: "shoulders",
      position: 8,
    });
  });
  expect(
    view.getByRole("button", { name: "Drag Shoulder press" }),
  ).toBeTruthy();
  expect(
    view
      .getByRole("button", { name: "Drag Shoulder press" })
      .parentElement?.querySelector('[data-workout-icon="shoulders"]'),
  ).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Done" }));
  expect(
    useStore
      .getState()
      .getWorkoutById("push")
      ?.exercises.map(({ id, position }) => [id, position]),
  ).toEqual([
    ["bench", 0],
    ["fly", 1],
    ["press", 2],
  ]);
});

test("switching create routes resets the draft and persists the new exercise's icon", async () => {
  const view = render(<CreateExercisePage id="push" />);
  fireEvent.change(view.getByLabelText("Exercise name"), {
    target: { value: "Wrong draft" },
  });
  fireEvent.click(view.getByRole("radio", { name: "Chest" }));
  view.rerender(<CreateExercisePage id="pull" />);
  expect((view.getByLabelText("Exercise name") as HTMLInputElement).value).toBe(
    "",
  );
  expect(
    (view.getByRole("radio", { name: "Dumbbell" }) as HTMLInputElement).checked,
  ).toBe(true);
  fireEvent.change(view.getByLabelText("Exercise name"), {
    target: { value: "  Pull ups  " },
  });
  fireEvent.click(view.getByRole("radio", { name: "Back" }));
  fireEvent.submit(view.container.querySelector("form")!);
  expect(
    useStore.getState().getWorkoutById("pull")?.exercises[0],
  ).toMatchObject({ name: "Pull ups", workoutId: "pull", icon: "back" });
  expect(useStore.getState().getWorkoutById("push")?.exercises).toHaveLength(2);
  expect(useStore.getState().pendingSyncOperations[0]).toMatchObject({
    type: "addExercise",
    exercise: { icon: "back" },
  });

  const saved = localStorage.getItem("store");
  expect(saved).toBeTruthy();
  await act(async () => {
    useStore.setState({ workouts: [] });
    localStorage.setItem("store", saved!);
    await useStore.persist.rehydrate();
  });
  expect(useStore.getState().getWorkoutById("pull")?.exercises[0].icon).toBe(
    "back",
  );
  view.rerender(<WorkoutOverview id="pull" />);
  expect(
    view
      .getByRole("link", { name: "Pull ups" })
      .querySelector('[data-workout-icon="back"]'),
  ).toBeTruthy();
});

test("clearing the optional weight step stores the default and whitespace names are rejected", () => {
  const view = render(<CreateExercisePage id="pull" />);
  fireEvent.change(view.getByLabelText("Exercise name"), {
    target: { value: "    " },
  });
  fireEvent.submit(view.container.querySelector("form")!);
  expect(useStore.getState().getWorkoutById("pull")?.exercises).toHaveLength(0);

  fireEvent.change(view.getByLabelText("Exercise name"), {
    target: { value: "Pull ups" },
  });
  fireEvent.click(view.getByRole("button", { name: "Advanced" }));
  fireEvent.change(view.getByLabelText("Weight step"), {
    target: { value: "" },
  });
  fireEvent.click(view.getByRole("button", { name: "Close" }));
  fireEvent.submit(view.container.querySelector("form")!);
  expect(useStore.getState().getWorkoutById("pull")?.exercises[0].step).toBe(
    2.5,
  );
});

test("a weight step that would round to zero in PostgreSQL cannot be saved", () => {
  const view = render(<CreateExercisePage id="pull" />);
  fireEvent.change(view.getByLabelText("Exercise name"), {
    target: { value: "Pull ups" },
  });
  fireEvent.click(view.getByRole("button", { name: "Advanced" }));
  fireEvent.change(view.getByLabelText("Weight step"), {
    target: { value: "0.001" },
  });
  fireEvent.click(view.getByRole("button", { name: "Close" }));
  fireEvent.submit(view.container.querySelector("form")!);
  expect(useStore.getState().getWorkoutById("pull")?.exercises).toHaveLength(0);
});

test("saved training defaults survive hydration and apply to new exercises", async () => {
  const view = render(<TrainingSettings />);
  const form = view.container.querySelector("form")!;
  const sets = view.getByLabelText("Default sets");
  const step = view.getByLabelText("Default weight increment (kg)");
  fireEvent.change(sets, { target: { value: "0" } });
  fireEvent.change(step, { target: { value: "0.001" } });
  fireEvent.submit(form);
  expect(view.getAllByRole("alert")).toHaveLength(2);
  expect(useStore.getState().trainingDefaults).toEqual({ sets: 3, step: 2.5, logging: true });

  fireEvent.click(view.getByRole("switch", { name: "Default rep tracking" }));
  expect(useStore.getState().trainingDefaults.logging).toBe(false);
  fireEvent.change(sets, { target: { value: "5" } });
  fireEvent.change(step, { target: { value: "1.25" } });
  fireEvent.submit(form);

  const saved = localStorage.getItem("store")!;
  await act(async () => {
    useStore.setState({ trainingDefaults: { sets: 3, step: 2.5, logging: true } });
    localStorage.setItem("store", saved);
    await useStore.persist.rehydrate();
  });
  view.rerender(<CreateExercisePage id="push" />);
  fireEvent.change(view.getByLabelText("Exercise name"), {
    target: { value: "Dumbbell press" },
  });
  fireEvent.submit(view.container.querySelector("form")!);

  const exercises = useStore.getState().getWorkoutById("push")?.exercises;
  expect(exercises?.[0]).toMatchObject(exercise);
  expect(exercises?.[2]).toMatchObject({ sets: 5, step: 1.25, logging: false });
});
