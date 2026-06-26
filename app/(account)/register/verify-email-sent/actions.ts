"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  getEmailVerificationResendCooldown,
  startEmailVerificationResendCooldown,
} from "@/lib/email-verification-rate-limit";

type ResendVerificationResult =
  | { retryAfterSeconds: number; status: "sent" }
  | { retryAfterSeconds: number; status: "cooldown" }
  | { status: "invalid" };

function normalizeEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (
    !normalizedEmail ||
    normalizedEmail.length > 254 ||
    !normalizedEmail.includes("@")
  ) {
    return null;
  }

  return normalizedEmail;
}

export async function getPendingVerificationEmail(email: string | undefined) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const [pendingUser] = await db
    .select({ email: user.email })
    .from(user)
    .where(
      and(eq(user.email, normalizedEmail), eq(user.emailVerified, false)),
    )
    .limit(1);

  return pendingUser?.email ?? null;
}

export async function resendVerificationEmail(
  email: string,
): Promise<ResendVerificationResult> {
  const pendingEmail = await getPendingVerificationEmail(email);

  if (!pendingEmail) {
    return { status: "invalid" };
  }

  const cooldown = await getEmailVerificationResendCooldown(pendingEmail);

  if (cooldown.retryAfterSeconds > 0) {
    return {
      status: "cooldown",
      retryAfterSeconds: cooldown.retryAfterSeconds,
    };
  }

  const nextCooldown =
    await startEmailVerificationResendCooldown(pendingEmail);

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";

  await auth.api.sendVerificationEmail({
    body: {
      email: pendingEmail,
      callbackURL: new URL("/?emailVerified=true", origin).toString(),
    },
    headers: requestHeaders,
  });

  return { ...nextCooldown, status: "sent" };
}
