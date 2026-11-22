import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { Window } from "happy-dom";
import type NextLink from "next/link";
import type { ComponentProps } from "react";

const browser = new Window({ url: "http://localhost:3000/offline" });
for (const name of [
  "window",
  "document",
  "navigator",
  "localStorage",
  "HTMLElement",
  "HTMLFormElement",
  "Node",
  "Event",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? browser : browser[name],
  });
}

let segment = "offline";
let serverPathname = "/offline";
const router = { push: mock(), replace: mock(), refresh: mock() };
mock.module("next/navigation", () => ({
  useSelectedLayoutSegment: () => segment,
  usePathname: () => serverPathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => router,
}));
mock.module("@/lib/use-store-hydrated", () => ({ useStoreHydrated: () => true }));
mock.module("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: null, isPending: false }) },
}));
mock.module("@/components/screens/home", () => ({
  default: () => <p>Workouts screen</p>,
}));
mock.module("@/components/screens/workout", () => ({
  default: ({ id }: { id: string }) => <p>Workout screen: {id}</p>,
}));
mock.module("@/components/screens/create-exercise", () => ({ default: () => null }));
mock.module("@/components/screens/exercise", () => ({ default: () => null }));
mock.module("@/components/screens/exercise-history", () => ({ default: () => null }));
mock.module("@/components/screens/exercise-logs", () => ({ default: () => null }));
mock.module("next/link", () => ({
  default: ({
    href,
    onNavigate,
    children,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
  }: ComponentProps<typeof NextLink>) => (
    <a
      href={href as string}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      onClick={(event) =>
        onNavigate?.({ preventDefault: () => event.preventDefault() })
      }
    >
      {children}
    </a>
  ),
}));

const { act, cleanup, fireEvent, render, within } =
  await import("@testing-library/react");
const { AppLink, AppNavigation, useAppPathname, useAppRouter, useAppSearchParams } =
  await import("./app-navigation");
const { AppNavbar } = await import("./app-navbar");
const { AppScreen } = await import("./offline-app");
const { NavigationMenu } = await import("./navigation-menu");
const { useStore } = await import("@/lib/store");

function RouterControls() {
  const appRouter = useAppRouter();
  const pathname = useAppPathname();
  const searchParams = useAppSearchParams();
  return (
    <>
      <output>{pathname}</output>
      <p data-testid="query">{searchParams.toString()}</p>
      <button onClick={() => appRouter.push("/e/bench", { scroll: false })}>
        Push
      </button>
      <button onClick={() => appRouter.replace("/e/bench", { scroll: false })}>
        Replace
      </button>
    </>
  );
}

beforeEach(() => {
  segment = "offline";
  serverPathname = "/offline";
  browser.history.replaceState(null, "", "/offline");
  Object.defineProperty(browser.navigator, "onLine", {
    configurable: true,
    value: true,
  });
  router.push.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
  useStore.getState().clearData();
  useStore.setState({ weightUnit: "kg" });
});
afterEach(() => {
  cleanup();
  mock.restore();
});

test("offline workout links keep their query and update the visible pathname", () => {
  const view = render(
    <AppNavigation>
      <AppLink href="/e/bench/logs?select=1">Logs</AppLink>
      <RouterControls />
    </AppNavigation>,
  );
  fireEvent.click(view.getByRole("link"));
  expect(browser.location.pathname).toBe("/e/bench/logs");
  expect(browser.location.search).toBe("?select=1");
  expect(view.getByRole("status").textContent).toBe("/e/bench/logs");
  expect(router.push).not.toHaveBeenCalled();
});

test("account links leave the offline shell so the server can render them after reconnecting", () => {
  const assign = spyOn(browser.location, "assign").mockImplementation(() => {});
  const view = render(
    <AppNavigation>
      <AppLink href="/login?next=%2Faccount">Login</AppLink>
    </AppNavigation>,
  );
  fireEvent.click(view.getByRole("link"));
  expect(assign).toHaveBeenCalledWith(
    "http://localhost:3000/login?next=%2Faccount",
  );
  expect(browser.location.pathname).toBe("/offline");
});

test("offline links honor cancelled navigation", () => {
  const view = render(
    <AppNavigation>
      <AppLink href="/e/bench" onNavigate={(event) => event.preventDefault()}>
        Bench
      </AppLink>
    </AppNavigation>,
  );
  fireEvent.click(view.getByRole("link"));
  expect(browser.location.pathname).toBe("/offline");
});

test("offline replacement links preserve history and disabled scrolling", () => {
  const replaceState = spyOn(browser.history, "replaceState");
  const pushState = spyOn(browser.history, "pushState");
  const scrollTo = spyOn(browser, "scrollTo");
  const view = render(
    <AppNavigation>
      <AppLink href="/e/bench" replace scroll={false}>
        Bench
      </AppLink>
    </AppNavigation>,
  );
  fireEvent.click(view.getByRole("link"));
  expect(replaceState).toHaveBeenCalledTimes(1);
  expect(pushState).not.toHaveBeenCalled();
  expect(scrollTo).not.toHaveBeenCalled();
});

test("the offline router preserves replacement and scroll behavior", () => {
  const replaceState = spyOn(browser.history, "replaceState");
  const scrollTo = spyOn(browser, "scrollTo");
  const view = render(
    <AppNavigation>
      <RouterControls />
    </AppNavigation>,
  );
  fireEvent.click(view.getByRole("button", { name: "Replace" }));
  expect(replaceState).toHaveBeenCalledTimes(1);
  expect(scrollTo).not.toHaveBeenCalled();
  expect(browser.location.pathname).toBe("/e/bench");
});

test("the account router preserves navigation options", () => {
  segment = "(account)";
  serverPathname = "/account";
  const view = render(
    <AppNavigation>
      <RouterControls />
    </AppNavigation>,
  );
  fireEvent.click(view.getByRole("button", { name: "Push" }));
  fireEvent.click(view.getByRole("button", { name: "Replace" }));
  expect(router.push).toHaveBeenCalledWith("/e/bench", { scroll: false });
  expect(router.replace).toHaveBeenCalledWith("/e/bench", { scroll: false });
});

test.each([true, false])(
  "a server-rendered workout page navigates locally before any network timeout (onLine: %s)",
  (online) => {
    segment = "home";
    serverPathname = "/";
    browser.history.replaceState(null, "", "/");
    Object.defineProperty(browser.navigator, "onLine", {
      configurable: true,
      value: online,
    });
    const timestamp = "2026-11-16T10:00:00.000Z";
    useStore.setState({
      syncStatus: online ? "synced" : "offline",
      workouts: [{
        id: "saved",
        name: "Saved",
        exercises: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      }],
    });
    const assign = spyOn(browser.location, "assign").mockImplementation(() => {});
    const view = render(
      <AppNavigation>
        <AppLink href="/w/saved?test=1">Workout</AppLink>
        <AppScreen>
          <p>Server screen</p>
        </AppScreen>
        <RouterControls />
      </AppNavigation>,
    );
    expect(view.getByText("Workouts screen")).toBeTruthy();
    expect(
      view.queryByText("Offline mode. Changes saved on this device."),
    ).toBeNull();
    fireEvent.click(view.getByRole("link"));
    expect(view.getByText("Workout screen: saved")).toBeTruthy();
    expect(view.queryByText("Workouts screen")).toBeNull();
    expect(view.getByTestId("query").textContent).toBe("test=1");
    expect(router.push).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();

    // Next's native history integration must also keep back/forward local.
    act(() => {
      browser.history.replaceState(null, "", "/");
      browser.dispatchEvent(new browser.Event("popstate"));
    });
    expect(view.getByText("Workouts screen")).toBeTruthy();
  },
);

test("account pages keep their server-rendered screen", () => {
  segment = "(account)";
  serverPathname = "/account";
  browser.history.replaceState(null, "", "/account");
  const view = render(
    <AppNavigation>
      <AppScreen>
        <p>Account screen</p>
      </AppScreen>
    </AppNavigation>,
  );
  expect(view.getByText("Account screen")).toBeTruthy();
});

test("the icon-only page action sits outside both navigation areas and hides on settings", () => {
  const view = render(
    <AppNavigation>
      <AppNavbar />
    </AppNavigation>,
  );
  const sidebarElement = view.getByRole("complementary", { name: "Sidebar" });
  const sidebar = within(sidebarElement);
  const menu = sidebar.getByRole("navigation", { name: "Menu" });
  const primary = view.getByRole("navigation", { name: "Primary" });
  const create = view.getByRole("button", { name: "Create workout" });
  expect(create.textContent).toBe("");
  expect(sidebarElement.contains(create)).toBe(false);
  expect(primary.contains(create)).toBe(false);
  expect(within(primary).getAllByRole("link")).toHaveLength(2);
  expect(within(primary).getByRole("button", { name: "Menu" })).toBeTruthy();

  fireEvent.click(within(menu).getByRole("link", { name: "Settings" }));
  expect(browser.location.pathname).toBe("/settings");
  expect(sidebar.getByRole("navigation", { name: "Menu" })).toBe(menu);
  expect(view.getByRole("navigation", { name: "Primary" })).toBe(primary);
  expect(view.queryByRole("button", { name: "Create workout" })).toBeNull();
});

test("settings and their detail pages open locally for an offline guest", () => {
  Object.defineProperty(browser.navigator, "onLine", { value: false });
  useStore.setState({ syncStatus: "offline" });
  const assign = spyOn(browser.location, "assign").mockImplementation(() => {});
  const view = render(
    <AppNavigation>
      <NavigationMenu pathname="/" session={null} isSessionPending={false} />
      <AppScreen>
        <p>Server screen</p>
      </AppScreen>
    </AppNavigation>,
  );

  fireEvent.click(view.getByRole("link", { name: "Settings" }));
  expect(view.getByRole("heading", { name: "Settings" })).toBeTruthy();
  const trainingLink = view.getByRole("link", { name: "Training" });
  expect(trainingLink.textContent).toContain("3 sets");
  expect(trainingLink.textContent).toContain("+2.5 kg");
  fireEvent.click(view.getByRole("link", { name: "Appearance" }));
  expect(browser.location.pathname).toBe("/settings/appearance");
  expect(view.getByRole("radio", { name: "System" })).toBeTruthy();
  fireEvent.click(view.getByRole("link", { name: "Back to settings" }));
  fireEvent.click(view.getByRole("link", { name: "Data & sync" }));
  expect(view.getByText("Offline")).toBeTruthy();
  expect(view.getByText("Saved on this device")).toBeTruthy();
  expect(view.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
  expect(assign).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
});

test("overview opens locally and uses the weight unit chosen in settings", () => {
  Object.defineProperty(browser.navigator, "onLine", {
    configurable: true,
    value: false,
  });
  const date = new Date();
  date.setDate(date.getDate() - 42);
  const timestamp = date.toISOString();
  const workoutId = "push";
  const exerciseId = "bench";
  useStore.setState({
    workouts: [{
      id: workoutId,
      name: "Push day",
      createdAt: timestamp,
      updatedAt: timestamp,
      exercises: [{
        id: exerciseId,
        workoutId,
        name: "Bench press",
        position: 0,
        weight: 60,
        sets: 3,
        step: 2.5,
        logging: true,
        notes: "",
        createdAt: timestamp,
        updatedAt: timestamp,
      }],
    }],
    exerciseLogs: [{
      id: "set",
      exerciseId,
      workoutId,
      weight: 60,
      reps: 8,
      performedAt: timestamp,
      createdAt: timestamp,
    }],
  });
  const assign = spyOn(browser.location, "assign").mockImplementation(() => {});
  const view = render(
    <AppNavigation>
      <NavigationMenu pathname="/" session={null} isSessionPending={false} />
      <AppScreen>{null}</AppScreen>
    </AppNavigation>,
  );

  fireEvent.click(view.getByRole("link", { name: "Overview" }));
  expect(view.getByRole("heading", { name: "Overview" })).toBeTruthy();
  expect(view.getByRole("link", { name: /Bench press/ }).getAttribute("href")).toBe(
    "/e/bench/history",
  );
  expect(view.getByTitle("480 kg (weight × reps)")).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();
  expect(assign).not.toHaveBeenCalled();

  const activeWeek = view.getByRole("button", { name: /, 1 day$/ });
  fireEvent.click(activeWeek);
  expect(activeWeek.getAttribute("aria-pressed")).toBe("true");

  fireEvent.click(view.getByRole("link", { name: "Settings" }));
  fireEvent.click(view.getByRole("link", { name: "Training" }));
  fireEvent.click(view.getByRole("radio", { name: "Pounds (lb)" }));
  fireEvent.click(view.getByRole("link", { name: "Overview" }));
  expect(view.getByText("132.28 lb")).toBeTruthy();
  expect(view.getByTitle("1,058.22 lb (weight × reps)")).toBeTruthy();
  expect(router.push).not.toHaveBeenCalled();
  expect(assign).not.toHaveBeenCalled();
});
