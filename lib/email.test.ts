import { beforeEach, expect, mock, test } from "bun:test";

const send = mock(
  async (
    _email: unknown,
  ): Promise<{
    data: { id: string } | null;
    error: { message: string } | null;
    headers: null;
  }> => {
    void _email;
    return { data: { id: "email-id" }, error: null, headers: null };
  },
);

mock.module("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const { sendEmail } = await import("./email");
const email = {
  to: "user@example.com",
  subject: "Verify",
  html: "<p>Verify</p>",
};

beforeEach(() => {
  send.mockClear();
  send.mockImplementation(async () => ({
    data: { id: "email-id" },
    error: null,
    headers: null,
  }));
});

test("successful email delivery returns the provider result", async () => {
  expect(await sendEmail(email)).toEqual({
    data: { id: "email-id" },
    error: null,
    headers: null,
  });
  expect(send).toHaveBeenCalledWith({
    ...email,
    from: "noreply@updates.y4.gg",
  });
});

test("provider API errors reject so auth cannot claim email was sent", async () => {
  send.mockImplementation(async () => ({
    data: null,
    headers: null,
    error: { message: "Provider credentials are invalid" },
  }));
  await expect(sendEmail(email)).rejects.toThrow("Email could not be sent.");
});

test("transport errors propagate to the auth caller", async () => {
  send.mockImplementation(async () => {
    throw new Error("Network unavailable");
  });
  await expect(sendEmail(email)).rejects.toThrow("Network unavailable");
});
