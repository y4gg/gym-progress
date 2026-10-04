import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import type { ComponentProps } from "react";

const browser = new Window({ url: "http://localhost:3000" });
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

type AuthResult = {
  error: { status: number; code: string; message: string } | null;
};
const signInEmail = mock(async (body: unknown): Promise<AuthResult> => {
  void body;
  return { error: null };
});
const signInMagicLink = mock(async (body: unknown): Promise<AuthResult> => {
  void body;
  return { error: null };
});
const push = mock();
const refresh = mock();
mock.module("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));
mock.module("next/link", () => ({
  default: (props: ComponentProps<"a">) => <a {...props} />,
}));
mock.module("sonner", () => ({ toast: { success: mock(), error: mock() } }));
mock.module("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: signInEmail,
      magicLink: signInMagicLink,
      social: mock(),
      passkey: mock(),
    },
    signUp: { email: mock() },
  },
}));

const { act, cleanup, fireEvent, render } =
  await import("@testing-library/react");
const { AuthForm } = await import("./auth-form");
const { MagicLinkForm } = await import("./login/magic-link/magic-link-form");

beforeEach(() => {
  signInEmail.mockClear();
  signInEmail.mockImplementation(async () => ({ error: null }));
  signInMagicLink.mockClear();
  signInMagicLink.mockImplementation(async () => ({ error: null }));
  push.mockClear();
  refresh.mockClear();
});
afterEach(cleanup);

test("social-only password sign-in redirects to magic-link sign-in with the email filled in", async () => {
  signInEmail.mockImplementation(async () => ({
    error: {
      status: 401,
      code: "MAGIC_LINK_REQUIRED",
      message: "Sign in with a magic link.",
    },
  }));
  const view = render(<AuthForm mode="login" />);
  fireEvent.change(view.getByLabelText("Email"), {
    target: { value: "google-user@example.com" },
  });
  fireEvent.change(view.getByLabelText("Password"), {
    target: { value: "some-password" },
  });
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Login" }));
  });
  expect(push).toHaveBeenCalledWith(
    "/login/magic-link?email=google-user%40example.com",
  );
  expect(refresh).not.toHaveBeenCalled();
});

test("login offers Google, passkey, and magic-link sign-in", () => {
  const view = render(<AuthForm mode="login" />);
  expect(
    view.getByRole("button", { name: "Sign in with Google" }),
  ).toBeDefined();
  expect(
    view.getByRole("button", { name: "Sign in with passkey" }),
  ).toBeDefined();
  expect(
    view
      .getByRole("link", { name: "Sign in with magic link" })
      .getAttribute("href"),
  ).toBe("/login/magic-link");
});

test("wrong passwords still show the normal sign-in error", async () => {
  signInEmail.mockImplementation(async () => ({
    error: {
      status: 401,
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "Invalid email or password",
    },
  }));
  const view = render(<AuthForm mode="login" />);
  fireEvent.change(view.getByLabelText("Email"), {
    target: { value: "password-user@example.com" },
  });
  fireEvent.change(view.getByLabelText("Password"), {
    target: { value: "wrong-password" },
  });
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Login" }));
  });
  expect(view.getByRole("alert").textContent).toBe("Invalid email or password");
  expect(push).not.toHaveBeenCalled();
});

test("magic-link sign-in requests an email with home and error redirects, without a password", async () => {
  const view = render(<MagicLinkForm initialEmail="GOOGLE-USER@example.com" />);
  expect((view.getByLabelText("Email") as HTMLInputElement).value).toBe(
    "GOOGLE-USER@example.com",
  );
  expect(view.queryByLabelText("Password")).toBeNull();
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Send sign-in link" }));
  });
  expect(signInMagicLink).toHaveBeenCalledWith({
    email: "google-user@example.com",
    callbackURL: "http://localhost:3000/",
    errorCallbackURL: "http://localhost:3000/login/magic-link",
  });
  expect(view.getByRole("status").textContent).toContain("Check your inbox");
  expect(push).not.toHaveBeenCalled();
});

test("magic-link email failures display the error and allow retry", async () => {
  signInMagicLink.mockImplementation(async () => ({
    error: {
      status: 500,
      code: "MAGIC_LINK_EMAIL_FAILED",
      message: "Sign-in email could not be sent. Please try again.",
    },
  }));
  const view = render(<MagicLinkForm initialEmail="google-user@example.com" />);
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Send sign-in link" }));
  });
  expect(view.getByRole("alert").textContent).toBe(
    "Sign-in email could not be sent. Please try again.",
  );
  expect(view.queryByRole("status")).toBeNull();
  expect(
    view
      .getByRole("button", { name: "Send sign-in link" })
      .hasAttribute("disabled"),
  ).toBe(false);
});

test("invalid or expired magic links explain how to request a new link", () => {
  const view = render(<MagicLinkForm errorCode="INVALID_TOKEN" />);
  expect(view.getByRole("alert").textContent).toContain("Request a new one");
  expect(view.getByRole("button", { name: "Send sign-in link" })).toBeDefined();
});

test("unverified accounts can open the existing verification flow", async () => {
  signInMagicLink.mockImplementation(async () => ({
    error: {
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      message: "Verify your email before signing in with a magic link.",
    },
  }));
  const view = render(<MagicLinkForm initialEmail="google-user@example.com" />);
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Send sign-in link" }));
  });
  expect(
    view
      .getByRole("link", { name: "Resend verification email" })
      .getAttribute("href"),
  ).toBe("/register/verify-email-sent?email=google-user%40example.com");
  expect(view.queryByRole("status")).toBeNull();
});
