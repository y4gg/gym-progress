"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function addPassword(newPassword: string) {
  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    });

    return { error: null };
  } catch (error) {
    if (error instanceof APIError) {
      const message =
        error.body?.code === "UNAUTHORIZED"
          ? "Sign in again before adding a password."
          : (error.body?.message ?? "Password could not be added.");
      return { error: { message } };
    }

    return { error: { message: "Password could not be added." } };
  }
}
