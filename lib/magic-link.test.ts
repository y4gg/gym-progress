import { beforeEach, expect, mock, test } from "bun:test";
import { betterAuth } from "better-auth";
import { memoryAdapter, type MemoryDB } from "better-auth/adapters/memory";

type Email = { to: string; subject: string; text: string; html: string };
const send = mock(
  async (
    email: Email,
  ): Promise<{
    data: { id: string } | null;
    error: { message: string } | null;
  }> => {
    void email;
    return { data: { id: "test-email" }, error: null };
  },
);
mock.module("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));
const { magicLinkAuth, redirectPasswordlessSignIn } =
  await import("./magic-link");
const database: MemoryDB = {
  user: [],
  session: [],
  account: [],
  verification: [],
};
const auth = betterAuth({
  baseURL: "http://localhost:3000",
  secret: "test-secret-for-magic-links-at-least-32-characters",
  database: memoryAdapter(database),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  hooks: { before: redirectPasswordlessSignIn },
  plugins: [magicLinkAuth],
  logger: { disabled: true },
  rateLimit: { enabled: false },
});
let userId = "";

beforeEach(async () => {
  for (const records of Object.values(database)) records.length = 0;
  send.mockClear();
  send.mockImplementation(async () => ({
    data: { id: "test-email" },
    error: null,
  }));
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser({
    name: "Google user",
    email: "google-user@example.com",
    emailVerified: true,
  });
  userId = user.id;
  await context.internalAdapter.linkAccount({
    userId,
    providerId: "google",
    accountId: "google-provider-id",
  });
});

function post(path: string, body: Record<string, unknown>) {
  return auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify(body),
    }),
  );
}

async function requestMagicLink(email = "google-user@example.com") {
  return post("/sign-in/magic-link", {
    email,
    callbackURL: "http://localhost:3000/",
    errorCallbackURL: "http://localhost:3000/login/magic-link",
  });
}

function sentLink() {
  return send.mock.calls[0][0].text
    .split("\n")[0]
    .replace("Sign in to Gym Ladder: ", "");
}

test("social-only password sign-in returns the magic-link redirect code", async () => {
  const result = await post("/sign-in/email", {
    email: "GOOGLE-USER@example.com",
    password: "any-password",
  });
  expect(result.status).toBe(401);
  expect((await result.json()).code).toBe("MAGIC_LINK_REQUIRED");
  expect(send).not.toHaveBeenCalled();
});

test("Google accounts that added a password can still sign in with it", async () => {
  const context = await auth.$context;
  await context.internalAdapter.linkAccount({
    userId,
    providerId: "credential",
    accountId: userId,
    password: await context.password.hash("new-password123"),
  });
  const success = await post("/sign-in/email", {
    email: "google-user@example.com",
    password: "new-password123",
  });
  expect(success.status).toBe(200);
  const wrongPassword = await post("/sign-in/email", {
    email: "google-user@example.com",
    password: "wrong-password",
  });
  expect((await wrongPassword.json()).code).toBe("INVALID_EMAIL_OR_PASSWORD");
});

test("unknown emails keep the normal password sign-in error", async () => {
  const result = await post("/sign-in/email", {
    email: "unknown@example.com",
    password: "any-password",
  });
  expect((await result.json()).code).toBe("INVALID_EMAIL_OR_PASSWORD");
});

test("magic-link email signs in to the existing Google account and is single-use", async () => {
  expect((await requestMagicLink()).status).toBe(200);
  expect(send).toHaveBeenCalledTimes(1);
  const email = send.mock.calls[0][0];
  expect(email.to).toBe("google-user@example.com");
  expect(email.html).toContain("sign in to your Gym Ladder account");
  const url = sentLink();
  expect(database.verification[0].identifier).not.toBe(
    new URL(url).searchParams.get("token"),
  );
  const result = await auth.handler(new Request(url));
  expect(result.status).toBe(302);
  expect(result.headers.get("location")).toBe("http://localhost:3000/");
  const cookie = result.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const session = await auth.api.getSession({
    headers: new Headers({ cookie }),
  });
  expect(session?.user.id).toBe(userId);
  const accounts = await (
    await auth.$context
  ).internalAdapter.findAccounts(userId);
  expect(accounts.map((account) => account.providerId)).toEqual(["google"]);
  const reused = await auth.handler(new Request(url));
  expect(reused.headers.get("location")).toBe(
    "http://localhost:3000/login/magic-link?error=INVALID_TOKEN",
  );
});

test("expired magic links return to the request form", async () => {
  await requestMagicLink();
  database.verification[0].expiresAt = new Date(Date.now() - 1000);
  const result = await auth.handler(new Request(sentLink()));
  expect(result.headers.get("location")).toBe(
    "http://localhost:3000/login/magic-link?error=INVALID_TOKEN",
  );
  expect(database.session).toHaveLength(0);
});

test("unknown emails receive a generic response without mail or a new account", async () => {
  expect((await requestMagicLink("unknown@example.com")).status).toBe(200);
  expect(send).not.toHaveBeenCalled();
  expect(database.user).toHaveLength(1);
});

test("email delivery failures are reported instead of claiming a link was sent", async () => {
  send.mockImplementation(async () => ({
    data: null,
    error: { message: "Email provider unavailable" },
  }));
  const result = await requestMagicLink();
  expect(result.status).toBe(500);
  expect((await result.json()).code).toBe("MAGIC_LINK_EMAIL_FAILED");
});

test("unverified accounts complete email verification before using magic-link sign-in", async () => {
  await (
    await auth.$context
  ).internalAdapter.updateUser(userId, { emailVerified: false });
  const result = await requestMagicLink();
  expect(result.status).toBe(403);
  expect((await result.json()).code).toBe("EMAIL_NOT_VERIFIED");
  expect(send).not.toHaveBeenCalled();
});
