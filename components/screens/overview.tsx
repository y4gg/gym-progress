"use client";

import { useState, type CSSProperties } from "react";
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
const yearWeekCount = 53;
type Progress = ReturnType<typeof buildProgressOverview>;

function formatDays(days: number) {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function ActivityWeek({
  week,
  selected,
  onSelect,
}: {
  week: Progress["weeks"][number];
  selected: Progress["weeks"][number];
  onSelect: (start: number) => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-label={`${date.formatRange(week.start, week.end)}, ${formatDays(week.trainingDays)}`}
        aria-pressed={week.start === selected.start}
        onClick={() => onSelect(week.start)}
        className="overview-week"
      >
        {week.days.map((day) => (
          <span
            className={cn(
              "overview-day",
              day.logged && "overview-day-logged",
              day.upcoming && "overview-day-upcoming",
            )}
            key={day.timestamp}
            title={`${date.format(day.timestamp)}, ${day.upcoming ? "Upcoming" : day.logged ? "Gym day" : "Rest day"}`}
            aria-label={`${date.format(day.timestamp)}, ${day.upcoming ? "upcoming" : day.logged ? "gym day" : "rest day"}`}
            role="img"
          />
        ))}
      </button>
    </li>
  );
}

function YearlyActivity({ weeks }: { weeks: Progress["weeks"] }) {
  const [selectedStart, setSelectedStart] = useState<number | null>(null);
  const selected =
    weeks.find((week) => week.start === selectedStart) ?? weeks[weeks.length - 1];
  const months = weeks.map((week) => month.format(week.start));
  const monthGroups = months.reduce<Array<{ label: string; start: number; end: number }>>(
    (groups, label, index) => {
      const current = groups.at(-1);
      if (current?.label === label) current.end = index;
      else groups.push({ label, start: index, end: index });
      return groups;
    },
    [],
  );
  // Balance the year into four seasonal bands so the grid keeps a steady rhythm.
  const seasonCount = 4;
  const bandStarts = Array.from({ length: seasonCount - 1 }, (_, index) =>
    Math.floor((weeks.length * (index + 1)) / seasonCount),
  );
  const boundaries = [0, ...bandStarts, weeks.length];
  const bands = boundaries.slice(0, -1).map((start, index) => ({
    start,
    end: boundaries[index + 1],
  }));

  return (
    <section className="overview-activity">
      <div className="overview-activity-heading">
        <div>
          <h2 className="text-[1.625rem] leading-none font-semibold sm:text-3xl">
            Gym days
          </h2>
        </div>
        <p className="overview-year-detail">
          <strong>
            {formatDays(weeks.reduce((total, week) => total + week.trainingDays, 0))}
          </strong>
          <span>{date.formatRange(weeks[0].start, weeks[weeks.length - 1].end)}</span>
        </p>
      </div>

      <div className="overview-calendar-scroll">
        <div
          className="overview-calendar"
          style={{
            "--overview-week-count": weeks.length,
          } as CSSProperties}
        >
          <div aria-hidden className="overview-weekdays">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="overview-calendar-desktop">
            <div aria-hidden className="overview-months">
              {monthGroups.map(({ label, start, end }) => (
                <span
                  key={`${label}-${start}`}
                  style={{ gridColumn: `${start + 1} / ${end + 2}` }}
                >
                  {end - start < 1 ? label.slice(0, 1) : label}
                </span>
              ))}
            </div>
            <ul role="list" aria-label="Training days by week" className="overview-weeks">
              {weeks.map((week) => (
                <ActivityWeek
                  key={week.start}
                  week={week}
                  selected={selected}
                  onSelect={setSelectedStart}
                />
              ))}
            </ul>
          </div>
          <div
            className="overview-calendar-mobile"
          >
            {bands.map(({ start, end }) => (
              <div
                className="overview-calendar-band"
                key={weeks[start].start}
                style={{ "--overview-band-week-count": end - start } as CSSProperties}
              >
                <div aria-hidden className="overview-months">
                  {monthGroups
                    .filter(
                      (group) =>
                        group.start >= start &&
                        group.start < end &&
                        !(start === 0 && group.start === 0 && group.end === 0),
                    )
                    .map((group) => {
                      const groupStart = Math.max(group.start, start);
                      const groupEnd = Math.min(group.end, end - 1);
                      return (
                        <span
                          key={group.start}
                          style={{ gridColumn: `${groupStart - start + 1} / ${groupEnd - start + 2}` }}
                        >
                          {groupEnd - groupStart < 1
                            ? group.label.slice(0, 1)
                            : group.label}
                        </span>
                      );
                    })}
                </div>
                <ul role="list" aria-label="Training days by week" className="overview-weeks">
                  {weeks.slice(start, end).map((week) => (
                    <ActivityWeek
                      key={week.start}
                      week={week}
                      selected={selected}
                      onSelect={setSelectedStart}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
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
            <span className="font-semibold">
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
        <h2 className="text-3xl leading-none font-semibold sm:text-[2.125rem]">
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

  if (!hydrated) return null;

  const now = new Date();
  const progress = buildProgressOverview(workouts, logs, yearWeekCount, now);

  return (
    <main className="overview gym-page mx-auto grid w-full max-w-5xl gap-8 sm:gap-10">
      <header className="flex flex-wrap items-end justify-between gap-x-3 gap-y-4">
        <div>
          <h1 className="text-5xl leading-[0.95] font-semibold tracking-tight sm:text-[4.5rem]">
            Overview
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">
            Past year, {date.formatRange(progress.weeks[0].start, now)}
          </p>
        </div>
      </header>

      <div className="overview-panel gym-panel">
        <YearlyActivity weeks={progress.weeks} />
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
