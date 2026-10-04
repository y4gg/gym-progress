"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { getAuthErrorMessage } from "@/components/account/auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function getLinkError(errorCode?: string) {
  if (!errorCode) return null;
  if (errorCode === "INVALID_TOKEN") {
    return "This sign-in link is invalid, expired, or already used. Request a new one.";
  }
  if (errorCode === "new_user_signup_disabled") {
    return "Create an account before signing in with a magic link.";
  }
  return "This sign-in link could not be used. Request a new one.";
}

export function MagicLinkForm({
  initialEmail = "",
  errorCode,
}: {
  initialEmail?: string;
  errorCode?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [isPending, setIsPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(getLinkError(errorCode));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const trimmedEmail = email.trim().toLowerCase();
    setError(null);
    setSentTo(null);
    setVerificationEmail(null);
    setIsPending(true);

    try {
      const result = await authClient.signIn.magicLink({
        email: trimmedEmail,
        callbackURL: new URL("/", window.location.origin).toString(),
        errorCallbackURL: new URL(
          "/login/magic-link",
          window.location.origin,
        ).toString(),
      });

      if (result.error) {
        setError(getAuthErrorMessage(result.error));
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          setVerificationEmail(trimmedEmail);
        }
        return;
      }

      setSentTo(trimmedEmail);
    } catch {
      setError("Sign-in email could not be sent. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-dvh px-6 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-5 text-center text-4xl font-bold">Magic Link</h1>
        <p className="text-center text-sm text-muted-foreground">
          Sign in to your account with a link sent to your email. No password
          needed.
        </p>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div>
            <Label className="text-base" htmlFor="email">
              Email
            </Label>
            <Input
              autoComplete="email"
              className="h-14 px-4 text-base"
              disabled={isPending}
              id="email"
              name="email"
              onChange={(event) => {
                setEmail(event.target.value);
                setSentTo(null);
                setVerificationEmail(null);
              }}
              required
              type="email"
              value={email}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {verificationEmail ? (
            <Link
              className="text-sm underline"
              href={`/register/verify-email-sent?email=${encodeURIComponent(verificationEmail)}`}
            >
              Resend verification email
            </Link>
          ) : null}
          {sentTo ? (
            <p className="text-sm text-muted-foreground" role="status">
              If an account exists for {sentTo}, a sign-in link has been sent.
              Check your inbox. The link expires in 10 minutes.
            </p>
          ) : null}
          <Button
            className="h-14 w-full gap-3 px-4 text-base"
            disabled={isPending}
            type="submit"
          >
            <Mail />
            {isPending
              ? "Sending"
              : sentTo
                ? "Send another link"
                : "Send sign-in link"}
          </Button>
        </form>
        <Button
          asChild
          className="h-14 w-full gap-3 px-4 text-base"
          variant="secondary"
        >
          <Link href="/login">
            <ArrowLeft />
            Back to login
          </Link>
        </Button>
        <Link
          className="text-center text-sm text-muted-foreground hover:underline"
          href="/register"
        >
          Create new account
        </Link>
      </div>
    </main>
  );
}
