import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

const browser = new Window({ url: "http://localhost" });
for (const name of [
  "window",
  "document",
  "navigator",
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

const deleteUser = mock(
  async (
    body: unknown,
  ): Promise<{
    error: { code: string; message: string } | null;
  }> => {
    void body;
    return { error: null };
  },
);
const clearData = mock();
const push = mock();
mock.module("@/lib/auth-client", () => ({ authClient: { deleteUser } }));
mock.module("@/lib/store", () => ({
  useStore: (selector: (state: { clearData: typeof clearData }) => unknown) =>
    selector({ clearData }),
}));
mock.module("next/navigation", () => ({
  useRouter: () => ({ push, refresh: mock() }),
}));
mock.module("sonner", () => ({ toast: { success: mock(), error: mock() } }));

const { act, cleanup, fireEvent, render } =
  await import("@testing-library/react");
const { DeleteAccountDialog } = await import("./delete-account-dialog");

beforeEach(() => {
  deleteUser.mockClear();
  deleteUser.mockImplementation(async () => ({ error: null }));
  clearData.mockClear();
  push.mockClear();
});
afterEach(cleanup);

test("recent passwordless sign-ins can delete their account without a password", async () => {
  const view = render(<DeleteAccountDialog />);
  fireEvent.click(
    view.getByRole("button", { name: "Delete my account & data" }),
  );
  await act(async () =>
    fireEvent.click(view.getByRole("button", { name: "Delete" })),
  );
  expect(deleteUser).toHaveBeenCalledWith({
    password: undefined,
    callbackURL: "/login",
  });
  expect(clearData).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith("/login");
});

test("expired sign-ins explain reauthentication and preserve local workouts", async () => {
  deleteUser.mockImplementation(async () => ({
    error: { code: "SESSION_EXPIRED", message: "Session expired" },
  }));
  const view = render(<DeleteAccountDialog />);
  fireEvent.click(
    view.getByRole("button", { name: "Delete my account & data" }),
  );
  await act(async () =>
    fireEvent.click(view.getByRole("button", { name: "Delete" })),
  );
  expect(view.getByRole("alert").textContent).toContain("Sign in again");
  expect(clearData).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

test("cancel never deletes the account even with a filled password", async () => {
  const view = render(<DeleteAccountDialog />);
  fireEvent.click(
    view.getByRole("button", { name: "Delete my account & data" }),
  );
  fireEvent.change(
    view.getByLabelText("Password (optional with a recent sign-in)"),
    {
      target: { value: "password123" },
    },
  );
  const cancel = view.getByRole("button", { name: "Cancel" });
  expect(cancel.getAttribute("type")).toBe("button");
  await act(async () => fireEvent.click(cancel));
  expect(deleteUser).not.toHaveBeenCalled();
  expect(clearData).not.toHaveBeenCalled();
});
