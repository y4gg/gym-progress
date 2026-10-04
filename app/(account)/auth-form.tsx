"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fingerprint, KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type PendingAction = "email" | "google" | "passkey" | null;

function getDisplayName(email: string) {
  const fallback = "Gym Ladder User";
  const localPart = email.split("@")[0]?.trim();

  return localPart || fallback;
}

function AuthDivider() {
  return (
    <div className="flex items-center gap-4 py-1 text-sm text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function AuthButton({
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

function AlternativeSignInMethods({
  mode,
  email,
  pendingAction,
  onGoogleSignIn,
  onPasskeySignIn,
}: {
  mode: "login" | "register";
  email: string;
  pendingAction: PendingAction;
  onGoogleSignIn: () => void;
  onPasskeySignIn: () => void;
}) {
  const isRegister = mode === "register";
  const isPending = pendingAction !== null;

  return (
    <>
      {isRegister ? (
        <AuthButton
          disabled={isPending}
          onClick={onGoogleSignIn}
          type="button"
          variant="outline"
        >
          <span className="text-lg font-semibold">G</span>
          {pendingAction === "google" ? "Please wait" : "Sign up with Google"}
        </AuthButton>
      ) : (
        <div className="flex flex-col gap-3">
          <AuthButton
            disabled={isPending}
            onClick={onGoogleSignIn}
            type="button"
            variant="outline"
          >
            <span className="text-lg font-semibold" aria-hidden="true">
              G
            </span>
            {pendingAction === "google" ? "Waiting" : "Sign in with Google"}
          </AuthButton>
          <AuthButton
            disabled={isPending}
            onClick={onPasskeySignIn}
            type="button"
            variant="outline"
          >
            <Fingerprint />
            {pendingAction === "passkey" ? "Waiting" : "Sign in with passkey"}
          </AuthButton>
          <AuthButton asChild variant="outline">
            <Link
              aria-disabled={isPending}
              tabIndex={isPending ? -1 : undefined}
              onClick={(event) => {
                if (isPending) event.preventDefault();
              }}
              href={
                email.trim()
                  ? `/login/magic-link?email=${encodeURIComponent(email.trim())}`
                  : "/login/magic-link"
              }
            >
              <Mail />
              Sign in with magic link
            </Link>
          </AuthButton>
        </div>
      )}
    </>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);

  const title = isRegister ? "Register" : "Login";
  const submitLabel = isRegister ? "Register" : "Login";
  const switchHref = isRegister ? "/login" : "/register";
  const switchAction = isRegister
    ? "Login with existing account"
    : "Create new account";
  const isPending = pendingAction !== null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const homeURL = new URL("/", window.location.origin).toString();
    const verificationSuccessURL = new URL(
      "/?emailVerified=true",
      window.location.origin,
    ).toString();
    const verificationSentURL = `/register/verify-email-sent?email=${encodeURIComponent(trimmedEmail)}`;

    setError(null);
    setPendingAction("email");

    try {
      const result = isRegister
        ? await authClient.signUp.email({
            name: getDisplayName(trimmedEmail),
            email: trimmedEmail,
            password,
            callbackURL: verificationSuccessURL,
          })
        : await authClient.signIn.email(
            {
              email: trimmedEmail,
              password,
              callbackURL: homeURL,
            },
            {
              onError: (ctx) => {
                if (ctx.error.status === 403) {
                  toast.error("Please verify your email first.");
                }
              },
            },
          );

      if (result.error) {
        if (!isRegister && result.error.code === "MAGIC_LINK_REQUIRED") {
          setPassword("");
          router.push(
            `/login/magic-link?email=${encodeURIComponent(trimmedEmail)}`,
          );
          return;
        }

        if (!isRegister && result.error.status === 403) {
          toast.error("Please verify your email first.");
          router.push(verificationSentURL);
          return;
        }

        const message = result.error.message ?? "Authentication failed.";
        setError(message);
        toast.error(message);
        return;
      }

      if (isRegister) {
        toast.success("Verification email sent.");
        router.push(verificationSentURL);
        return;
      }

      toast.success("Logged in.");
      router.push("/");
      router.refresh();
    } catch {
      const message = "Authentication failed.";
      setError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setPendingAction("google");

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: new URL("/", window.location.origin).toString(),
      });

      if (result.error) {
        const message = result.error.message ?? "Google sign-in failed.";
        setError(message);
        toast.error(message);
      }
    } catch {
      const message = "Google sign-in failed.";
      setError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  const signInWithPasskey = useCallback(
    async ({
      autoFill = false,
      silent = false,
    }: {
      autoFill?: boolean;
      silent?: boolean;
    } = {}) => {
      if (!silent) {
        setError(null);
        setPendingAction("passkey");
      }

      try {
        const result = await authClient.signIn.passkey({ autoFill });

        if (result.error) {
          const message = result.error.message ?? "Passkey sign-in failed.";
          if (!silent) {
            setError(message);
            toast.error(message);
          }
          return;
        }

        toast.success("Logged in.");
        router.push("/");
        router.refresh();
      } catch {
        const message = "Passkey sign-in failed.";
        if (!silent) {
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!silent) {
          setPendingAction(null);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    if (isRegister || typeof PublicKeyCredential === "undefined") {
      return;
    }

    const credential = PublicKeyCredential as typeof PublicKeyCredential & {
      isConditionalMediationAvailable?: () => Promise<boolean>;
    };

    if (!credential.isConditionalMediationAvailable) {
      return;
    }

    void credential.isConditionalMediationAvailable().then((isAvailable) => {
      if (isAvailable) {
        void signInWithPasskey({ autoFill: true, silent: true });
      }
    });
  }, [isRegister, signInWithPasskey]);

  function handlePasskeySignIn() {
    void signInWithPasskey();
  }

  return (
    <main className="min-h-dvh px-6 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-5 text-center text-4xl font-bold">{title}</h1>

        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <div>
            <Label className="text-base" htmlFor="email">
              Email
            </Label>
            <Input
              autoComplete={isRegister ? "email" : "username webauthn"}
              className="h-14 px-4 text-base"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <Label className="text-base" htmlFor="password">
                Password
              </Label>
              {!isRegister ? (
                <Link
                  className="text-base hover:text-muted-foreground"
                  href="/reset-password"
                >
                  Forgot Password?
                </Link>
              ) : null}
            </div>
            <Input
              autoComplete={
                isRegister ? "new-password" : "current-password webauthn"
              }
              className="h-14 px-4 text-base"
              id="password"
              minLength={isRegister ? 8 : undefined}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <AuthButton disabled={isPending} type="submit">
            {isRegister ? <UserPlus /> : <LogIn />}
            {pendingAction === "email" ? "Please wait" : submitLabel}
          </AuthButton>
        </form>

        <AuthButton asChild variant="secondary">
          <Link href={switchHref}>
            <KeyRound />
            {switchAction}
          </Link>
        </AuthButton>

        <AuthDivider />

        <AlternativeSignInMethods
          mode={mode}
          email={email}
          pendingAction={pendingAction}
          onGoogleSignIn={handleGoogleSignIn}
          onPasskeySignIn={handlePasskeySignIn}
        />
      </div>
    </main>
  );
}
