"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ResendVerificationButton({ email }: { email: string }) {
  const [isPending, setIsPending] = useState(false);

  async function handleResend() {
    setIsPending(true);

    try {
      const result = await authClient.sendVerificationEmail({
        email,
        callbackURL: new URL("/", window.location.origin).toString(),
      });

      if (result.error) {
        toast.error(result.error.message ?? "Could not resend email.");
        return;
      }

      toast.success("Verification email sent.");
    } catch {
      toast.error("Could not resend email.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      className="h-14 w-full gap-3 px-4 text-base"
      disabled={isPending}
      onClick={handleResend}
      type="button"
      variant="secondary"
    >
      <Send />
      {isPending ? "Sending" : "Resend verification email"}
    </Button>
  );
}
