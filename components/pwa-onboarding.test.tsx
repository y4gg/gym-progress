import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { useState } from "react";

const browser = new Window({ url: "http://localhost:3000" });
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
  "PointerEvent",
  "getComputedStyle",
] as const) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: name === "window" ? browser : browser[name],
  });
}

let standalone = false;
let pathname = "/";
let userId: string | null = null;
let savedUserId: string | null = null;
let sessionPending = false;
let testId = 0;
const displayMode = browser.matchMedia("(display-mode: standalone)");
Object.defineProperty(displayMode, "matches", { get: () => standalone });
const mobile = browser.matchMedia("(max-width: 767px)");
Object.defineProperty(mobile, "matches", { value: true });
const originalMatchMedia = browser.matchMedia.bind(browser);
browser.matchMedia = (query: string) =>
  query === "(display-mode: standalone)"
    ? displayMode
    : query === "(max-width: 767px)"
      ? mobile
      : originalMatchMedia(query);

mock.module("@/components/app-navigation", () => ({
  useAppPathname: () => pathname,
  useAppRouter: () => ({ push: mock(), refresh: mock() }),
  AppLink: () => null,
}));
mock.module("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: userId ? { user: { id: userId } } : null,
      isPending: sessionPending,
    }),
  },
}));
mock.module("@/lib/store", () => ({
  useStore: (selector: (state: unknown) => unknown) =>
    selector({ syncUserId: savedUserId, workouts: [] }),
}));
mock.module("@/lib/use-store-hydrated", () => ({
  useStoreHydrated: () => true,
}));
mock.module("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: mock() }),
}));

const { act, cleanup, fireEvent, render } =
  await import("@testing-library/react");
const { PwaOnboardingProvider } = await import("./pwa-onboarding-provider");
const { PwaInstallProvider, PwaInstallButton } =
  await import("./pwa-install-button");
const { usePwaOnboarding } = await import("./pwa-context");
const { getPwaOnboardingStorageKey } = await import("@/lib/pwa-onboarding");

function App() {
  const { replay } = usePwaOnboarding();
  return <button onClick={replay}>Replay onboarding</button>;
}

beforeEach(() => {
  standalone = false;
  pathname = "/";
  userId = `user-${++testId}`;
  savedUserId = null;
  sessionPending = false;
  browser.localStorage.clear();
  Object.defineProperty(browser.navigator, "onLine", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(browser.navigator, "standalone", {
    configurable: true,
    value: false,
  });
  Object.defineProperty(browser.navigator, "userAgent", {
    configurable: true,
    value: "Android",
  });
});
afterEach(cleanup);

test("browser visits leave the app visible and can replay the tour", () => {
  const view = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  expect(
    view.queryByRole("heading", { name: "Welcome to Gym Ladder" }),
  ).toBeNull();
  fireEvent.click(view.getByRole("button", { name: "Replay onboarding" }));
  expect(
    view.getByRole("heading", { name: "Welcome to Gym Ladder" }),
  ).toBeTruthy();
});

test("first standalone launch runs the real menu tutorial and remembers completion", async () => {
  standalone = true;
  const view = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  expect(view.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
  fireEvent.click(view.getByRole("button", { name: "Continue" }));
  expect(view.getByRole("heading", { name: "Open your menu" })).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Menu" }));
  expect(
    view.getByRole("heading", { name: "You found your launchpad" }),
  ).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Continue" }));
  expect(
    view.getByRole("heading", { name: "Keep climbing, even offline" }),
  ).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Continue" }));
  fireEvent.click(view.getByRole("button", { name: "Get started" }));
  expect(
    browser.localStorage.getItem(getPwaOnboardingStorageKey(userId!)),
  ).toBe("complete");
  expect(view.getByRole("button", { name: "Replay onboarding" })).toBeTruthy();
  view.unmount();
  const reopened = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  expect(reopened.queryByRole("heading")).toBeNull();
});

test("guests can skip and replay without losing completion", () => {
  standalone = true;
  userId = null;
  const view = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  fireEvent.click(view.getByRole("button", { name: "Skip onboarding" }));
  fireEvent.click(view.getByRole("button", { name: "Replay onboarding" }));
  expect(
    view.getByRole("heading", { name: "Welcome to Gym Ladder" }),
  ).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Skip onboarding" }));
  expect(view.queryByRole("heading")).toBeNull();
});

test("swiping left opens the tutorial menu and closing it advances the tour", () => {
  standalone = true;
  const view = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  fireEvent.click(view.getByRole("button", { name: "Continue" }));
  const heading = view.getByRole("heading", { name: "Open your menu" });
  fireEvent.touchStart(heading, {
    touches: [{ identifier: 1, clientX: 300, clientY: 200 }],
  });
  fireEvent.touchMove(heading, {
    touches: [{ identifier: 1, clientX: 180, clientY: 200 }],
  });
  fireEvent.touchEnd(heading, {
    touches: [],
    changedTouches: [{ identifier: 1, clientX: 180, clientY: 200 }],
  });
  expect(
    view.getByRole("heading", { name: "You found your launchpad" }),
  ).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Close menu" }));
  expect(
    view.getByRole("heading", { name: "Keep climbing, even offline" }),
  ).toBeTruthy();
});

test("completion belongs to the current account", () => {
  standalone = true;
  const view = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  fireEvent.click(view.getByRole("button", { name: "Skip onboarding" }));
  userId = `other-${testId}`;
  view.rerender(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  expect(
    view.getByRole("heading", { name: "Welcome to Gym Ladder" }),
  ).toBeTruthy();
});

test("authentication pages and pending online sessions are not interrupted", () => {
  standalone = true;
  pathname = "/login";
  const view = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  expect(view.queryByRole("heading")).toBeNull();
  pathname = "/";
  sessionPending = true;
  view.rerender(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  expect(view.queryByRole("heading")).toBeNull();
});

test("an offline launch uses the saved account without waiting for the session", () => {
  standalone = true;
  userId = null;
  savedUserId = `offline-${testId}`;
  sessionPending = true;
  Object.defineProperty(browser.navigator, "onLine", {
    configurable: true,
    value: false,
  });
  const view = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  fireEvent.click(view.getByRole("button", { name: "Skip onboarding" }));
  expect(
    browser.localStorage.getItem(getPwaOnboardingStorageKey(savedUserId)),
  ).toBe("complete");
});

test("storage failures still allow completion for the rest of the visit", () => {
  standalone = true;
  const storage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")!;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Storage blocked");
    },
  });
  try {
    const view = render(
      <PwaOnboardingProvider>
        <App />
      </PwaOnboardingProvider>,
    );
    fireEvent.click(view.getByRole("button", { name: "Skip onboarding" }));
    expect(view.queryByRole("heading")).toBeNull();
    view.unmount();
    expect(
      render(
        <PwaOnboardingProvider>
          <App />
        </PwaOnboardingProvider>,
      ).queryByRole("heading"),
    ).toBeNull();
  } finally {
    Object.defineProperty(globalThis, "localStorage", storage);
  }
});

test("iOS home-screen mode is detected without the display-mode media query", () => {
  Object.defineProperty(browser.navigator, "standalone", {
    configurable: true,
    value: true,
  });
  const view = render(
    <PwaOnboardingProvider>
      <App />
    </PwaOnboardingProvider>,
  );
  expect(
    view.getByRole("heading", { name: "Welcome to Gym Ladder" }),
  ).toBeTruthy();
});

function InstallHarness() {
  const [show, setShow] = useState(false);
  return (
    <PwaInstallProvider>
      <button onClick={() => setShow(true)}>Show install</button>
      {show && <PwaInstallButton />}
    </PwaInstallProvider>
  );
}

test("captures a native prompt before the menu mounts and consumes it once", async () => {
  const view = render(<InstallHarness />);
  const prompt = mock(async () => {});
  const event = Object.assign(
    new browser.Event("beforeinstallprompt", { cancelable: true }),
    {
      prompt,
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    },
  );
  await act(async () => {
    browser.dispatchEvent(event);
  });
  expect(event.defaultPrevented).toBe(true);
  fireEvent.click(view.getByRole("button", { name: "Show install" }));
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Install Gym Ladder" }));
  });
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(view.queryByRole("status")).toBeNull();
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Install Gym Ladder" }));
  });
  expect(prompt).toHaveBeenCalledTimes(1);
  expect(view.getByRole("status").textContent).toContain("browser menu");
});

test("native acceptance waits for appinstalled before hiding the install button", async () => {
  const view = render(
    <PwaInstallProvider>
      <PwaInstallButton />
    </PwaInstallProvider>,
  );
  browser.dispatchEvent(
    Object.assign(new browser.Event("beforeinstallprompt"), {
      prompt: async () => {},
      userChoice: Promise.resolve({ outcome: "accepted" }),
    }),
  );
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Install Gym Ladder" }));
  });
  expect(view.getByRole("button", { name: "Install Gym Ladder" })).toBeTruthy();
  act(() => {
    browser.dispatchEvent(new browser.Event("appinstalled"));
  });
  expect(view.queryByRole("button", { name: "Install Gym Ladder" })).toBeNull();
});

test("iOS receives Safari installation instructions", async () => {
  Object.defineProperty(browser.navigator, "userAgent", {
    configurable: true,
    value: "iPhone",
  });
  const view = render(
    <PwaInstallProvider>
      <PwaInstallButton />
    </PwaInstallProvider>,
  );
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Install Gym Ladder" }));
  });
  expect(view.getByRole("status").textContent).toContain(
    "In Safari, tap Share",
  );
});

test("a failed native prompt falls back to manual instructions", async () => {
  const view = render(
    <PwaInstallProvider>
      <PwaInstallButton />
    </PwaInstallProvider>,
  );
  browser.dispatchEvent(
    Object.assign(new browser.Event("beforeinstallprompt"), {
      prompt: async () => {
        throw new Error("Prompt unavailable");
      },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    }),
  );
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Install Gym Ladder" }));
  });
  expect(view.getByRole("status").textContent).toContain("browser menu");
  expect(
    view
      .getByRole("button", { name: "Install Gym Ladder" })
      .hasAttribute("disabled"),
  ).toBe(false);
});
