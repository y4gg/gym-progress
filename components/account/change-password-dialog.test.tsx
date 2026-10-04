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

const listAccounts = mock(async () => ({
  data: [{ providerId: "google" }],
  error: null as { message: string } | null,
}));
const changePassword = mock(async (body: unknown) => {
  void body;
  return { error: null };
});
const addPassword = mock(
  async (password: string): Promise<{ error: { message: string } | null }> => {
    void password;
    return { error: null };
  },
);
mock.module("@/lib/auth-client", () => ({
  authClient: { listAccounts, changePassword },
}));
mock.module("@/app/(account)/account/actions", () => ({ addPassword }));
mock.module("sonner", () => ({ toast: { success: mock(), error: mock() } }));

const { act, cleanup, fireEvent, render, waitFor } =
  await import("@testing-library/react");
const { ChangePasswordDialog } = await import("./change-password-dialog");

beforeEach(() => {
  listAccounts.mockClear();
  listAccounts.mockImplementation(async () => ({
    data: [{ providerId: "google" }],
    error: null,
  }));
  changePassword.mockClear();
  addPassword.mockClear();
  addPassword.mockImplementation(async () => ({ error: null }));
});
afterEach(cleanup);

test("Google-only accounts can add a password without a current password", async () => {
  const view = render(<ChangePasswordDialog />);
  const trigger = await view.findByRole("button", { name: "Add Password" });
  fireEvent.click(trigger);
  expect(view.getByRole("heading", { name: "Add password" })).toBeDefined();
  expect(view.queryByLabelText("Current password")).toBeNull();
  fireEvent.change(view.getByLabelText("New password"), {
    target: { value: "new-password123" },
  });
  fireEvent.change(view.getByLabelText("Confirm password"), {
    target: { value: "new-password123" },
  });
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Save" }));
  });
  expect(addPassword).toHaveBeenCalledWith("new-password123");
  expect(changePassword).not.toHaveBeenCalled();
  expect(view.getByRole("button", { name: "Change Password" })).toBeDefined();
});

test("accounts with both Google and a password still require their current password", async () => {
  listAccounts.mockImplementation(async () => ({
    data: [{ providerId: "google" }, { providerId: "credential" }],
    error: null,
  }));
  const view = render(<ChangePasswordDialog />);
  await waitFor(() => expect(listAccounts).toHaveBeenCalled());
  fireEvent.click(await view.findByRole("button", { name: "Change Password" }));
  fireEvent.change(view.getByLabelText("Current password"), {
    target: { value: "old-password123" },
  });
  fireEvent.change(view.getByLabelText("New password"), {
    target: { value: "new-password123" },
  });
  fireEvent.change(view.getByLabelText("Confirm password"), {
    target: { value: "new-password123" },
  });
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Save" }));
  });
  expect(changePassword).toHaveBeenCalledWith({
    currentPassword: "old-password123",
    newPassword: "new-password123",
    revokeOtherSessions: true,
  });
  expect(addPassword).not.toHaveBeenCalled();
});

test("password settings stay disabled until the linked accounts are loaded", async () => {
  let resolveAccounts!: (
    result: Awaited<ReturnType<typeof listAccounts>>,
  ) => void;
  listAccounts.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveAccounts = resolve;
      }),
  );
  const view = render(<ChangePasswordDialog />);
  expect(
    view.getByRole("button", { name: "Password" }).hasAttribute("disabled"),
  ).toBe(true);
  await act(async () => {
    resolveAccounts({ data: [{ providerId: "google" }], error: null });
  });
  expect(
    view.getByRole("button", { name: "Add Password" }).hasAttribute("disabled"),
  ).toBe(false);
});

test("a failed account lookup can be retried without selecting the wrong password flow", async () => {
  listAccounts.mockImplementation(async () => ({
    data: [],
    error: { message: "Offline" },
  }));
  const view = render(<ChangePasswordDialog />);
  expect(await view.findByRole("alert")).toBeDefined();
  expect(
    view.getByRole("button", { name: "Password" }).hasAttribute("disabled"),
  ).toBe(true);
  listAccounts.mockImplementation(async () => ({
    data: [{ providerId: "google" }],
    error: null,
  }));
  fireEvent.click(view.getByRole("button", { name: "Retry" }));
  expect(
    await view.findByRole("button", { name: "Add Password" }),
  ).toBeDefined();
});

test("mismatched passwords never reach the server", async () => {
  const view = render(<ChangePasswordDialog />);
  fireEvent.click(await view.findByRole("button", { name: "Add Password" }));
  fireEvent.change(view.getByLabelText("New password"), {
    target: { value: "new-password123" },
  });
  fireEvent.change(view.getByLabelText("Confirm password"), {
    target: { value: "different-password123" },
  });
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Save" }));
  });
  expect(view.getByRole("alert").textContent).toBe("Passwords do not match.");
  expect(addPassword).not.toHaveBeenCalled();
});

test("failed password creation preserves add mode and displays the server error", async () => {
  addPassword.mockImplementation(async () => ({
    error: { message: "Sign in again before adding a password." },
  }));
  const view = render(<ChangePasswordDialog />);
  fireEvent.click(await view.findByRole("button", { name: "Add Password" }));
  fireEvent.change(view.getByLabelText("New password"), {
    target: { value: "new-password123" },
  });
  fireEvent.change(view.getByLabelText("Confirm password"), {
    target: { value: "new-password123" },
  });
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Save" }));
  });
  expect(view.getByRole("alert").textContent).toBe(
    "Sign in again before adding a password.",
  );
  expect(view.getByRole("heading", { name: "Add password" })).toBeDefined();
  expect(changePassword).not.toHaveBeenCalled();
});
