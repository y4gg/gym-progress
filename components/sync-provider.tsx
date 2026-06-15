"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import {
  applyPendingOperations,
  mergeInitialWorkouts,
  normalizeWorkout,
} from "@/lib/sync";
import type { SyncOperation, Workout } from "@/lib/types";
import { getSyncSnapshot, syncOperations } from "@/server/sync";

const MAX_RETRY_ATTEMPTS = 5;

function getFailedOperation(
  operations: SyncOperation[],
  appliedOperationIds: string[],
) {
  const appliedIds = new Set(appliedOperationIds);
  return operations.find((operation) => !appliedIds.has(operation.id));
}

function isRetriableStatus(status: string) {
  return status === "server_error";
}

function getSyncFailureMessage(status: string) {
  if (status === "server_error") {
    return "Sync failed on the server. Check database migrations and server logs.";
  }

  if (status === "invalid_payload" || status === "invalid_id") {
    return "Sync failed because local data could not be validated.";
  }

  if (status === "conflict") {
    return "Sync failed because the data belongs to another account.";
  }

  return "Sync failed.";
}

function hasSyncSnapshotResult(
  result: unknown,
): result is {
  appliedOperationIds: string[];
  workouts: Workout[];
} {
  return (
    typeof result === "object" &&
    result !== null &&
    "appliedOperationIds" in result &&
    "workouts" in result &&
    Array.isArray(result.appliedOperationIds) &&
    Array.isArray(result.workouts)
  );
}

export function SyncProvider() {
  const hydrated = useStoreHydrated();
  const session = authClient.useSession();
  const userId = session.data?.user.id ?? null;
  const syncUserId = useStore((state) => state.syncUserId);
  const pendingOperationCount = useStore(
    (state) => state.pendingSyncOperations.length,
  );
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const isReconcilingRef = useRef(false);
  const isFlushingRef = useRef(false);
  const flushQueueRef = useRef<() => void>(() => {});
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptsRef = useRef(0);
  const lastToastRef = useRef<string | null>(null);

  const clearRetry = useCallback(() => {
    retryAttemptsRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const showToastOnce = useCallback((key: string, message: string) => {
    if (lastToastRef.current === key) return;
    lastToastRef.current = key;
    toast.error(message);
  }, []);

  const scheduleRetry = useCallback(
    () => {
      if (retryAttemptsRef.current >= MAX_RETRY_ATTEMPTS) {
        useStore
          .getState()
          .setSyncStatus("error", "Sync failed. Changes will retry.");
        showToastOnce("sync-failed", "Sync failed. Changes will retry.");
        return;
      }

      retryAttemptsRef.current += 1;
      const delay = Math.min(30_000, 1000 * 2 ** retryAttemptsRef.current);

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      retryTimeoutRef.current = setTimeout(() => {
        flushQueueRef.current();
      }, delay);
    },
    [showToastOnce],
  );

  const flushQueue = useCallback(async () => {
    if (!hydrated || !userId || isFlushingRef.current) return;

    const state = useStore.getState();

    if (state.syncUserId !== userId) return;

    if (!isOnline) {
      state.setSyncStatus("offline");
      return;
    }

    const operations = state.pendingSyncOperations;
    if (operations.length === 0) {
      state.setSyncStatus("synced");
      clearRetry();
      return;
    }

    isFlushingRef.current = true;
    state.setSyncStatus("syncing");

    try {
      const result = await syncOperations(operations);

      if (result.success) {
        const latestState = useStore.getState();
        latestState.removeSyncedOperations(result.appliedOperationIds);
        latestState.replaceWorkouts(result.workouts);
        latestState.setSyncStatus("synced");
        clearRetry();
        lastToastRef.current = null;
        return;
      }

      if (result.status === "unauthorized") {
        useStore
          .getState()
          .setSyncStatus("unauthorized", "Login required to sync.");
        showToastOnce("unauthorized", "Session expired. Login required.");
        return;
      }

      if (hasSyncSnapshotResult(result)) {
        const failedOperation = getFailedOperation(
          operations,
          result.appliedOperationIds,
        );
        const operationIdsToRemove = failedOperation
          ? [...result.appliedOperationIds, failedOperation.id]
          : result.appliedOperationIds;
        const latestState = useStore.getState();

        latestState.removeSyncedOperations(operationIdsToRemove);
        latestState.replaceWorkouts(result.workouts);

        if (result.status === "not_found") {
          latestState.setSyncStatus(
            "error",
            "A local change could not be applied.",
          );
          showToastOnce(
            "not-found",
            "A local change could not be applied because it was deleted elsewhere.",
          );
          return;
        }
      }

      const message = getSyncFailureMessage(result.status);
      useStore.getState().setSyncStatus("error", message);

      if (isRetriableStatus(result.status)) {
        scheduleRetry();
      } else {
        showToastOnce(`sync-error-${result.status}`, message);
      }
    } catch {
      useStore.getState().setSyncStatus("error", "Sync failed.");
      scheduleRetry();
    } finally {
      isFlushingRef.current = false;
    }
  }, [
    clearRetry,
    hydrated,
    isOnline,
    scheduleRetry,
    showToastOnce,
    userId,
  ]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
      useStore.getState().setSyncStatus("offline");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    flushQueueRef.current = () => {
      void flushQueue();
    };
  }, [flushQueue]);

  useEffect(() => {
    if (!isOnline) return;
    flushQueue();
  }, [flushQueue, isOnline, pendingOperationCount]);

  useEffect(() => {
    if (!hydrated || session.isPending || isReconcilingRef.current) return;

    let cancelled = false;

    async function reconcileAccount() {
      const state = useStore.getState();

      if (!userId) {
        if (state.syncUserId) {
          state.clearData();
        }
        useStore.getState().setSyncStatus("idle");
        return;
      }

      if (!isOnline) {
        state.setSyncStatus("offline");
        return;
      }

      isReconcilingRef.current = true;
      state.setSyncStatus("syncing");

      try {
        if (state.syncUserId && state.syncUserId !== userId) {
          state.clearData();
        }

        const snapshot = await getSyncSnapshot();

        if (cancelled) return;

        if (!snapshot.success) {
          if (snapshot.status === "unauthorized") {
            useStore
              .getState()
              .setSyncStatus("unauthorized", "Login required to sync.");
            showToastOnce("unauthorized", "Session expired. Login required.");
            return;
          }

          const message = getSyncFailureMessage(snapshot.status);
          useStore.getState().setSyncStatus("error", message);
          scheduleRetry();
          return;
        }

        const latestState = useStore.getState();
        const serverWorkouts = snapshot.workouts.map(normalizeWorkout);

        if (!latestState.syncUserId) {
          const merged = mergeInitialWorkouts(
            latestState.workouts,
            serverWorkouts,
          );

          latestState.replaceWorkouts(merged.workouts);
          latestState.setSyncUser(userId);
          for (const operation of merged.operationsToQueue) {
            useStore.getState().enqueueSyncOperation(operation);
          }
        } else if (latestState.syncUserId !== userId) {
          latestState.replaceWorkouts(serverWorkouts);
          latestState.setSyncUser(userId);
        } else {
          latestState.replaceWorkouts(
            applyPendingOperations(
              serverWorkouts,
              latestState.pendingSyncOperations,
            ),
          );
        }

        await flushQueue();
      } catch {
        useStore
          .getState()
          .setSyncStatus("error", "Sync failed before contacting the server.");
        scheduleRetry();
      } finally {
        isReconcilingRef.current = false;
      }
    }

    void reconcileAccount();

    return () => {
      cancelled = true;
    };
  }, [
    flushQueue,
    hydrated,
    isOnline,
    scheduleRetry,
    session.isPending,
    showToastOnce,
    syncUserId,
    userId,
  ]);

  return null;
}
