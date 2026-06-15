"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  LogIn,
  WifiOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SyncStatus() {
  const status = useStore((state) => state.syncStatus);
  const pendingCount = useStore((state) => state.pendingSyncOperations.length);
  const lastSyncError = useStore((state) => state.lastSyncError);

  const statusConfig = {
    idle: {
      icon: LogIn,
      label: "Login required",
      className: "text-muted-foreground",
    },
    syncing: {
      icon: LoaderCircle,
      label: "Syncing",
      className: "text-muted-foreground",
    },
    synced: {
      icon: CheckCircle2,
      label: pendingCount > 0 ? "Syncing" : "Synced",
      className: "text-emerald-600 dark:text-emerald-400",
    },
    offline: {
      icon: WifiOff,
      label: "Offline",
      className: "text-amber-600 dark:text-amber-400",
    },
    error: {
      icon: AlertCircle,
      label: "Sync failed",
      className: "text-destructive",
    },
    unauthorized: {
      icon: LogIn,
      label: "Login required",
      className: "text-destructive",
    },
  }[status];

  const Icon = statusConfig.icon;

  return (
    <Button
      aria-label={lastSyncError ? `${statusConfig.label}: ${lastSyncError}` : statusConfig.label}
      className={cn(
        "h-12 w-full justify-start gap-3 px-4 text-base",
        statusConfig.className,
      )}
      disabled
      title={lastSyncError ?? statusConfig.label}
      type="button"
      variant="outline"
    >
      <Icon
        className={cn("size-5", status === "syncing" && "animate-spin")}
      />
      <span className="min-w-0 truncate">{statusConfig.label}</span>
    </Button>
  );
}
