"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { getAuthErrorMessage } from "@/components/account/auth-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

function ResetPasswordButton({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("h-14 w-full gap-3 px-4 text-base", className)}
      {...props}
    >
      {children}
    </Button>
  );
}

function getTokenErrorMessage(errorCode: string | undefined) {
  if (errorCode === "INVALID_TOKEN") {
    return "This reset link is invalid or expired. Request a new one.";
  }

  return null;
}

export function ResetPasswordForm({
  errorCode,
  token,
}: {
  errorCode?: string;
  token?: string;
}) {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(
    getTokenErrorMessage(errorCode),
  );

  const hasToken = Boolean(token);
  const title = hasToken ? "Reset Password" : "Forgot Password";

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();

    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.requestPasswordReset({
        email: trimmedEmail,
        redirectTo: new URL(
          "/reset-password",
          window.location.origin,
        ).toString(),
      });

      if (result.error) {
        const message = getAuthErrorMessage(result.error);
        setError(message);
        toast.error(message);
        return;
      }

      toast.success("If an account exists, a reset link has been sent.");
    } catch {
      const message = "Password reset email could not be sent.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      const message = "This reset link is invalid or expired.";
      setError(message);
      toast.error(message);
      return;
    }

    if (password !== confirmPassword) {
      const message = "Passwords do not match.";
      setError(message);
      toast.error(message);
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        const message = getAuthErrorMessage(result.error);
        setError(message);
        toast.error(message);
        return;
      }

      setPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
      router.push("/login");
    } catch {
      const message = "Password could not be updated.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="min-h-dvh px-6 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-5 text-center text-4xl font-bold">{title}</h1>

        {hasToken ? (
          <form className="flex flex-col gap-3" onSubmit={handleResetPassword}>
            <div>
              <Label className="text-base" htmlFor="password">
                New password
              </Label>
              <Input
                autoComplete="new-password"
                className="h-14 px-4 text-base"
                id="password"
                minLength={8}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>

            <div>
              <Label className="text-base" htmlFor="confirm-password">
                Confirm password
              </Label>
              <Input
                autoComplete="new-password"
                className="h-14 px-4 text-base"
                id="confirm-password"
                minLength={8}
                name="confirm-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <ResetPasswordButton disabled={isPending} type="submit">
              <RotateCcw />
              {isPending ? "Please wait" : "Reset password"}
            </ResetPasswordButton>
          </form>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={handleRequestReset}>
            <div>
              <Label className="text-base" htmlFor="email">
                Email
              </Label>
              <Input
                autoComplete="email"
                className="h-14 px-4 text-base"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
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

            <ResetPasswordButton disabled={isPending} type="submit">
              <Mail />
              {isPending ? "Please wait" : "Send reset link"}
            </ResetPasswordButton>
          </form>
        )}

        <ResetPasswordButton asChild variant="secondary">
          <Link href="/login">
            <ArrowLeft />
            Back to login
          </Link>
        </ResetPasswordButton>
      </div>
    </main>
  );
}
