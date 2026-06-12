import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
    },
    deleteUser: {
      enabled: true,
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email address",
        html: `Click the link to verify your email: ${url}`,
      });
    },
  },
  // socialProviders: {
  //   google: {
  //     clientId: process.env.GOOGLE_CLIENT_ID as string,
  //     clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  //   },
  // },
});
