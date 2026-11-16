import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import type { ComponentProps } from "react";

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

mock.module("@/components/app-navigation", () => ({
  AppLink: (props: ComponentProps<"a">) => <a {...props} />,
}));

const { act, cleanup, fireEvent, render } =
  await import("@testing-library/react");
const { useStore } = await import("@/lib/store");
const { CreateWorkoutDialog } = await import("./create-workout-dialog");
const { EditWorkoutDialog } = await import("./edit-workout-dialog");
const { default: Home } = await import("./screens/home");

beforeEach(() => {
  browser.localStorage.clear();
  useStore.getState().clearData();
});
afterEach(cleanup);

test("a chosen icon is created, queued, displayed, and restored from local storage", async () => {
  const view = render(
    <>
      <CreateWorkoutDialog />
      <Home />
    </>,
  );
  fireEvent.click(view.getByRole("button", { name: "Create Workout" }));
  expect(
    (view.getByRole("radio", { name: "Dumbbell" }) as HTMLInputElement).checked,
  ).toBe(true);
  fireEvent.change(view.getByLabelText("Workout name"), {
    target: { value: "Push" },
  });
  fireEvent.click(view.getByRole("radio", { name: "Chest" }));
  fireEvent.click(view.getByRole("button", { name: "Create" }));

  expect(useStore.getState().workouts[0]).toMatchObject({
    name: "Push",
    icon: "chest",
  });
  expect(useStore.getState().pendingSyncOperations[0]).toMatchObject({
    type: "addWorkout",
    workout: { icon: "chest" },
  });
  expect(
    view
      .getByRole("link", { name: "Push" })
      .querySelector('[data-workout-icon="chest"]'),
  ).toBeTruthy();

  const saved = localStorage.getItem("store");
  expect(saved).toBeTruthy();
  await act(async () => {
    // Clear only in-memory data, then restore the persisted snapshot.
    useStore.setState({ workouts: [] });
    localStorage.setItem("store", saved!);
    await useStore.persist.rehydrate();
  });
  expect(useStore.getState().workouts[0].icon).toBe("chest");

  fireEvent.click(view.getByRole("button", { name: "Create Workout" }));
  expect(
    (view.getByRole("radio", { name: "Dumbbell" }) as HTMLInputElement).checked,
  ).toBe(true);
});

test("editing a legacy workout defaults to dumbbell, discards cancelled choices, and saves the selected icon", () => {
  const timestamp = new Date().toISOString();
  useStore.setState({
    workouts: [{
      id: "legs",
      name: "Legs",
      exercises: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    }],
  });
  const view = render(
    <EditWorkoutDialog id="legs" trigger={<button>Edit Legs</button>} />,
  );
  fireEvent.click(view.getByRole("button", { name: "Edit Legs" }));
  expect(
    (view.getByRole("radio", { name: "Dumbbell" }) as HTMLInputElement).checked,
  ).toBe(true);
  fireEvent.click(view.getByRole("radio", { name: "Legs" }));
  fireEvent.click(view.getByRole("button", { name: "Close" }));
  expect(useStore.getState().pendingSyncOperations).toHaveLength(0);

  fireEvent.click(view.getByRole("button", { name: "Edit Legs" }));
  expect(
    (view.getByRole("radio", { name: "Dumbbell" }) as HTMLInputElement).checked,
  ).toBe(true);
  fireEvent.click(view.getByRole("radio", { name: "Legs" }));
  fireEvent.click(view.getByRole("button", { name: "Save" }));
  expect(useStore.getState().workouts[0]).toMatchObject({
    name: "Legs",
    icon: "legs",
  });
  expect(useStore.getState().pendingSyncOperations[0]).toMatchObject({
    type: "editWorkout",
    workout: { icon: "legs" },
  });

  fireEvent.click(view.getByRole("button", { name: "Edit Legs" }));
  expect(
    (view.getByRole("radio", { name: "Legs" }) as HTMLInputElement).checked,
  ).toBe(true);
});
