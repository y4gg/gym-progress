import { APIError, createAuthMiddleware } from "better-auth/api";
import { magicLink } from "better-auth/plugins/magic-link";
import { z } from "zod";

import { renderAppActionEmail, sendEmail } from "@/lib/email";

export const redirectPasswordlessSignIn = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/sign-in/email") return;

  const email = z.email().safeParse(ctx.body?.email);
  if (!email.success || typeof ctx.body?.password !== "string") return;

  const user = await ctx.context.internalAdapter.findUserByEmail(
    email.data.toLowerCase(),
    { includeAccounts: true },
  );
  if (!user) return;

  const hasPassword = user.accounts.some(
    (account) => account.providerId === "credential" && account.password,
  );
  const hasSocialAccount = user.accounts.some(
    (account) => account.providerId !== "credential",
  );

  if (!hasPassword && hasSocialAccount) {
    throw new APIError("UNAUTHORIZED", {
      code: "MAGIC_LINK_REQUIRED",
      message: "Sign in with a magic link instead.",
    });
  }
});

export const magicLinkAuth = magicLink({
  disableSignUp: true,
  expiresIn: 60 * 10,
  storeToken: "hashed",
  sendMagicLink: async ({ email, url }, ctx) => {
    const user = await ctx?.context.internalAdapter.findUserByEmail(
      email.toLowerCase(),
    );
    if (!user) return;

    if (!user.user.emailVerified) {
      throw new APIError("FORBIDDEN", {
        code: "EMAIL_NOT_VERIFIED",
        message: "Verify your email before signing in with a magic link.",
      });
    }

    const result = await sendEmail({
      to: user.user.email,
      subject: "Sign in to Gym Ladder",
      html: renderAppActionEmail({
        actionLabel: "Sign in",
        actionUrl: url,
        body: "Use this link to sign in to your Gym Ladder account. The link expires in 10 minutes and can only be used once.",
        preview: "Your Gym Ladder sign-in link.",
        title: "Sign in",
      }),
      text: `Sign in to Gym Ladder: ${url}\nThis link expires in 10 minutes and can only be used once.`,
    });

    if (result.error) {
      throw new APIError("INTERNAL_SERVER_ERROR", {
        code: "MAGIC_LINK_EMAIL_FAILED",
        message: "Sign-in email could not be sent. Please try again.",
      });
    }
  },
});
