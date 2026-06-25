import Link from "next/link";
import { ArrowLeft, LogIn, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ResendVerificationButton } from "./resend-verification-button";

function getEmail(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function VerifyEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] | undefined }>;
}) {
  const email = getEmail((await searchParams).email);

  return (
    <main className="min-h-dvh px-6 py-10 pb-28">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-xl border border-border bg-secondary">
            <MailCheck className="size-8" />
          </div>
        </div>

        <div className="space-y-3 text-center">
          <h1 className="text-4xl font-bold">Check your email</h1>
          <p className="text-base leading-7 text-muted-foreground">
            We sent a verification link
            {email ? (
              <>
                {" "}
                to <span className="font-semibold text-foreground">{email}</span>
              </>
            ) : null}
            . Verify your email before logging in.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          {email ? <ResendVerificationButton email={email} /> : null}

          <Button
            asChild
            className="h-14 w-full gap-3 px-4 text-base"
            variant="outline"
          >
            <Link href="/login">
              <LogIn />
              Login
            </Link>
          </Button>

          <Button
            asChild
            className="h-14 w-full gap-3 px-4 text-base"
            variant="ghost"
          >
            <Link href="/register">
              <ArrowLeft />
              Use another email
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
