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
mock.module("@/components/app-navigation", () => ({
  useAppRouter: () => ({ push }),
  AppLink: (props: ComponentProps<"a">) => <a {...props} />,
}));

const { act, cleanup, fireEvent, render } =
  await import("@testing-library/react");
const { useStore } = await import("@/lib/store");
const { default: ExercisePage } = await import("./exercise");

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
  performedAt = today,
  exerciseId = exercise.id,
): ExerciseLog {
  return {
    id,
    exerciseId,
    workoutId: exercise.workoutId,
    reps: 8,
    weight: 70,
    performedAt: performedAt.toISOString(),
    createdAt: performedAt.toISOString(),
  };
}

beforeEach(async () => {
  // Freeze calendar time while keeping React and debounce timers running.
  setSystemTime(today);
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
    exerciseLogs: [],
  });
  await useStore.persist.rehydrate();
  push.mockClear();
});

afterEach(() => {
  cleanup();
  setSystemTime();
});

function currentSet(view: ReturnType<typeof render>) {
  return (view.getByLabelText("Current set") as HTMLInputElement).value;
}

test("reopening an exercise resumes after the sets already logged today", () => {
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  fireEvent.click(view.getByRole("button", { name: "Next set" }));
  fireEvent.click(view.getByRole("button", { name: "Yes" }));
  expect(currentSet(view)).toBe("2");
  view.unmount();

  const reopened = render(<ExercisePage exerciseId={exercise.id} />);
  expect(currentSet(reopened)).toBe("2");
});

test("only this exercise's logs on the local calendar day count", () => {
  useStore.setState({
    exerciseLogs: [
      log("today-1"),
      log("today-2"),
      log("yesterday", new Date(2026, 9, 3, 23, 59)),
      log("tomorrow", new Date(2026, 9, 5, 0, 0)),
      log("other-exercise", today, "squat"),
    ],
  });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  expect(currentSet(view)).toBe("3");
});

test("completed exercises stay within their configured number of sets", () => {
  useStore.setState({
    exerciseLogs: Array.from({ length: 5 }, (_, i) => log(`set-${i}`)),
  });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  expect(currentSet(view)).toBe("4");
});

test("switching exercises restores each exercise's progress", () => {
  useStore.setState({
    workouts: [
      {
        id: "push",
        name: "Push",
        exercises: [exercise, { ...exercise, id: "fly", position: 1 }],
        createdAt: today.toISOString(),
        updatedAt: today.toISOString(),
      },
    ],
    exerciseLogs: [
      log("bench-1"),
      log("fly-1", today, "fly"),
      log("fly-2", today, "fly"),
    ],
  });
  const view = render(<ExercisePage exerciseId="bench" />);
  expect(currentSet(view)).toBe("2");
  view.rerender(<ExercisePage exerciseId="fly" />);
  expect(currentSet(view)).toBe("3");
  view.rerender(<ExercisePage exerciseId="bench" />);
  expect(currentSet(view)).toBe("2");
});

test("manual previous and skipped sets still work", () => {
  useStore.setState({ exerciseLogs: [log("set-1"), log("set-2")] });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  expect(currentSet(view)).toBe("3");
  fireEvent.click(view.getByRole("button", { name: "Previous set" }));
  expect(currentSet(view)).toBe("2");
  fireEvent.click(view.getByRole("button", { name: "Next set" }));
  fireEvent.click(view.getByRole("button", { name: "No" }));
  expect(currentSet(view)).toBe("3");
  expect(useStore.getState().exerciseLogs).toHaveLength(2);
});

test.each(["Yes", "No"])(
  "a weight suggestion advances the logged set only once on %s",
  (answer) => {
    useStore.setState({
      workouts: [
        {
          id: "push",
          name: "Push",
          exercises: [{ ...exercise, maxReps: 8 }],
          createdAt: today.toISOString(),
          updatedAt: today.toISOString(),
        },
      ],
      exerciseLogs: [log("set-1")],
    });
    const view = render(<ExercisePage exerciseId={exercise.id} />);
    fireEvent.click(view.getByRole("button", { name: "Next set" }));
    fireEvent.click(view.getByRole("button", { name: "Yes" }));
    expect(view.getByText("Weight suggestion")).toBeDefined();
    fireEvent.click(view.getByRole("button", { name: answer }));
    expect(currentSet(view)).toBe("3");
    expect(useStore.getState().exerciseLogs).toHaveLength(2);
    expect(useStore.getState().getExerciseById(exercise.id)?.weight).toBe(
      answer === "Yes" ? 72.5 : 70,
    );
  },
);

test("logs loaded after the screen mounts restore the set counter", async () => {
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  expect(currentSet(view)).toBe("1");
  await act(async () => {
    useStore.getState().replaceExerciseLogs([log("set-1"), log("set-2")]);
  });
  expect(currentSet(view)).toBe("3");
});

test("restoring saved browser data resumes today's progress", async () => {
  const persisted = JSON.parse(browser.localStorage.getItem("store")!);
  persisted.state.exerciseLogs = [log("saved-1"), log("saved-2")];
  browser.localStorage.setItem("store", JSON.stringify(persisted));
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  await act(async () => {
    await useStore.persist.rehydrate();
  });
  expect(currentSet(view)).toBe("3");
});

test("logging the final restored set finishes the exercise", () => {
  useStore.setState({
    exerciseLogs: [log("set-1"), log("set-2"), log("set-3")],
  });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  fireEvent.click(view.getByRole("button", { name: "Next set" }));
  fireEvent.click(view.getByRole("button", { name: "Yes" }));
  expect(useStore.getState().exerciseLogs).toHaveLength(4);
  expect(push).toHaveBeenCalledWith("/w/push");
});

test("exercises with logging disabled still start at set one", () => {
  useStore.getState().editExercise({ ...exercise, logging: false });
  useStore.setState({ exerciseLogs: [log("set-1"), log("set-2")] });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  expect(currentSet(view)).toBe("1");
  fireEvent.click(view.getByRole("button", { name: "Next set" }));
  expect(currentSet(view)).toBe("2");
});

test("a new local calendar day resets manual progress", () => {
  useStore.setState({ exerciseLogs: [log("set-1"), log("set-2")] });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  fireEvent.click(view.getByRole("button", { name: "Previous set" }));
  setSystemTime(new Date(2026, 9, 5, 0, 0));
  view.rerender(<ExercisePage exerciseId={exercise.id} />);
  expect(currentSet(view)).toBe("1");
});

test("weight and notes are persisted before leaving the exercise", () => {
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  fireEvent.click(view.getByRole("button", { name: "Increase weight" }));
  fireEvent.change(view.getByLabelText("Notes"), {
    target: { value: "Keep elbows tucked" },
  });
  view.unmount();

  const persisted = JSON.parse(browser.localStorage.getItem("store")!);
  expect(persisted.state.workouts[0].exercises[0]).toMatchObject({
    weight: 72.5,
    notes: "Keep elbows tucked",
  });
});

test("switching exercises cannot copy edits or open dialogs to the next exercise", () => {
  const other = {
    ...exercise,
    id: "fly",
    name: "Chest fly",
    position: 1,
    weight: 20,
  };
  useStore.setState({
    workouts: [
      {
        ...useStore.getState().workouts[0],
        exercises: [exercise, other],
      },
    ],
  });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  fireEvent.click(view.getByRole("button", { name: "Increase weight" }));
  fireEvent.click(view.getByRole("button", { name: "Next set" }));
  view.rerender(<ExercisePage exerciseId={other.id} />);

  expect(view.queryByText("Track reps?")).toBeNull();
  expect((view.getByLabelText("Weight") as HTMLInputElement).value).toBe("20");
  expect(useStore.getState().getExerciseById(exercise.id)?.weight).toBe(72.5);
  expect(useStore.getState().getExerciseById(other.id)?.weight).toBe(20);
});

test("negative weights cannot enter the store or set logs", () => {
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  fireEvent.change(view.getByLabelText("Weight"), { target: { value: "-10" } });
  fireEvent.click(view.getByRole("button", { name: "Next set" }));
  fireEvent.click(view.getByRole("button", { name: "Yes" }));
  expect(useStore.getState().getExerciseById(exercise.id)?.weight).toBe(70);
  expect(useStore.getState().exerciseLogs[0].weight).toBe(70);
});

test("editing exercise options preserves weight and notes received while the dialog is open", async () => {
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  fireEvent.click(view.getByRole("button", { name: "Edit" }));
  await act(async () => {
    useStore
      .getState()
      .editExercise({ ...exercise, weight: 80, notes: "Synced note" });
  });
  fireEvent.change(view.getByLabelText("Name"), {
    target: { value: "Incline bench" },
  });
  fireEvent.click(view.getByRole("radio", { name: "Chest" }));
  fireEvent.click(view.getByRole("button", { name: "Save" }));
  expect(useStore.getState().getExerciseById(exercise.id)).toMatchObject({
    name: "Incline bench",
    icon: "chest",
    weight: 80,
    notes: "Synced note",
  });
  expect(
    view
      .getByRole("heading", { name: "Incline bench" })
      .querySelector('[data-workout-icon="chest"]'),
  ).toBeTruthy();

  fireEvent.click(view.getByRole("button", { name: "Edit" }));
  fireEvent.click(view.getByRole("radio", { name: "Legs" }));
  fireEvent.click(view.getByRole("button", { name: "Close" }));
  expect(useStore.getState().getExerciseById(exercise.id)?.icon).toBe("chest");
  fireEvent.click(view.getByRole("button", { name: "Edit" }));
  expect(
    (view.getByRole("radio", { name: "Chest" }) as HTMLInputElement).checked,
  ).toBe(true);
});

test("decimal weight steps do not accumulate floating point errors", () => {
  useStore.getState().editExercise({ ...exercise, weight: 0.2, step: 0.1 });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  fireEvent.click(view.getByRole("button", { name: "Increase weight" }));
  expect(useStore.getState().getExerciseById(exercise.id)?.weight).toBe(0.3);
});

test("pound input, increments, suggestions and set logs share the same stored weight", () => {
  useStore.getState().setWeightUnit("lb");
  useStore.getState().editExercise({ ...exercise, step: 2.267962, maxReps: 8 });
  const view = render(<ExercisePage exerciseId={exercise.id} />);
  const weight = view.getByLabelText("Weight") as HTMLInputElement;
  fireEvent.change(weight, { target: { value: "135" } });
  expect(weight.value).toBe("135");
  fireEvent.click(view.getByRole("button", { name: "Increase weight" }));
  expect(weight.value).toBe("140");
  fireEvent.click(view.getByRole("button", { name: "Decrease weight" }));
  expect(weight.value).toBe("135");
  fireEvent.click(view.getByRole("button", { name: "Next set" }));
  fireEvent.click(view.getByRole("button", { name: "Yes" }));

  expect(view.getByText(/from 135 lb to 140 lb/)).toBeTruthy();
  expect(useStore.getState().exerciseLogs[0].weight).toBe(61.23497);
  fireEvent.click(view.getByRole("button", { name: "Yes" }));
  expect(weight.value).toBe("140");
  const stored = useStore.getState().getExerciseById(exercise.id)?.weight;
  expect(stored).toBe(63.502932);
  act(() => useStore.getState().setWeightUnit("kg"));
  expect(weight.value).toBe("63.5");
  expect(useStore.getState().getExerciseById(exercise.id)?.weight).toBe(stored);
});
