import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { Window } from "happy-dom";
import type NextLink from "next/link";
import type { ComponentProps } from "react";

const browser = new Window({ url: "http://localhost:3000/offline" });
for (const name of [
  "window",
  "document",
  "navigator",
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
const router = { push: mock(), replace: mock(), refresh: mock() };
mock.module("next/navigation", () => ({
  useSelectedLayoutSegment: () => segment,
  usePathname: () => "/server-path",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => router,
}));
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

const { cleanup, fireEvent, render } = await import("@testing-library/react");
const { AppLink, AppNavigation, useAppPathname, useAppRouter } =
  await import("./app-navigation");

function RouterControls() {
  const appRouter = useAppRouter();
  const pathname = useAppPathname();
  return (
    <>
      <output>{pathname}</output>
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
  browser.history.replaceState(null, "", "/offline");
  Object.defineProperty(browser.navigator, "onLine", {
    configurable: true,
    value: true,
  });
  router.push.mockClear();
  router.replace.mockClear();
  router.refresh.mockClear();
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

test("the online router preserves navigation options", () => {
  segment = "home";
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
