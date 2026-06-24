"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ExerciseLog } from "@/lib/types";

const MAX_WEIGHT_CHANGE_POINTS = 8;

type WeightChangePoint = {
  id: string;
  weight: number;
  reps: number;
  performedAt: string;
};

type ChartPoint = WeightChangePoint & {
  height: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function formatWeight(weight: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(weight);
}

function buildWeightChangePoints(exerciseLogs: ExerciseLog[]) {
  const weightedLogs = exerciseLogs
    .filter((exerciseLog) => exerciseLog.weight > 0)
    .toSorted(
      (firstLog, secondLog) =>
        new Date(firstLog.performedAt).getTime() -
        new Date(secondLog.performedAt).getTime(),
    );

  const weightChangePoints: WeightChangePoint[] = [];

  for (const exerciseLog of weightedLogs) {
    const lastPoint = weightChangePoints[weightChangePoints.length - 1];
    const point = {
      id: exerciseLog.id,
      weight: exerciseLog.weight,
      reps: exerciseLog.reps,
      performedAt: exerciseLog.performedAt,
    };

    if (!lastPoint || lastPoint.weight !== exerciseLog.weight) {
      weightChangePoints.push(point);
      continue;
    }

    weightChangePoints[weightChangePoints.length - 1] = point;
  }

  return weightChangePoints.slice(-MAX_WEIGHT_CHANGE_POINTS);
}

function buildChartPoints(points: WeightChangePoint[]) {
  if (points.length === 0) {
    return {
      chartPoints: [],
      minWeight: 0,
      maxWeight: 0,
    };
  }

  const weights = points.map((point) => point.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = maxWeight - minWeight;
  const chartPoints: ChartPoint[] = points.map((point) => ({
    ...point,
    height: range === 0 ? 55 : ((point.weight - minWeight) / range) * 72 + 18,
  }));

  return {
    chartPoints,
    minWeight,
    maxWeight,
  };
}

function EmptyHistoryState({
  exerciseId,
  showViewLogs,
}: {
  exerciseId: string;
  showViewLogs: boolean;
}) {
  return (
    <section className="flex min-h-[26rem] flex-1 flex-col items-center justify-center text-center">
      <p className="text-xl font-semibold">No weighted logs yet.</p>
      <p className="mt-2 text-base font-medium text-muted-foreground">
        Log sets with weight to build history.
      </p>
      {showViewLogs ? (
        <Button asChild className="mt-6 h-12 px-5 text-base font-semibold">
          <Link href={`/e/${exerciseId}/logs`}>View logs</Link>
        </Button>
      ) : null}
    </section>
  );
}

function WeightHistoryChart({
  maxWeight,
  minWeight,
  points,
}: {
  maxWeight: number;
  minWeight: number;
  points: ChartPoint[];
}) {
  return (
    <section className="flex min-h-[26rem] flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between px-1 text-sm font-semibold tabular-nums text-muted-foreground">
        <span>{formatWeight(minWeight)} kg</span>
        <span>{formatWeight(maxWeight)} kg</span>
      </div>

      <div
        className="grid flex-1 grid-cols-[repeat(var(--bar-count),minmax(0,1fr))] items-end gap-2"
        style={{ "--bar-count": points.length } as React.CSSProperties}
      >
        {points.map((point, index) => {
          const isLatest = index === points.length - 1;
          const weightLabel = formatWeight(point.weight);
          const dateLabel = formatDate(point.performedAt);

          return (
            <div
              className="flex h-full min-w-0 flex-col justify-end gap-2"
              key={point.id}
            >
              <div className="flex min-h-0 flex-1 items-end rounded-md bg-muted/40 px-1">
                <div
                  aria-label={`${weightLabel} kg on ${dateLabel}`}
                  className={cn(
                    "w-full rounded-t-md bg-primary/70 transition-colors",
                    isLatest && "bg-primary",
                  )}
                  style={{ height: `${point.height}%` }}
                  title={`${weightLabel} kg, ${point.reps} reps, ${dateLabel}`}
                />
              </div>
              <span className="truncate text-center text-xs font-semibold tabular-nums text-muted-foreground">
                {weightLabel}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ Id: string }>;
}) {
  const { Id: exerciseId } = use(params);
  const hydrated = useStoreHydrated();
  const exercise = useStore((state) => state.getExerciseById(exerciseId));
  const workout = useStore((state) =>
    exercise ? state.getWorkoutById(exercise.workoutId) : undefined,
  );
  const exerciseLogs = useStore((state) => state.exerciseLogs);

  const currentExerciseLogs = useMemo(() => {
    return exerciseLogs.filter(
      (exerciseLog) => exerciseLog.exerciseId === exerciseId,
    );
  }, [exerciseId, exerciseLogs]);

  const weightChangePoints = useMemo(() => {
    return buildWeightChangePoints(currentExerciseLogs);
  }, [currentExerciseLogs]);

  const { chartPoints, minWeight, maxWeight } = useMemo(
    () => buildChartPoints(weightChangePoints),
    [weightChangePoints],
  );

  if (!hydrated) return null;
  if (!exercise || !workout) notFound();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col px-6 py-9 pb-32">
      <h1 className="mb-4 truncate text-center text-3xl font-bold">History</h1>

      <div className="mb-4 min-w-0 text-center">
        <p className="truncate text-xl font-semibold">{exercise.name}</p>
        <p className="truncate text-sm font-medium text-muted-foreground">
          {workout.name}
        </p>
      </div>

      {chartPoints.length === 0 ? (
        <EmptyHistoryState
          exerciseId={exercise.id}
          showViewLogs={currentExerciseLogs.length > 0}
        />
      ) : (
        <WeightHistoryChart
          maxWeight={maxWeight}
          minWeight={minWeight}
          points={chartPoints}
        />
      )}
    </main>
  );
}
