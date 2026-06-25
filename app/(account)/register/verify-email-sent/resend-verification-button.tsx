"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "./actions";

function formatRetryAfter(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds} second${remainingSeconds === 1 ? "" : "s"}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function ResendVerificationButton({
  email,
  initialRetryAfterSeconds,
}: {
  email: string;
  initialRetryAfterSeconds: number;
}) {
  const [isPending, setIsPending] = useState(false);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(
    initialRetryAfterSeconds,
  );
  const isRateLimited = retryAfterSeconds > 0;
  const isDisabled = isPending || isRateLimited;

  useEffect(() => {
    if (!isRateLimited) return;

    const interval = window.setInterval(() => {
      setRetryAfterSeconds((currentRetryAfterSeconds) =>
        Math.max(currentRetryAfterSeconds - 1, 0),
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRateLimited]);

  async function handleResend() {
    if (isRateLimited) return;

    setIsPending(true);

    try {
      const result = await resendVerificationEmail(email);

      if (result.status === "invalid") {
        toast.error("This email is not pending verification.");
        return;
      }

      if (result.status === "cooldown") {
        setRetryAfterSeconds(result.retryAfterSeconds);
        toast.error(
          `Please wait ${result.retryAfterSeconds} seconds before resending.`,
        );
        return;
      }

      setRetryAfterSeconds(result.retryAfterSeconds);
      toast.success("Verification email sent.");
    } catch {
      toast.error("Could not resend email.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="h-14 w-full gap-3 px-4 text-base"
        disabled={isDisabled}
        onClick={handleResend}
        type="button"
        variant="secondary"
      >
        <Send />
        {isPending
          ? "Sending"
          : isRateLimited
            ? `Resend in ${formatRetryAfter(retryAfterSeconds)}`
            : "Resend verification email"}
      </Button>
      {isRateLimited ? (
        <p className="text-center text-sm text-muted-foreground">
          You can resend the email in {formatRetryAfter(retryAfterSeconds)}.
        </p>
      ) : null}
    </div>
  );
}
