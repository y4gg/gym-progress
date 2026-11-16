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
  }: ComponentProps<typeof NextLink>) => (
    <a
      href={href as string}
      onClick={(event) =>
        onNavigate?.({ preventDefault: () => event.preventDefault() })
      }
    >
      {children}
    </a>
  ),
}));

const { act, cleanup, fireEvent, render } = await import("@testing-library/react");
const { AppLink, AppNavigation, useAppPathname, useAppRouter, useAppSearchParams } =
  await import("./app-navigation");
const { AppScreen } = await import("./offline-app");
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
