import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { renderAppActionEmail, sendEmail } from "./email";
import { passkey } from "@better-auth/passkey";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your password",
        html: renderAppActionEmail({
          actionLabel: "Reset password",
          actionUrl: url,
          body: "Use this link to choose a new password for your Gym Ladder account.",
          preview: "Reset your Gym Ladder password.",
          title: "Reset password",
        }),
        text: `Reset your Gym Ladder password: ${url}`,
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        html: renderAppActionEmail({
          actionLabel: "Verify account",
          actionUrl: url,
          body: "Confirm this email address to finish setting up your Gym Ladder account and start syncing your workouts.",
          preview: "Verify your Gym Ladder email address.",
          title: "Verify email",
        }),
        text: `Verify your Gym Ladder email address: ${url}`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [passkey()],
});
