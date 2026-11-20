"use client";

import { ChangeEmailDialog } from "@/components/account/change-email-dialog";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { PasskeysDialog } from "@/components/account/passkeys-dialog";
import { SignOutButton } from "@/components/account/sign-out-button";
import { SettingsLayout } from "@/components/settings-layout";
import { authClient } from "@/lib/auth-client";

export default function AccountPage() {
  const session = authClient.useSession();
  const currentEmail = session.data?.user.email;
  const actionsDisabled = session.isPending || !session.data;

  return (
    <SettingsLayout title="Account">
      <div className="grid max-w-md gap-5">
        <div className="grid gap-2">
          <ChangeEmailDialog
            currentEmail={currentEmail}
            disabled={actionsDisabled}
          />
          <ChangePasswordDialog
            key={session.data?.user.id ?? "signed-out"}
            disabled={actionsDisabled}
          />
          <PasskeysDialog disabled={actionsDisabled} />
        </div>
        <div className="grid gap-2 border-t border-border pt-5">
          <SignOutButton disabled={actionsDisabled} />
          <DeleteAccountDialog disabled={actionsDisabled} />
        </div>

        {!session.isPending && !session.data ? (
          <p className="text-sm text-muted-foreground">
            Login to manage your account.
          </p>
        ) : null}
      </div>
    </SettingsLayout>
  );
}
