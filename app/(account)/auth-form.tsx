"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const isRegister = mode === "register";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = isRegister ? "Register" : "Login";
  const submitLabel = isRegister ? "Create Account" : "Login";
  const switchHref = isRegister ? "/login" : "/register";
  const switchAction = isRegister ? "Login" : "Register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const result = isRegister
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
            callbackURL: "/",
          })
        : await authClient.signIn.email(
            {
              email: email.trim(),
              password,
              callbackURL: "/",
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
        const message = result.error.message ?? "Authentication failed.";
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(isRegister ? "Account created." : "Logged in.");
      router.push("/");
      router.refresh();
    } catch {
      const message = "Authentication failed.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="grid w-full max-w-sm gap-2 p-6 sm:p-24 sm:max-w-xl mx-auto">
      <h1 className="text-4xl font-bold text-center">{title}</h1>

      <form className="grid gap-2" onSubmit={handleSubmit}>
        {isRegister ? (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-1"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="mt-1"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <Separator orientation="horizontal" className="my-3" />

        <div className="grid grid-cols-2 gap-1">
          <Button variant="outline" asChild>
            <Link href={switchHref}>{switchAction}</Link>
          </Button>

          <Button type="submit" disabled={isPending}>
            {isRegister ? <UserPlus /> : <LogIn />}
            {isPending ? "Please wait" : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
