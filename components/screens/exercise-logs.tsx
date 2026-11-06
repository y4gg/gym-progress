"use client";

import { useMemo, useState, Suspense } from "react";
import {
  useAppSearchParams,
  useAppRouter,
  AppLink as Link,
} from "@/components/app-navigation";
import { Check, CheckSquare, Trash2, X } from "lucide-react";
import { notFound } from "next/navigation";

import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ExerciseLog } from "@/lib/types";
import { toast } from "sonner";

type LogGroup = {
  dateLabel: string;
  logs: Array<ExerciseLog & { setNumber: number }>;
  timestamp: number;
};

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatWeight(weight: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(weight);
}

function buildLogLabel(exerciseLog: ExerciseLog & { setNumber: number }) {
  const weightLabel =
    exerciseLog.weight > 0 ? `, ${formatWeight(exerciseLog.weight)} kg` : "";

  return `Set ${exerciseLog.setNumber}: ${exerciseLog.reps} reps${weightLabel}`;
}

function ExerciseLogSummary({
  exerciseLog,
  selected,
}: {
  exerciseLog: ExerciseLog & { setNumber: number };
  selected: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-3 text-sm">
      <span
        className={cn(
          "text-muted-foreground",
          selected && "text-primary-foreground/80",
        )}
      >
        Set {exerciseLog.setNumber} · {exerciseLog.reps} reps
      </span>
      {exerciseLog.weight > 0 ? (
        <span className="shrink-0 font-medium tabular-nums">
          {formatWeight(exerciseLog.weight)} kg
        </span>
      ) : null}
    </span>
  );
}

function DaySummary({ group }: { group: LogGroup }) {
  const totalReps = group.logs.reduce((total, log) => total + log.reps, 0);
  const weights = group.logs.map((log) => log.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightLabel =
    minWeight === maxWeight
      ? `${formatWeight(maxWeight)} kg`
      : `${formatWeight(minWeight)}–${formatWeight(maxWeight)} kg`;

  return (
    <span className="flex items-center justify-between gap-3 py-3">
      <span>
        <span className="block text-sm font-semibold">{group.dateLabel}</span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {group.logs.length} {group.logs.length === 1 ? "set" : "sets"} ·{" "}
          {totalReps} reps
        </span>
      </span>
      {maxWeight > 0 ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {weightLabel}
        </span>
      ) : null}
    </span>
  );
}

function groupLogs(exerciseLogs: ExerciseLog[]) {
  const groupsByDate = new Map<string, ExerciseLog[]>();

  for (const exerciseLog of exerciseLogs) {
    const dateLabel = formatDate(exerciseLog.performedAt);
    const logs = groupsByDate.get(dateLabel) ?? [];
    logs.push(exerciseLog);
    groupsByDate.set(dateLabel, logs);
  }

  const groups: LogGroup[] = [];

  for (const [dateLabel, logs] of groupsByDate) {
    const ascendingLogs = logs.toSorted(
      (firstLog, secondLog) =>
        new Date(firstLog.performedAt).getTime() -
        new Date(secondLog.performedAt).getTime(),
    );

    groups.push({
      dateLabel,
      logs: ascendingLogs.map((exerciseLog, index) => ({
        ...exerciseLog,
        setNumber: index + 1,
      })),
      timestamp: new Date(
        ascendingLogs[ascendingLogs.length - 1].performedAt,
      ).getTime(),
    });
  }

  return groups.toSorted(
    (firstGroup, secondGroup) => secondGroup.timestamp - firstGroup.timestamp,
  );
}

function ExerciseLogsView({
  exerciseId,
  groupedLogs,
  selectMode,
}: {
  exerciseId: string;
  groupedLogs: LogGroup[];
  selectMode: boolean;
}) {
  const router = useAppRouter();
  const deleteExerciseLogs = useStore((state) => state.deleteExerciseLogs);
  const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
  const selectedCount = selectedLogIds.length;

  const toggleLogSelection = (exerciseLogId: string) => {
    setSelectedLogIds((currentLogIds) =>
      currentLogIds.includes(exerciseLogId)
        ? currentLogIds.filter((logId) => logId !== exerciseLogId)
        : [...currentLogIds, exerciseLogId],
    );
  };

  const clearSelection = () => {
    setSelectedLogIds([]);
  };

  const deleteSelectedLogs = () => {
    deleteExerciseLogs(selectedLogIds);
    setSelectedLogIds([]);
    router.push(`/e/${exerciseId}/logs`);
    toast.success("Logs deleted.");
  };

  return (
    <main className="mx-auto w-full max-w-md px-6 py-9 pb-32">
      <h1 className="mb-6 truncate text-center text-3xl font-bold">Logs</h1>

      {groupedLogs.length === 0 ? (
        <p className="py-16 text-center text-lg font-medium text-muted-foreground">
          No logs yet.
        </p>
      ) : (
        <div className="divide-y">
          {groupedLogs.map((group) => (
            <details key={group.dateLabel} open={selectMode ? true : undefined}>
              <summary className="cursor-pointer list-none rounded-sm focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                <DaySummary group={group} />
              </summary>

              <div className="mb-3 flex flex-col divide-y border-t">
                {group.logs.map((exerciseLog) => {
                  const selected = selectedLogIds.includes(exerciseLog.id);

                  return (
                    <button
                      aria-label={buildLogLabel(exerciseLog)}
                      aria-pressed={selectMode ? selected : undefined}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between gap-3 rounded-sm bg-background px-2 text-left transition-colors",
                        "hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        !selectMode && "cursor-default hover:bg-background",
                        selected &&
                          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                      disabled={!selectMode}
                      key={exerciseLog.id}
                      onClick={() => toggleLogSelection(exerciseLog.id)}
                      type="button"
                    >
                      <ExerciseLogSummary
                        exerciseLog={exerciseLog}
                        selected={selected}
                      />
                      {selectMode ? (
                        <Check
                          className={cn(
                            "size-5 shrink-0 opacity-0",
                            selected && "opacity-100",
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      )}

      {groupedLogs.length > 0 ? (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-6">
          {selectMode && selectedCount > 0 ? (
            <div className="grid w-full max-w-sm grid-cols-2 gap-2 rounded-xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur-md">
              <DeleteDialog
                description="This permanently deletes the selected set logs."
                element={
                  <Button
                    className="h-12 text-base font-semibold"
                    variant="destructive"
                  >
                    <Trash2 className="size-6" />
                    <span>Delete selected</span>
                  </Button>
                }
                onConfirm={deleteSelectedLogs}
                title="Delete logs?"
              />
              <Button
                className="h-12 text-base font-semibold"
                onClick={clearSelection}
                type="button"
                variant="outline"
              >
                <X className="size-6" />
                <span>Clear</span>
              </Button>
            </div>
          ) : selectMode ? (
            <Button
              asChild
              className="h-16 w-full max-w-sm text-base font-semibold shadow-lg"
              variant="outline"
            >
              <Link href={`/e/${exerciseId}/logs`}>
                <X className="size-6" />
                <span>Cancel</span>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              className="h-16 w-full max-w-sm text-base font-semibold shadow-lg"
              variant="secondary"
            >
              <Link href={`/e/${exerciseId}/logs?select=1`}>
                <CheckSquare className="size-6" />
                <span>Select</span>
              </Link>
            </Button>
          )}
        </div>
      ) : null}
    </main>
  );
}

function ExerciseLogsPageContent({ exerciseId }: { exerciseId: string }) {
  const hydrated = useStoreHydrated();
  const searchParams = useAppSearchParams();
  const selectMode = searchParams.get("select") === "1";

  const exercise = useStore((state) => state.getExerciseById(exerciseId));
  const workout = useStore((state) =>
    exercise ? state.getWorkoutById(exercise.workoutId) : undefined,
  );
  const exerciseLogs = useStore((state) => state.exerciseLogs);

  const groupedLogs = useMemo(() => {
    return groupLogs(
      exerciseLogs.filter(
        (exerciseLog) => exerciseLog.exerciseId === exerciseId,
      ),
    );
  }, [exerciseId, exerciseLogs]);

  if (!hydrated) return null;
  if (!exercise || !workout) notFound();

  return (
    <ExerciseLogsView
      exerciseId={exercise.id}
      groupedLogs={groupedLogs}
      key={selectMode ? "select" : "read"}
      selectMode={selectMode}
    />
  );
}

export default function ExerciseLogsPage({
  exerciseId,
}: {
  exerciseId: string;
}) {
  return (
    <Suspense fallback={null}>
      <ExerciseLogsPageContent exerciseId={exerciseId} />
    </Suspense>
  );
}
