"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

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

export function ChangeEmailDialog({
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
          <DialogTitle className="pr-8 text-2xl font-bold">
            Change email
          </DialogTitle>
          <DialogDescription>
            {currentEmail
              ? `Current email: ${currentEmail}`
              : "Update your email address."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="new-email" className="sr-only">
              New email
            </Label>
            <Input
              autoComplete="email"
              className="h-16 px-5 text-center text-xl font-semibold"
              id="new-email"
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="New email"
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
