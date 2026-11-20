"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  LogIn,
  WifiOff,
} from "lucide-react";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SyncStatus() {
  const status = useStore((state) => state.syncStatus);
  const pendingCount = useStore((state) => state.pendingSyncOperations.length);
  const lastSyncError = useStore((state) => state.lastSyncError);

  const statusConfig = {
    idle: {
      icon: LoaderCircle,
      label: "Waiting to sync",
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
      label: "Sync paused",
      className: "text-amber-600 dark:text-amber-400",
    },
    error: {
      icon: AlertCircle,
      label: "Sync failed",
      className: "text-destructive",
    },
    unauthorized: {
      icon: LogIn,
      label: "Sign-in required",
      className: "text-destructive",
    },
  }[status];

  const Icon = statusConfig.icon;

  return (
    <span
      role="status"
      className={cn("inline-flex items-center gap-2", statusConfig.className)}
      title={lastSyncError ?? statusConfig.label}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4 shrink-0", status === "syncing" && "motion-safe:animate-spin")}
      />
      {statusConfig.label}
    </span>
  );
}
