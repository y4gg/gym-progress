"use client";

import { use, useMemo, useState, Suspense } from "react";
import type { ReactNode } from "react";
import { Check, Dumbbell, Hash, Repeat2, Trash2, X } from "lucide-react";
import { notFound, useRouter, useSearchParams } from "next/navigation";

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
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
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

function LogMetric({
  icon,
  label,
  selected,
  value,
}: {
  icon: ReactNode;
  label: string;
  selected: boolean;
  value: string | number;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2",
        selected && "border-primary-foreground/20 bg-primary-foreground/10",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground",
          selected && "bg-primary-foreground/15 text-primary-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "truncate text-[0.65rem] font-bold uppercase text-muted-foreground",
            selected && "text-primary-foreground/70",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "truncate text-xl font-bold tabular-nums text-foreground",
            selected && "text-primary-foreground",
          )}
        >
          {value}
        </span>
      </span>
    </span>
  );
}

function ExerciseLogSummary({
  exerciseLog,
  selected,
}: {
  exerciseLog: ExerciseLog & { setNumber: number };
  selected: boolean;
}) {
  const hasWeight = exerciseLog.weight > 0;

  return (
    <span className="grid min-w-0 flex-1 grid-cols-[4.5rem_1fr] gap-2">
      <span
        className={cn(
          "flex min-w-0 flex-col items-center justify-center rounded-md border border-border bg-card px-2 py-2",
          selected && "border-primary-foreground/25 bg-primary-foreground/15",
        )}
      >
        <Hash
          className={cn(
            "mb-1 size-4 text-muted-foreground",
            selected && "text-primary-foreground/70",
          )}
          aria-hidden
        />
        <span
          className={cn(
            "text-[0.65rem] font-bold uppercase leading-none text-muted-foreground",
            selected && "text-primary-foreground/70",
          )}
        >
          Set
        </span>
        <span className="mt-1 text-2xl font-bold leading-none tabular-nums">
          {exerciseLog.setNumber}
        </span>
      </span>

      <span
        className={cn(
          "grid min-w-0 gap-2",
          hasWeight ? "grid-cols-2" : "grid-cols-1",
        )}
      >
        <LogMetric
          icon={<Repeat2 className="size-4" aria-hidden />}
          label="Reps"
          selected={selected}
          value={exerciseLog.reps}
        />
        {hasWeight ? (
          <LogMetric
            icon={<Dumbbell className="size-4" aria-hidden />}
            label="Kg"
            selected={selected}
            value={formatWeight(exerciseLog.weight)}
          />
        ) : null}
      </span>
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
      timestamp: new Date(ascendingLogs[ascendingLogs.length - 1].performedAt).getTime(),
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
  workoutName,
}: {
  exerciseId: string;
  groupedLogs: LogGroup[];
  selectMode: boolean;
  workoutName: string;
}) {
  const router = useRouter();
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
    <main className="mx-auto w-full max-w-sm px-6 py-9 pb-32">
      <h1 className="mb-6 truncate text-center text-3xl font-bold">Logs</h1>

      {groupedLogs.length === 0 ? (
        <p className="py-16 text-center text-lg font-medium text-muted-foreground">
          No logs yet.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {groupedLogs.map((group) => (
            <section className="flex flex-col gap-2" key={group.dateLabel}>
              <h2 className="px-1 text-2xl font-semibold">
                {group.dateLabel} ({workoutName})
              </h2>

              <div className="flex flex-col gap-2">
                {group.logs.map((exerciseLog) => {
                  const selected = selectedLogIds.includes(exerciseLog.id);

                  return (
                    <button
                      aria-label={buildLogLabel(exerciseLog)}
                      aria-pressed={selectMode ? selected : undefined}
                      className={cn(
                        "flex min-h-20 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background p-2 text-left transition-colors",
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
            </section>
          ))}
        </div>
      )}

      {selectMode && selectedCount > 0 ? (
        <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-6">
          <div className="grid w-full max-w-sm grid-cols-2 gap-2 rounded-xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur-md">
            <DeleteDialog
              description="This permanently deletes the selected set logs."
              element={
                <Button className="h-12 text-base font-semibold" variant="destructive">
                  <Trash2 />
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
              <X />
              <span>Clear</span>
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ExerciseLogsPageContent({
  params,
}: {
  params: Promise<{ Id: string }>;
}) {
  const { Id: exerciseId } = use(params);
  const hydrated = useStoreHydrated();
  const searchParams = useSearchParams();
  const selectMode = searchParams.get("select") === "1";

  const exercise = useStore((state) => state.getExerciseById(exerciseId));
  const workout = useStore((state) =>
    exercise ? state.getWorkoutById(exercise.workoutId) : undefined,
  );
  const exerciseLogs = useStore((state) => state.exerciseLogs);

  const groupedLogs = useMemo(() => {
    return groupLogs(
      exerciseLogs.filter((exerciseLog) => exerciseLog.exerciseId === exerciseId),
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
      workoutName={workout.name}
    />
  );
}

export default function ExerciseLogsPage({
  params,
}: {
  params: Promise<{ Id: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <ExerciseLogsPageContent params={params} />
    </Suspense>
  );
}
