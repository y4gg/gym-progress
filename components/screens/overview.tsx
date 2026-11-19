"use client";

import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Weight,
} from "lucide-react";

import { AppLink } from "@/components/app-navigation";
import { Button } from "@/components/ui/button";
import { WorkoutIcon } from "@/components/workout-icon";
import { buildProgressOverview } from "@/lib/progress-overview";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { cn } from "@/lib/utils";

const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const signedNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const compactNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const weekCounts = [4, 12];
type Progress = ReturnType<typeof buildProgressOverview>;

function WeeklyActivity({ weeks }: { weeks: Progress["weeks"] }) {
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const selected =
    weeks.find((week) => week.start === selectedStart) ?? weeks[weeks.length - 1];

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Weekly activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Days with at least one logged set
          </p>
        </div>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {selected.days} {selected.days === 1 ? "day" : "days"}
          </span>
          {" · "}
          {date.formatRange(selected.start, selected.end)}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-[1.25rem_minmax(0,1fr)]">
        <div
          aria-hidden
          className="relative h-36 text-xs tabular-nums text-muted-foreground sm:h-44"
        >
          <span className="absolute top-0 -translate-y-1/2">7</span>
          <span className="absolute bottom-[57.1429%] translate-y-1/2">4</span>
          <span className="absolute bottom-0 translate-y-1/2">0</span>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-36 border-y border-border sm:h-44"
          >
            <div className="absolute inset-x-0 bottom-[57.1429%] border-t border-dashed" />
          </div>
          <ul
            aria-label="Training days by week"
            className="relative flex gap-1.5 sm:gap-3"
          >
            {weeks.map((week, index) => {
              const active = week.start === selected.start;
              const showDate = weeks.length === 4 || index % 3 === 0 || index === weeks.length - 1;
              return (
                <li className="relative min-w-0 flex-1 pb-7" key={week.start}>
                  <button
                    type="button"
                    aria-label={`${date.formatRange(week.start, week.end)}, ${week.days} ${week.days === 1 ? "day" : "days"}`}
                    aria-pressed={active}
                    onClick={() => setSelectedStart(week.start)}
                    className="group flex h-36 w-full items-end justify-center rounded-t-md px-0.5 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring sm:h-44"
                  >
                    <span
                      className={cn(
                        "min-h-px w-full max-w-20 rounded-t-md",
                        active
                          ? "bg-emerald-700 dark:bg-emerald-400"
                          : "bg-emerald-700/55 group-hover:bg-emerald-700/75 dark:bg-emerald-400/50 dark:group-hover:bg-emerald-400/75",
                      )}
                      style={{ height: `${(week.days / 7) * 100}%` }}
                    />
                  </button>
                  {showDate && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-[10px] whitespace-nowrap text-muted-foreground sm:text-xs"
                    >
                      {date.format(week.start)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function Overview() {
  const hydrated = useStoreHydrated();
  const workouts = useStore((state) => state.workouts);
  const logs = useStore((state) => state.exerciseLogs);
  const [weekCount, setWeekCount] = useState(weekCounts[0]);

  if (!hydrated) return null;

  const now = new Date();
  const progress = buildProgressOverview(workouts, logs, weekCount, now);
  const metrics = [
    { label: "Training days", value: progress.trainingDays, icon: CalendarDays },
    { label: "Sets logged", value: progress.sets, icon: Dumbbell },
    { label: "Volume", value: progress.volume, unit: "kg", icon: Weight },
  ];

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-5 px-4 pt-8 pb-28 sm:px-8 lg:gap-6 lg:pt-12 lg:pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Overview</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {date.formatRange(progress.weeks[0].start, now)}
          </p>
        </div>
        <div
          role="group"
          aria-label="Overview period"
          className="inline-flex rounded-xl border bg-muted/50 p-1"
        >
          {weekCounts.map((weeks) => (
            <button
              type="button"
              key={weeks}
              aria-pressed={weeks === weekCount}
              onClick={() => setWeekCount(weeks)}
              className={cn(
                "min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring",
                weeks === weekCount
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {weeks} weeks
            </button>
          ))}
        </div>
      </header>

      <dl className="grid grid-cols-3 gap-2 sm:gap-4">
        {metrics.map(({ label, value, unit, icon: Icon }) => (
          <div key={label} className="min-w-0 rounded-2xl border bg-card p-3 sm:p-5">
            <dt className="flex flex-col gap-2 text-[11px] font-medium text-muted-foreground min-[360px]:text-xs sm:flex-row sm:items-center sm:text-sm">
              <Icon
                className="size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                aria-hidden
              />
              {label}
            </dt>
            <dd
              className="mt-2 flex flex-wrap items-baseline gap-x-1 text-2xl leading-none font-semibold tracking-tight tabular-nums sm:mt-4 sm:text-4xl"
              title={unit ? `${number.format(value)} ${unit} (weight × reps)` : undefined}
            >
              {value >= 10_000 ? (
                <>
                  <span aria-hidden>{compactNumber.format(value)}</span>
                  <span className="sr-only">{number.format(value)}</span>
                </>
              ) : (
                number.format(value)
              )}
              {unit && (
                <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                  {unit}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <WeeklyActivity key={weekCount} weeks={progress.weeks} />

      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="p-4 sm:px-6 sm:py-5">
          <h2 className="text-lg font-semibold tracking-tight">Exercise progress</h2>
          {progress.exercises.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              Heaviest weight or most reps in a set, from your first to latest
              day in this period.
            </p>
          )}
        </div>
        {progress.exercises.length ? (
          <ul className="divide-y border-t">
            {progress.exercises.map(({ exercise, workoutName, unit, first, latest }) => {
              const change = first === null ? null : latest - first;
              return (
                <li key={exercise.id}>
                  <AppLink
                    href={`/e/${exercise.id}/history`}
                    className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 px-4 py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:gap-4 sm:px-6"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground min-[380px]:flex">
                        <WorkoutIcon name={exercise.icon} className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{exercise.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{workoutName}</span>
                      </span>
                    </span>
                    <span className="text-right tabular-nums">
                      <span className="block text-sm font-semibold">
                        {first !== null && `${number.format(first)} → `}
                        {number.format(latest)} {unit}
                      </span>
                      <span className={cn(
                        "mt-0.5 block text-xs text-muted-foreground",
                        change !== null && change > 0 && "text-emerald-700 dark:text-emerald-300",
                      )}>
                        {change === null ? "First day" : change === 0 ? "No change" : `${signedNumber.format(change)} ${unit}`}
                      </span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                  </AppLink>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 border-t px-4 py-8 text-center">
            <BarChart3 className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {logs.length
                ? "No exercise progress to show in this period."
                : "Log a set to start tracking your progress."}
            </p>
            <Button asChild variant="outline">
              <AppLink href="/">Go to workouts</AppLink>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
