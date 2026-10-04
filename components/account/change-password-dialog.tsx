"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { addPassword } from "@/app/(account)/account/actions";
import { AccountActionButton } from "@/components/account/account-action-button";
import { getAuthErrorMessage } from "@/components/account/auth-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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

export function ChangePasswordDialog({ disabled }: { disabled?: boolean }) {
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled) return;

    let cancelled = false;

    async function loadAccounts() {
      try {
        const result = await authClient.listAccounts();
        if (cancelled) return;

        if (result.error || !result.data) {
          setAccountsError("Password settings could not be loaded.");
          return;
        }

        setHasPassword(
          result.data.some((account) => account.providerId === "credential"),
        );
      } catch {
        if (!cancelled) {
          setAccountsError("Password settings could not be loaded.");
        }
      }
    }

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [disabled, loadAttempt]);

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    setError(null);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || disabled || hasPassword === null) return;
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    try {
      const result = hasPassword
        ? await authClient.changePassword({
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
          })
        : await addPassword(newPassword);

      if (result.error) {
        const message = getAuthErrorMessage(result.error);
        setError(message);
        toast.error(message);
        return;
      }

      toast.success(hasPassword ? "Password updated." : "Password added.");
      setHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOpen(false);
    } catch {
      const message = hasPassword
        ? "Password could not be updated."
        : "Password could not be added.";
      setError(message);
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <AccountActionButton
          disabled={disabled || hasPassword === null}
          icon={<KeyRound />}
        >
          {hasPassword === null
            ? "Password"
            : hasPassword
              ? "Change Password"
              : "Add Password"}
        </AccountActionButton>
      </DialogTrigger>
      {accountsError ? (
        <div className="text-sm">
          <p className="text-destructive" role="alert">
            {accountsError}
          </p>
          <Button
            disabled={disabled}
            onClick={() => {
              setAccountsError(null);
              setLoadAttempt((attempt) => attempt + 1);
            }}
            variant="outline"
          >
            Retry
          </Button>
        </div>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8 text-2xl font-bold">
            {hasPassword ? "Change password" : "Add password"}
          </DialogTitle>
          <DialogDescription>
            {hasPassword
              ? "Other signed-in sessions will be revoked."
              : "Add a password to also sign in with your email address."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          {hasPassword ? (
            <div>
              <Label htmlFor="current-password" className="sr-only">
                Current password
              </Label>
              <Input
                autoComplete="current-password"
                className="h-16 px-5 text-center text-xl font-semibold"
                id="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password"
                required
                type="password"
                value={currentPassword}
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor="new-password" className="sr-only">
              New password
            </Label>
            <Input
              autoComplete="new-password"
              className="h-16 px-5 text-center text-xl font-semibold"
              id="new-password"
              minLength={8}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              required
              type="password"
              value={newPassword}
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="sr-only">
              Confirm password
            </Label>
            <Input
              autoComplete="new-password"
              className="h-16 px-5 text-center text-xl font-semibold"
              id="confirm-password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
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
          <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
            <DialogClose asChild>
              <Button className="h-14 text-lg font-semibold" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              className="h-14 text-lg font-semibold"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
