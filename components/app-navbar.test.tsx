import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import type { ComponentProps } from "react";
import type { Exercise } from "@/lib/types";

const browser = new Window({ url: "http://localhost" });
for (const name of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "Element",
  "Node",
  "Event",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? browser : browser[name],
  });
}

let pathname = "/";
mock.module("@/components/app-navigation", () => ({
  useAppPathname: () => pathname,
  AppLink: (props: ComponentProps<"a">) => <a {...props} />,
}));
mock.module("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}));
mock.module("@/components/navigation-menu", () => ({
  NavigationMenu: () => <nav aria-label="Menu contents" />,
}));
mock.module("@/components/launchpad", () => ({
  Launchpad: ({ triggerClassName }: { triggerClassName?: string }) => (
    <button className={triggerClassName}>Menu</button>
  ),
}));

const { cleanup, render, within } = await import("@testing-library/react");
const { useStore } = await import("@/lib/store");
const { AppNavbar } = await import("./app-navbar");

const timestamp = new Date().toISOString();
const exercise: Exercise = {
  id: "bench",
  name: "Bench press",
  workoutId: "push",
  position: 0,
  weight: 70,
  step: 2.5,
  sets: 3,
  logging: true,
  notes: "",
  createdAt: timestamp,
  updatedAt: timestamp,
};

beforeEach(async () => {
  pathname = "/";
  browser.localStorage.clear();
  useStore.getState().clearData();
  useStore.setState({
    workouts: [
      {
        id: "push",
        name: "Push",
        exercises: [exercise, { ...exercise, id: "fly", position: 1 }],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  });
  await useStore.persist.rehydrate();
});

afterEach(cleanup);

test.each([
  ["/e/bench", "Workout", "/w/push"],
  ["/w/push/create", "Workout", "/w/push"],
  ["/e/bench/history", "Exercise", "/e/bench"],
  ["/e/bench/logs/", "Exercise", "/e/bench"],
])("%s links directly to its parent in both navigation bars", (path, label, href) => {
  pathname = path;
  const view = render(<AppNavbar />);
  const mobile = within(view.getByRole("navigation", { name: "Primary" }));
  const desktop = within(
    view.getByRole("navigation", { name: "Workout navigation" }),
  );

  expect(mobile.getByRole("link", { name: label }).getAttribute("href")).toBe(href);
  expect(desktop.getByRole("link", { name: label }).getAttribute("href")).toBe(href);
  expect(mobile.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  expect(mobile.getByRole("button", { name: "Menu" })).toBeTruthy();
});

test.each(["/", "/w/push", "/account", "/e/missing", "/w/missing/create"])(
  "%s keeps the regular navigation without an unavailable parent",
  (path) => {
    pathname = path;
    const view = render(<AppNavbar />);
    const mobile = within(view.getByRole("navigation", { name: "Primary" }));
    expect(mobile.getAllByRole("link")).toHaveLength(1);
    expect(
      view.queryByRole("navigation", { name: "Workout navigation" }),
    ).toBeNull();
  },
);

test("switching screens updates the destination without retaining the previous exercise", () => {
  pathname = "/e/bench/logs";
  const view = render(<AppNavbar />);
  pathname = "/e/fly/history";
  view.rerender(<AppNavbar />);

  for (const name of ["Primary", "Workout navigation"]) {
    const navigation = within(view.getByRole("navigation", { name }));
    expect(
      navigation.getByRole("link", { name: "Exercise" }).getAttribute("href"),
    ).toBe("/e/fly");
  }

  pathname = "/e/fly";
  view.rerender(<AppNavbar />);
  const mobile = within(view.getByRole("navigation", { name: "Primary" }));
  expect(mobile.queryByRole("link", { name: "Exercise" })).toBeNull();
  expect(
    mobile.getByRole("link", { name: "Workout" }).getAttribute("href"),
  ).toBe("/w/push");
});
