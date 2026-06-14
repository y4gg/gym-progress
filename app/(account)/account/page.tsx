"use client";

import type { ComponentProps, FormEvent, ReactNode } from "react";
import { useState } from "react";
import { getAuthenticatorName } from "@better-auth/passkey";
import {
  Fingerprint,
  KeyRound,
  LogOut,
  Mail,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type AccountActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children"
> & {
  children: ReactNode;
  icon: ReactNode;
};

function AccountActionButton({
  children,
  className,
  icon,
  type = "button",
  variant = "outline",
  ...props
}: AccountActionButtonProps) {
  return (
    <Button
      className={cn(
        "h-14 w-full justify-start gap-3 px-4 text-base",
        className,
      )}
      type={type}
      variant={variant}
      {...props}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </Button>
  );
}

function getAuthErrorMessage(error: { message?: string } | null | undefined) {
  return error?.message ?? "Something went wrong.";
}

function getPasskeyLabel(passkey: {
  name?: string;
  aaguid?: string;
  credentialID: string;
}) {
  return (
    passkey.name ||
    getAuthenticatorName(passkey.aaguid) ||
    `Passkey ${passkey.credentialID.slice(0, 8)}`
  );
}

function ChangeEmailDialog({
  currentEmail,
  disabled,
}: {
  currentEmail?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.changeEmail({
        newEmail: newEmail.trim(),
        callbackURL: "/account",
      });

      if (result.error) {
        const message = getAuthErrorMessage(result.error);
        setError(message);
        toast.error(message);
        return;
      }

      toast.success("Email updated.");
      setNewEmail("");
      setOpen(false);
    } catch {
      const message = "Email could not be updated.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AccountActionButton disabled={disabled} icon={<Mail />}>
          Change Email
        </AccountActionButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Email</DialogTitle>
          <DialogDescription>
            {currentEmail
              ? `Current email: ${currentEmail}`
              : "Update your email address."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="new-email">New email</Label>
            <Input
              autoComplete="email"
              className="mt-1"
              id="new-email"
              onChange={(event) => setNewEmail(event.target.value)}
              required
              type="email"
              value={newEmail}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        const message = getAuthErrorMessage(result.error);
        setError(message);
        toast.error(message);
        return;
      }

      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOpen(false);
    } catch {
      const message = "Password could not be updated.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AccountActionButton disabled={disabled} icon={<KeyRound />}>
          Change Password
        </AccountActionButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Other signed-in sessions will be revoked.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="current-password">Current password</Label>
            <Input
              autoComplete="current-password"
              className="mt-1"
              id="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              type="password"
              value={currentPassword}
            />
          </div>
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              autoComplete="new-password"
              className="mt-1"
              id="new-password"
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              autoComplete="new-password"
              className="mt-1"
              id="confirm-password"
              minLength={8}
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
          <DialogFooter>
            <Button disabled={isPending} type="submit">
              {isPending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasskeysDialog({ disabled }: { disabled?: boolean }) {
  const passkeys = authClient.useListPasskeys();
  const [name, setName] = useState("");
  const [pendingAction, setPendingAction] = useState<"add" | string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const passkeyList = passkeys.data ?? [];

  async function handleAddPasskey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPendingAction("add");

    try {
      const result = await authClient.passkey.addPasskey({
        name: name.trim() || undefined,
      });

      if (result.error) {
        const message = getAuthErrorMessage(result.error);
        setError(message);
        toast.error(message);
        return;
      }

      setName("");
      await passkeys.refetch();
      toast.success("Passkey added.");
    } catch {
      const message = "Passkey could not be added.";
      setError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDeletePasskey(id: string) {
    setError(null);
    setPendingAction(id);

    try {
      const result = await authClient.passkey.deletePasskey({ id });

      if (result.error) {
        const message = getAuthErrorMessage(result.error);
        setError(message);
        toast.error(message);
        return;
      }

      await passkeys.refetch();
      toast.success("Passkey deleted.");
    } catch {
      const message = "Passkey could not be deleted.";
      setError(message);
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <AccountActionButton disabled={disabled} icon={<Fingerprint />}>
          Passkeys
        </AccountActionButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Passkeys</DialogTitle>
          <DialogDescription>
            Add a passkey to sign in with your device, password manager, or
            security key.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleAddPasskey}>
          <div>
            <Label htmlFor="passkey-name">Name</Label>
            <Input
              autoComplete="off"
              className="mt-1"
              id="passkey-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Personal laptop"
              value={name}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={pendingAction !== null} type="submit">
            <Plus />
            {pendingAction === "add" ? "Adding" : "Add passkey"}
          </Button>
        </form>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Saved passkeys</p>
          {passkeys.isPending ? (
            <p className="text-sm text-muted-foreground">Loading passkeys.</p>
          ) : passkeyList.length > 0 ? (
            <div className="grid gap-2">
              {passkeyList.map((passkey) => (
                <div
                  className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border bg-background p-3"
                  key={passkey.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getPasskeyLabel(passkey)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {passkey.createdAt
                        ? new Date(passkey.createdAt).toLocaleDateString()
                        : "No creation date"}
                    </p>
                  </div>
                  <Button
                    aria-label={`Delete ${getPasskeyLabel(passkey)}`}
                    disabled={pendingAction !== null}
                    onClick={() => void handleDeletePasskey(passkey.id)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No passkeys added yet.
            </p>
          )}
        </div>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}

function SignOutButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        toast.error(result.error.message ?? "Sign out failed.");
        return;
      }

      toast.success("Signed out.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Sign out failed.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AccountActionButton
      disabled={disabled || isPending}
      icon={<LogOut />}
      onClick={handleSignOut}
      variant="secondary"
    >
      {isPending ? "Signing out" : "Sign out"}
    </AccountActionButton>
  );
}

function DeleteAccountDialog({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const clearData = useStore((state) => state.clearData);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const result = await authClient.deleteUser({
        password,
        callbackURL: "/login",
      });

      if (result.error) {
        const message = getAuthErrorMessage(result.error);
        setError(message);
        toast.error(message);
        return;
      }

      clearData();
      toast.success("Account deleted.");
      setOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      const message = "Account could not be deleted.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <AccountActionButton
          className="text-destructive hover:text-destructive"
          disabled={disabled}
          icon={<Trash2 />}
          variant="destructive"
        >
          Delete my account &amp; data
        </AccountActionButton>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive dark:bg-destructive/20">
            <ShieldAlert />
          </div>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            This deletes your account and clears workout data stored on this
            device.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="delete-password">Password</Label>
            <Input
              autoComplete="current-password"
              className="mt-1"
              id="delete-password"
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
          <DialogFooter>
            <Button disabled={isPending} type="submit" variant="destructive">
              {isPending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
