import { beforeEach, expect, mock, test } from "bun:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

const database = { user: [], session: [], account: [], verification: [] };
let resetToken = "";
const testAuth = betterAuth({
  baseURL: "http://localhost:3000",
  secret: "test-secret-for-password-creation-at-least-32-characters",
  database: memoryAdapter(database),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ token }) => {
      resetToken = token;
    },
  },
  logger: { disabled: true },
});
let requestHeaders = new Headers();
mock.module("next/headers", () => ({ headers: async () => requestHeaders }));
mock.module("@/lib/auth", () => ({ auth: testAuth }));
const { addPassword } = await import("./actions");
let userId = "";

beforeEach(async () => {
  for (const records of Object.values(database)) records.length = 0;
  requestHeaders = new Headers();
  resetToken = "";
  const context = await testAuth.$context;
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
  const session = await context.internalAdapter.createSession(userId);
  const cookie = context.authCookies.sessionToken.name;
  // Use Better Auth's signed session cookie rather than bypassing session validation.
  const { serializeSignedCookie } = await import("better-call");
  const signedCookie = await serializeSignedCookie(
    cookie,
    session!.token,
    context.secret,
    { path: "/" },
  );
  requestHeaders.set("cookie", signedCookie.split(";")[0]);
});

test("adding a password to a Google account enables email/password sign-in", async () => {
  expect(await addPassword("new-password123")).toEqual({ error: null });
  const result = await testAuth.api.signInEmail({
    body: { email: "google-user@example.com", password: "new-password123" },
  });
  expect(result.user.id).toBe(userId);
  const accounts = await (
    await testAuth.$context
  ).internalAdapter.findAccounts(userId);
  expect(accounts.map((account) => account.providerId).sort()).toEqual([
    "credential",
    "google",
  ]);
});

test("adding a password cannot overwrite an existing password", async () => {
  expect(await addPassword("new-password123")).toEqual({ error: null });
  const result = await addPassword("another-password123");
  expect(result.error?.message).toBe("User already has a password set");
  const signIn = await testAuth.api.signInEmail({
    body: { email: "google-user@example.com", password: "new-password123" },
  });
  expect(signIn.user.id).toBe(userId);
});

test("signed-out requests cannot add a password", async () => {
  requestHeaders = new Headers();
  expect((await addPassword("new-password123")).error?.message).toBe(
    "Sign in again before adding a password.",
  );
  const accounts = await (
    await testAuth.$context
  ).internalAdapter.findAccounts(userId);
  expect(accounts).toHaveLength(1);
});

test.each(["short", "x".repeat(129)])(
  "invalid password lengths are rejected",
  async (password) => {
    expect((await addPassword(password)).error).not.toBeNull();
    const accounts = await (
      await testAuth.$context
    ).internalAdapter.findAccounts(userId);
    expect(accounts).toHaveLength(1);
  },
);

test("the forgot-password flow can also create a password for a Google-only account", async () => {
  await testAuth.api.requestPasswordReset({
    body: {
      email: "google-user@example.com",
      redirectTo: "http://localhost:3000/reset-password",
    },
  });
  expect(resetToken).not.toBe("");
  await testAuth.api.resetPassword({
    body: { token: resetToken, newPassword: "reset-password123" },
  });
  const result = await testAuth.api.signInEmail({
    body: { email: "google-user@example.com", password: "reset-password123" },
  });
  expect(result.user.id).toBe(userId);
});
