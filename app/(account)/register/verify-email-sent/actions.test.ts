import { beforeEach, expect, mock, test } from "bun:test";

const limit = mock(async (): Promise<{ email: string }[]> => []);
const select = mock(() => ({
  from: () => ({ where: () => ({ limit }) }),
}));
const sendVerificationEmail = mock(async (request: unknown) => {
  void request;
  return { status: true };
});
const getCooldown = mock(async () => ({ retryAfterSeconds: 0 }));
const startCooldown = mock(async () => ({ retryAfterSeconds: 120 }));

mock.module("@/db", () => ({ db: { select } }));
mock.module("@/lib/auth", () => ({ auth: { api: { sendVerificationEmail } } }));
mock.module("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3000" }),
}));
mock.module("@/lib/email-verification-rate-limit", () => ({
  getEmailVerificationResendCooldown: getCooldown,
  startEmailVerificationResendCooldown: startCooldown,
}));

const { getPendingVerificationEmail, resendVerificationEmail } =
  await import("./actions");

beforeEach(() => {
  select.mockClear();
  limit.mockImplementation(async () => []);
  sendVerificationEmail.mockClear();
  getCooldown.mockImplementation(async () => ({ retryAfterSeconds: 0 }));
  startCooldown.mockClear();
});

test.each([undefined, "", "missing@", "bad@@example.com", "x".repeat(255)])(
  "invalid emails do not reach the database",
  async (email) => {
    expect(await getPendingVerificationEmail(email)).toBeNull();
    expect(select).not.toHaveBeenCalled();
  },
);

test("malformed server action payloads fail validation instead of throwing", async () => {
  expect(
    await getPendingVerificationEmail(123 as unknown as string),
  ).toBeNull();
  expect(select).not.toHaveBeenCalled();
});

test("cooldown blocks sending another verification email", async () => {
  limit.mockImplementation(async () => [{ email: "user@example.com" }]);
  getCooldown.mockImplementation(async () => ({ retryAfterSeconds: 30 }));
  expect(await resendVerificationEmail("USER@example.com")).toEqual({
    status: "cooldown",
    retryAfterSeconds: 30,
  });
  expect(sendVerificationEmail).not.toHaveBeenCalled();
  expect(startCooldown).not.toHaveBeenCalled();
});

test("valid pending addresses receive a verification link with a safe local callback", async () => {
  limit.mockImplementation(async () => [{ email: "user@example.com" }]);
  expect(await resendVerificationEmail(" user@example.com ")).toEqual({
    status: "sent",
    retryAfterSeconds: 120,
  });
  expect(sendVerificationEmail).toHaveBeenCalledWith({
    body: {
      email: "user@example.com",
      callbackURL: "http://localhost:3000/?emailVerified=true",
    },
    headers: new Headers({ origin: "http://localhost:3000" }),
  });
});
