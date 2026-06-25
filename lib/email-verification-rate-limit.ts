import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { verification } from "@/db/schema";

export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 2 * 60;

const EMAIL_VERIFICATION_RESEND_COOLDOWN_MS =
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS * 1000;

type CooldownRecord = {
  attemptId: string | null;
  retryAfterSeconds: number;
};

function getCooldownIdentifier(email: string) {
  return `verification-email-resend:${email.trim().toLowerCase()}`;
}

async function getCooldownRecord(identifier: string): Promise<CooldownRecord> {
  const now = new Date();
  const [existingAttempt] = await db
    .select({ expiresAt: verification.expiresAt, id: verification.id })
    .from(verification)
    .where(eq(verification.identifier, identifier))
    .orderBy(desc(verification.expiresAt))
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

export async function getEmailVerificationResendCooldown(email: string) {
  const cooldown = await getCooldownRecord(getCooldownIdentifier(email));

  return {
    retryAfterSeconds: cooldown.retryAfterSeconds,
  };
}

export async function startEmailVerificationResendCooldown(email: string) {
  const identifier = getCooldownIdentifier(email);
  const cooldown = await getCooldownRecord(identifier);
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_RESEND_COOLDOWN_MS,
  );

  if (cooldown.attemptId) {
    await db
      .update(verification)
      .set({ expiresAt, value: "cooldown" })
      .where(eq(verification.id, cooldown.attemptId));
  } else {
    await db.insert(verification).values({
      id: crypto.randomUUID(),
      identifier,
      value: "cooldown",
      expiresAt,
    });
  }

  return {
    retryAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  };
}
