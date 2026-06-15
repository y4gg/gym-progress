"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { getAuthenticatorName } from "@better-auth/passkey";
import { Fingerprint, Plus, Trash2 } from "lucide-react";
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

export function PasskeysDialog({ disabled }: { disabled?: boolean }) {
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
          <DialogTitle className="pr-8 text-2xl font-bold">
            Passkeys
          </DialogTitle>
          <DialogDescription>
            Add a passkey to sign in with your device, password manager, or
            security key.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={handleAddPasskey}>
          <div>
            <Label htmlFor="passkey-name" className="sr-only">
              Name
            </Label>
            <Input
              autoComplete="off"
              className="h-16 px-5 text-center text-xl font-semibold"
              id="passkey-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Passkey name"
              value={name}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            className="h-14 text-lg font-semibold"
            disabled={pendingAction !== null}
            type="submit"
          >
            <Plus className="size-5" />
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
                  className="grid min-h-16 grid-cols-[1fr_3.5rem] items-center gap-3 rounded-lg border bg-background pl-4"
                  key={passkey.id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">
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
                    className="h-full rounded-l-none"
                    disabled={pendingAction !== null}
                    onClick={() => void handleDeletePasskey(passkey.id)}
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
        <DialogFooter className="grid">
          <DialogClose asChild>
            <Button
              className="h-14 w-full text-lg font-semibold"
              variant="outline"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
