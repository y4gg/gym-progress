"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import {
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

  const scheduleRetry = useCallback(() => {
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
  }, [showToastOnce]);

  const flushQueue = useCallback(async () => {
    if (!hydrated || !userId || isFlushingRef.current) return;

    const state = useStore.getState();

    if (state.syncUserId !== userId) return;

    if (!isOnline) {
      state.setSyncStatus("offline");
      return;
    }

    const sentOperations = state.pendingSyncOperations;
    const operations = normalizeOperationsForSync(
      sentOperations,
      state.workouts,
    );
    if (operations.length === 0) {
      state.setSyncStatus("synced");
      clearRetry();
      return;
    }

    isFlushingRef.current = true;
    state.setSyncStatus("syncing");

    try {
      const result = await syncOperations(operations);
      if (useStore.getState().syncUserId !== userId) return;

      if (result.success) {
        const latestState = useStore.getState();
        latestState.removeSyncedOperations(
          getUnchangedOperationIds(
            sentOperations,
            latestState.pendingSyncOperations,
            result.appliedOperationIds,
          ),
        );
        const snapshotWithPending = applyPendingOperations(
          result.workouts,
          result.exerciseLogs,
          useStore.getState().pendingSyncOperations,
        );
        latestState.replaceWorkouts(snapshotWithPending.workouts);
        latestState.replaceExerciseLogs(snapshotWithPending.exerciseLogs);
        latestState.setSyncStatus("synced");
        clearRetry();
        lastToastRef.current = null;
        if (useStore.getState().pendingSyncOperations.length > 0) {
          queueMicrotask(() => flushQueueRef.current());
        }
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

        latestState.removeSyncedOperations(
          getUnchangedOperationIds(
            sentOperations,
            latestState.pendingSyncOperations,
            operationIdsToRemove,
          ),
        );
        const snapshotWithPending = applyPendingOperations(
          result.workouts,
          result.exerciseLogs,
          useStore.getState().pendingSyncOperations,
        );
        latestState.replaceWorkouts(snapshotWithPending.workouts);
        latestState.replaceExerciseLogs(snapshotWithPending.exerciseLogs);

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
  }, [clearRetry, hydrated, isOnline, scheduleRetry, showToastOnce, userId]);

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
    if (!hydrated) return;
    if (!isOnline) {
      useStore.getState().setSyncStatus("offline");
      return;
    }
    if (session.isPending || isReconcilingRef.current) return;
    if (session.error) {
      useStore
        .getState()
        .setSyncStatus(
          "error",
          "Could not connect. Changes are saved on this device.",
        );
      return;
    }

    let cancelled = false;

    async function reconcileAccount() {
      const state = useStore.getState();

      if (!userId) {
        // An expired or unavailable session must not discard unsynced local edits.
        // Explicit sign-out and account deletion already clear this device's data.
        state.setSyncStatus(state.syncUserId ? "unauthorized" : "idle");
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
        const serverExerciseLogs =
          snapshot.exerciseLogs.map(normalizeExerciseLog);

        if (!latestState.syncUserId) {
          const merged = mergeInitialData(
            latestState.workouts,
            serverWorkouts,
            latestState.exerciseLogs,
            serverExerciseLogs,
          );

          latestState.replaceWorkouts(merged.workouts);
          latestState.replaceExerciseLogs(merged.exerciseLogs);
          latestState.setSyncUser(userId);
          for (const operation of merged.operationsToQueue) {
            useStore.getState().enqueueSyncOperation(operation);
          }
        } else if (latestState.syncUserId !== userId) {
          latestState.replaceWorkouts(serverWorkouts);
          latestState.replaceExerciseLogs(serverExerciseLogs);
          latestState.setSyncUser(userId);
        } else {
          const snapshotWithPending = applyPendingOperations(
            serverWorkouts,
            serverExerciseLogs,
            latestState.pendingSyncOperations,
          );
          latestState.replaceWorkouts(snapshotWithPending.workouts);
          latestState.replaceExerciseLogs(snapshotWithPending.exerciseLogs);
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
    session.error,
    session.isPending,
    showToastOnce,
    syncUserId,
    userId,
  ]);

  return null;
}
