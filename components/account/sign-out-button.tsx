"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AccountActionButton } from "@/components/account/account-action-button";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";

export function SignOutButton({ disabled }: { disabled?: boolean }) {
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

      useStore.getState().clearData();
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
