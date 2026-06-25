"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { user, verification } from "@/db/schema";
import { auth } from "@/lib/auth";

const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

type ResendVerificationResult =
  | { status: "sent" }
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

async function getResendCooldown(identifier: string) {
  const now = new Date();
  const [existingAttempt] = await db
    .select({ expiresAt: verification.expiresAt, id: verification.id })
    .from(verification)
    .where(eq(verification.identifier, identifier))
    .limit(1);

  if (existingAttempt && existingAttempt.expiresAt > now) {
    return {
      attemptId: existingAttempt.id,
      retryAfterSeconds: Math.ceil(
        (existingAttempt.expiresAt.getTime() - now.getTime()) / 1000,
      ),
    };
  }

  return {
    attemptId: existingAttempt?.id ?? null,
    retryAfterSeconds: 0,
  };
}

async function setResendCooldown(identifier: string, attemptId: string | null) {
  const expiresAt = new Date(Date.now() + RESEND_COOLDOWN_MS);

  if (attemptId) {
    await db
      .update(verification)
      .set({ expiresAt, value: "cooldown" })
      .where(eq(verification.id, attemptId));
    return;
  }

  await db.insert(verification).values({
    id: crypto.randomUUID(),
    identifier,
    value: "cooldown",
    expiresAt,
  });
}

export async function resendVerificationEmail(
  email: string,
): Promise<ResendVerificationResult> {
  const pendingEmail = await getPendingVerificationEmail(email);

  if (!pendingEmail) {
    return { status: "invalid" };
  }

  const cooldownIdentifier = `verification-email-resend:${pendingEmail}`;
  const cooldown = await getResendCooldown(cooldownIdentifier);

  if (cooldown.retryAfterSeconds > 0) {
    return {
      status: "cooldown",
      retryAfterSeconds: cooldown.retryAfterSeconds,
    };
  }

  await setResendCooldown(cooldownIdentifier, cooldown.attemptId);

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000";

  await auth.api.sendVerificationEmail({
    body: {
      email: pendingEmail,
      callbackURL: new URL("/", origin).toString(),
    },
    headers: requestHeaders,
  });

  return { status: "sent" };
}
