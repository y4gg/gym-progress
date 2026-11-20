"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { AppLink } from "@/components/app-navigation";
import { Button } from "@/components/ui/button";
import { WorkoutIcon } from "@/components/workout-icon";
import { buildProgressOverview } from "@/lib/progress-overview";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { cn } from "@/lib/utils";
import { formatWeight, weightInUnit, type WeightUnit } from "@/lib/weight-units";

const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const month = new Intl.DateTimeFormat("en-GB", { month: "short" });
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const compactNumber = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekCounts = [4, 12];
const activityLevels = [
  { minimum: 0, label: "0" },
  { minimum: 1, label: "1–4" },
  { minimum: 5, label: "5–9" },
  { minimum: 10, label: "10+" },
];
type Progress = ReturnType<typeof buildProgressOverview>;

function formatDays(days: number) {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function formatSets(sets: number) {
  return `${number.format(sets)} ${sets === 1 ? "set" : "sets"}`;
}

function WeeklyActivity({ weeks }: { weeks: Progress["weeks"] }) {
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const selected =
    weeks.find((week) => week.start === selectedStart) ?? weeks[weeks.length - 1];
  const selectedSets = selected.days.reduce((total, day) => total + day.sets, 0);
  const loggedDays = selected.days
    .filter((day) => day.sets > 0)
    .map((day) => `${date.format(day.timestamp)}, ${formatSets(day.sets)}`);
  const compact = weeks.length > 4;
  const months = weeks.map((week) => month.format(week.start));

  return (
    <section className="overview-activity">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
        <h2 className="overview-display text-[1.625rem] leading-none sm:text-3xl">
          Weekly activity
        </h2>
        <p aria-live="polite" className="overview-week-detail">
          <span>{date.formatRange(selected.start, selected.end)}</span>
          <strong>{formatDays(selected.trainingDays)}, {formatSets(selectedSets)}</strong>
          {loggedDays.length > 0 && (
            <span className="sr-only">{loggedDays.join(". ")}</span>
          )}
        </p>
      </div>

      <div className="overview-calendar" data-compact={compact}>
        <div aria-hidden className="overview-weekdays">
          {weekdays.map((day) => <span key={day}>{day}</span>)}
        </div>
        <ul aria-label="Training activity by week" className="overview-weeks">
          {weeks.map((week, index) => {
            // Leave room for the next label when the first month has only one column.
            const showMonth = index === 0
              ? months[index] === months[index + 1]
              : months[index] !== months[index - 1];
            return (
              <li key={week.start}>
                <span aria-hidden className="overview-week-date">
                  {compact ? (showMonth && months[index]) : date.format(week.start)}
                </span>
                <button
                  type="button"
                  aria-label={`${date.formatRange(week.start, week.end)}, ${formatDays(week.trainingDays)}`}
                  aria-pressed={week.start === selected.start}
                  onClick={() => setSelectedStart(week.start)}
                  className="overview-week"
                >
                  <span aria-hidden className="overview-week-slots">
                    {week.days.map((day) => (
                      <span
                        className={cn("overview-day", day.upcoming && "overview-day-upcoming")}
                        data-level={activityLevels.findLast(({ minimum }) => day.sets >= minimum)?.minimum}
                        key={day.timestamp}
                        title={`${date.format(day.timestamp)}, ${day.upcoming ? "Upcoming" : formatSets(day.sets)}`}
                      />
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="overview-legend">
        <span>Sets per day</span>
        <ul aria-label="Activity levels">
          {activityLevels.map(({ minimum, label }) => (
            <li key={minimum}>
              <span aria-hidden className="overview-day" data-level={minimum} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TrainingTotals({ progress, weightUnit }: {
  progress: Progress;
  weightUnit: WeightUnit;
}) {
  const metrics = [
    { label: "Training days", value: progress.trainingDays },
    { label: "Sets logged", value: progress.sets },
    { label: "Volume", value: weightInUnit(progress.volume, weightUnit), unit: weightUnit },
  ];

  return (
    <dl aria-label="Period totals" className="overview-totals">
      {metrics.map(({ label, value, unit }) => (
        <div className="overview-total" key={label}>
          <dt className="overview-total-label">{label}</dt>
          <dd
            className="overview-total-value"
            title={unit ? `${number.format(value)} ${unit} (weight × reps)` : undefined}
          >
            <span className="overview-display">
              {value >= 10_000 ? (
                <>
                  <span aria-hidden>{compactNumber.format(value)}</span>
                  <span className="sr-only">{number.format(value)}</span>
                </>
              ) : number.format(value)}
            </span>
            {unit && <span className="overview-total-unit">{unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ExerciseProgress({ exercises, hasLogs, weightUnit }: {
  exercises: Progress["exercises"];
  hasLogs: boolean;
  weightUnit: WeightUnit;
}) {
  return (
    <section>
      <header className="mb-4 sm:mb-5">
        <h2 className="overview-display text-3xl leading-none sm:text-[2.125rem]">
          Exercise progress
        </h2>
        {exercises.length > 0 && (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Heaviest weight or most reps in a set, from your first to latest
            day in this period.
          </p>
        )}
      </header>
      {exercises.length ? (
        <ul className="divide-y border-y">
          {exercises.map(({ exercise, workoutName, unit, first, latest }) => {
            const displayUnit = unit === "kg" ? weightUnit : unit;
            const formatValue = (value: number) =>
              unit === "kg" ? formatWeight(value, weightUnit) : number.format(value);
            const change = first === null ? null : latest - first;
            const changeLabel = change === null ? "First day" : change === 0
              ? "No change"
              : `${change > 0 ? "+" : ""}${formatValue(change)} ${displayUnit}`;
            return (
              <li key={exercise.id}>
                <AppLink
                  href={`/e/${exercise.id}/history`}
                  className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-1 py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:gap-5 sm:px-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="overview-exercise-icon hidden size-9 shrink-0 items-center justify-center rounded-lg min-[380px]:flex" aria-hidden>
                      <WorkoutIcon name={exercise.icon} className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold sm:text-base">
                        {exercise.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {workoutName}
                      </span>
                    </span>
                  </span>
                  <span className="text-right tabular-nums sm:flex sm:items-center sm:gap-5">
                    <span className="block text-sm font-semibold">
                      {first !== null && (
                        <>
                          <span className="font-medium text-muted-foreground">{formatValue(first)}</span>
                          {" → "}
                        </>
                      )}
                      {formatValue(latest)} {displayUnit}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-xs sm:mt-0 sm:min-w-20",
                        change !== null && change > 0
                          ? "overview-positive font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {changeLabel}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </AppLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y py-5">
          <p className="text-sm text-muted-foreground">
            {hasLogs
              ? "No exercise progress to show in this period."
              : "Log a set to start tracking your progress."}
          </p>
          <Button asChild variant="outline">
            <AppLink href="/">Go to workouts</AppLink>
          </Button>
        </div>
      )}
    </section>
  );
}

export default function Overview() {
  const hydrated = useStoreHydrated();
  const workouts = useStore((state) => state.workouts);
  const logs = useStore((state) => state.exerciseLogs);
  const weightUnit = useStore((state) => state.weightUnit);
  const [weekCount, setWeekCount] = useState(weekCounts[0]);

  if (!hydrated) return null;

  const now = new Date();
  const progress = buildProgressOverview(workouts, logs, weekCount, now);

  return (
    <main className="overview mx-auto grid w-full max-w-5xl gap-8 px-4 pt-8 pb-28 sm:gap-10 sm:px-8 lg:pt-12 lg:pb-10">
      <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-4">
        <div>
          <h1 className="overview-display text-5xl leading-[0.95] tracking-tight sm:text-[4.5rem]">
            Overview
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
            {date.formatRange(progress.weeks[0].start, now)}
          </p>
        </div>
        <div role="group" aria-label="Overview period" className="overview-period">
          {weekCounts.map((weeks) => (
            <button
              type="button"
              key={weeks}
              aria-pressed={weeks === weekCount}
              onClick={() => setWeekCount(weeks)}
            >
              {weeks} weeks
            </button>
          ))}
        </div>
      </header>

      <div className="overview-panel">
        <WeeklyActivity key={weekCount} weeks={progress.weeks} />
        <TrainingTotals progress={progress} weightUnit={weightUnit} />
      </div>

      <ExerciseProgress
        exercises={progress.exercises}
        hasLogs={logs.length > 0}
        weightUnit={weightUnit}
      />
    </main>
  );
}
