"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ShieldAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { useStore } from "@/lib/store";

export function DeleteAccountDialog({ disabled }: { disabled?: boolean }) {
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
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive dark:bg-destructive/20">
            <ShieldAlert />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Delete account?
          </DialogTitle>
          <DialogDescription>
            This deletes your account and clears workout data stored on this
            device.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="delete-password" className="sr-only">
              Password
            </Label>
            <Input
              autoComplete="current-password"
              className="h-16 px-5 text-center text-xl font-semibold"
              id="delete-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
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
              variant="destructive"
            >
              {isPending ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
