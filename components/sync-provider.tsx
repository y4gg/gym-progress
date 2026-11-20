"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { WEIGHT_STORAGE_DECIMALS } from "@/lib/weight-units";
import {
  SYNC_BATCH_SIZE,
  applyPendingOperations,
  getUnchangedOperationIds,
  mergeInitialData,
  normalizeExercise,
  normalizeExerciseLog,
  normalizeWorkout,
} from "@/lib/sync";
import type {
  Exercise,
  ExerciseLog,
  SyncOperation,
  Workout,
} from "@/lib/types";
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

function getExercisePositionsById(workouts: Workout[]) {
  const exercisePositionsById = new Map<string, number>();

  for (const workout of workouts.map(normalizeWorkout)) {
    for (const exercise of workout.exercises) {
      exercisePositionsById.set(exercise.id, exercise.position);
    }
  }

  return exercisePositionsById;
}

function normalizeOperationsForSync(
  operations: SyncOperation[],
  workouts: Workout[],
) {
  const exercisePositionsById = getExercisePositionsById(workouts);

  return operations.map((operation) => {
    if ("workout" in operation) {
      return {
        ...operation,
        workout: normalizeWorkout(operation.workout),
      };
    }

    if ("exercise" in operation) {
      const legacyExercise = operation.exercise as Exercise & {
        position?: number;
      };

      return {
        ...operation,
        exercise: normalizeExercise({
          ...legacyExercise,
          position:
            legacyExercise.position ??
            exercisePositionsById.get(legacyExercise.id) ??
            0,
        }),
      };
    }

    if ("exerciseLog" in operation) {
      return {
        ...operation,
        exerciseLog: normalizeExerciseLog(operation.exerciseLog),
      };
    }

    return operation;
  });
}

function hasSyncSnapshotResult(result: unknown): result is {
  appliedOperationIds: string[];
  exerciseLogs: ExerciseLog[];
  workouts: Workout[];
} {
  return (
    typeof result === "object" &&
    result !== null &&
    "appliedOperationIds" in result &&
    "exerciseLogs" in result &&
    "workouts" in result &&
    Array.isArray(result.appliedOperationIds) &&
    Array.isArray(result.exerciseLogs) &&
    Array.isArray(result.workouts)
  );
}

export function SyncProvider() {
  const hydrated = useStoreHydrated();
  const session = authClient.useSession();
  const userId = session.data?.user.id ?? null;
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const lastToastRef = useRef<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state = useStore.getState();
    if (!isOnline) {
      state.setSyncStatus("offline");
      return;
    }
    if (session.isPending) return;
    if (session.error) {
      state.setSyncStatus(
        "error",
        "Could not connect. Changes are saved on this device.",
      );
      return;
    }
    if (!userId) {
      // A missing session must not discard unsynced local edits.
      // Explicit sign-out and account deletion clear this device's data.
      state.setSyncStatus(state.syncUserId ? "unauthorized" : "idle");
      return;
    }

    const accountId = userId;

    // Each account/connection gets its own run. Cleanup invalidates old responses
    // without a shared lock that could suppress the replacement account's run.
    let cancelled = false;
    let running = false;
    let requestPending = false;
    let queueChangedDuringRequest = false;
    let reconciled = false;
    let retryAttempts = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let changeTimer: ReturnType<typeof setTimeout> | undefined;

    function showError(key: string, message: string) {
      useStore.getState().setSyncStatus("error", message);
      if (lastToastRef.current !== key) {
        lastToastRef.current = key;
        toast.error(message);
      }
    }

    function scheduleRetry() {
      if (cancelled) return;
      if (retryAttempts >= MAX_RETRY_ATTEMPTS) {
        showError(
          "sync-failed",
          "Sync failed. Changes are saved on this device.",
        );
        return;
      }
      retryAttempts += 1;
      retryTimer = setTimeout(
        () => {
          retryTimer = undefined;
          void run();
        },
        Math.min(30_000, 1000 * 2 ** retryAttempts),
      );
    }

    function scheduleQueueChange() {
      if (cancelled || retryTimer) return;
      if (changeTimer) clearTimeout(changeTimer);
      changeTimer = setTimeout(() => {
        changeTimer = undefined;
        void run();
      }, 300);
    }

    async function run() {
      if (cancelled || running || retryTimer) return;
      running = true;
      queueChangedDuringRequest = false;
      try {
        if (!reconciled) {
          const initialState = useStore.getState();
          if (initialState.syncUserId && initialState.syncUserId !== userId) {
            initialState.clearData();
          }
          const initialOwner = useStore.getState().syncUserId;
          useStore.getState().setSyncStatus("syncing");
          requestPending = true;
          const snapshot = await getSyncSnapshot(accountId);
          requestPending = false;
          if (cancelled || useStore.getState().syncUserId !== initialOwner)
            return;
          if (!snapshot.success) {
            if (snapshot.status === "unauthorized") {
              useStore
                .getState()
                .setSyncStatus("unauthorized", "Login required to sync.");
            } else {
              showError(
                snapshot.status,
                getSyncFailureMessage(snapshot.status),
              );
              scheduleRetry();
            }
            return;
          }

          const latestState = useStore.getState();
          const serverWorkouts = snapshot.workouts.map(normalizeWorkout);
          const serverLogs = snapshot.exerciseLogs.map(normalizeExerciseLog);
          if (!latestState.syncUserId) {
            const merged = mergeInitialData(
              latestState.workouts,
              serverWorkouts,
              latestState.exerciseLogs,
              serverLogs,
            );
            for (const operation of merged.operationsToQueue) {
              latestState.enqueueSyncOperation(operation);
            }
          }
          const pending = applyPendingOperations(
            serverWorkouts,
            serverLogs,
            useStore.getState().pendingSyncOperations,
          );
          latestState.replaceWorkouts(pending.workouts);
          latestState.replaceExerciseLogs(pending.exerciseLogs);
          latestState.setSyncUser(userId);
          reconciled = true;
        }

        while (!cancelled && useStore.getState().syncUserId === userId) {
          const latestState = useStore.getState();
          // The server validates at most 200 operations per request. Keep the
          // remaining queue locally and replay it over each returned snapshot.
          const sent = latestState.pendingSyncOperations.slice(
            0,
            SYNC_BATCH_SIZE,
          );
          if (sent.length === 0) {
            latestState.setSyncStatus("synced");
            retryAttempts = 0;
            lastToastRef.current = null;
            return;
          }
          latestState.setSyncStatus("syncing");
          const operations = normalizeOperationsForSync(
            sent,
            latestState.workouts,
          );
          requestPending = true;
          queueChangedDuringRequest = false;
          const result = await syncOperations(operations, accountId, WEIGHT_STORAGE_DECIMALS);
          requestPending = false;
          if (cancelled || useStore.getState().syncUserId !== userId) return;
          if (result.status === "unauthorized") {
            useStore
              .getState()
              .setSyncStatus("unauthorized", "Login required to sync.");
            return;
          }
          if (hasSyncSnapshotResult(result)) {
            const current = useStore.getState();
            const failed =
              !result.success && result.status === "not_found"
                ? getFailedOperation(operations, result.appliedOperationIds)
                : undefined;
            // Missing entities were deleted elsewhere. Other failures retain
            // the local operation and payload so an error cannot discard data.
            const acknowledged = failed
              ? [...result.appliedOperationIds, failed.id]
              : result.appliedOperationIds;
            current.removeSyncedOperations(
              getUnchangedOperationIds(
                sent,
                current.pendingSyncOperations,
                acknowledged,
              ),
            );
            const pending = applyPendingOperations(
              result.workouts,
              result.exerciseLogs,
              useStore.getState().pendingSyncOperations,
            );
            current.replaceWorkouts(pending.workouts);
            current.replaceExerciseLogs(pending.exerciseLogs);
            if (failed) {
              showError(
                "not-found",
                "A local change could not be applied because it was deleted elsewhere.",
              );
              continue;
            }
          }
          if (!result.success) {
            showError(result.status, getSyncFailureMessage(result.status));
            if (isRetriableStatus(result.status)) scheduleRetry();
            return;
          }
          retryAttempts = 0;
        }
      } catch {
        if (cancelled) return;
        showError(
          "sync-failed",
          "Sync failed. Changes are saved on this device.",
        );
        scheduleRetry();
      } finally {
        requestPending = false;
        running = false;
        const current = useStore.getState();
        if (
          queueChangedDuringRequest &&
          current.syncUserId === userId &&
          current.pendingSyncOperations.length > 0
        ) {
          scheduleQueueChange();
        }
      }
    }

    const unsubscribe = useStore.subscribe((next, previous) => {
      if (next.pendingSyncOperations === previous.pendingSyncOperations) return;
      if (running) {
        // Only edits during the request need a wake-up. Acknowledgement cleanup
        // must not repeatedly resend an unchanged rejected operation.
        if (requestPending) queueChangedDuringRequest = true;
        return;
      }
      scheduleQueueChange();
    });
    void run();

    return () => {
      cancelled = true;
      unsubscribe();
      if (retryTimer) clearTimeout(retryTimer);
      if (changeTimer) clearTimeout(changeTimer);
    };
  }, [hydrated, isOnline, session.error, session.isPending, userId]);

  return null;
}
