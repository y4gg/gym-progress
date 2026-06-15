"use client";

import { ChangeEmailDialog } from "@/components/account/change-email-dialog";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { PasskeysDialog } from "@/components/account/passkeys-dialog";
import { SignOutButton } from "@/components/account/sign-out-button";
import { authClient } from "@/lib/auth-client";

export default function AccountPage() {
  const session = authClient.useSession();
  const currentEmail = session.data?.user.email;
  const actionsDisabled = session.isPending || !session.data;

  return (
    <main className="min-h-dvh px-6 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-5 text-center text-4xl font-bold">Account</h1>

        <ChangeEmailDialog
          currentEmail={currentEmail}
          disabled={actionsDisabled}
        />
        <ChangePasswordDialog disabled={actionsDisabled} />
        <PasskeysDialog disabled={actionsDisabled} />
        <SignOutButton disabled={actionsDisabled} />
        <DeleteAccountDialog disabled={actionsDisabled} />

        {!session.isPending && !session.data ? (
          <p className="pt-2 text-center text-sm text-muted-foreground">
            Login to manage your account.
          </p>
        ) : null}
      </div>
    </main>
  );
}
