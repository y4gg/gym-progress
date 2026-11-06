"use client";

import { useMemo, useState } from "react";
import { AppLink as Link } from "@/components/app-navigation";
import { notFound } from "next/navigation";
import { ArrowUpRight, Trophy, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  buildHistorySessions,
  filterHistorySessions,
  type HistoryMetric,
  type HistorySession,
} from "@/lib/exercise-history";

const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const date = (timestamp: number) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    timestamp,
  );
const fullDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(timestamp);
const metrics = {
  weight: {
    label: "Weight",
    description: "Heaviest logged set per day",
    unit: "kg",
  },
  reps: {
    label: "Reps",
    description: "Total reps per day, across all sets",
    unit: "reps",
  },
  volume: {
    label: "Volume",
    description: "Weight × reps, summed across all sets per day",
    unit: "kg",
  },
};
const ranges = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time", days: null },
];

function TrendChart({
  sessions,
  metric,
}: {
  sessions: HistorySession[];
  metric: HistoryMetric;
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selected =
    sessions.find((session) => session.day === selectedDay) ??
    sessions[sessions.length - 1];
  const max = Math.max(1, ...sessions.map((session) => session[metric]));
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const span = last.timestamp - first.timestamp;
  const x = (session: HistorySession) =>
    span === 0
      ? 180
      : 40 + ((session.timestamp - first.timestamp) / span) * 296;
  const y = (session: HistorySession) => 170 - (session[metric] / max) * 140;
  const path = sessions
    .map(
      (session, index) =>
        `${index === 0 ? "M" : "L"}${x(session)},${y(session)}`,
    )
    .join(" ");
  return (
    <>
      <div
        className="mt-6 flex items-end justify-between gap-3"
        aria-live="polite"
      >
        <p className="text-3xl font-bold tabular-nums">
          {number.format(selected[metric])}{" "}
          <span className="text-sm font-medium text-muted-foreground">
            {metrics[metric].unit}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          {fullDate(selected.timestamp)}
        </p>
      </div>
      <svg
        viewBox="0 0 360 210"
        className="mt-2 w-full overflow-visible"
        role="img"
        aria-label={`${metrics[metric].label} trend across ${sessions.length} training days. ${number.format(first[metric])} to ${number.format(last[metric])} ${metrics[metric].unit}.`}
      >
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1="40"
              x2="336"
              y1={170 - fraction * 140}
              y2={170 - fraction * 140}
              className="stroke-border"
              strokeDasharray="3 4"
            />
            <text
              x="32"
              y={174 - fraction * 140}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {number.format(max * fraction)}
            </text>
          </g>
        ))}
        {sessions.length > 1 ? (
          <path d={`${path} L336,170 L40,170 Z`} className="fill-primary/5" />
        ) : null}
        <path
          d={path}
          fill="none"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {sessions.map((session) => (
          <circle
            key={session.day}
            cx={x(session)}
            cy={y(session)}
            r={session.day === selected.day ? 5 : 2.5}
            className="fill-primary stroke-background"
            strokeWidth="2"
          >
            <title>
              {fullDate(session.timestamp)}: {number.format(session[metric])}{" "}
              {metrics[metric].unit}
            </title>
          </circle>
        ))}
        <text x="40" y="199" className="fill-muted-foreground text-[11px]">
          {date(first.timestamp)}
        </text>
        {sessions.length > 1 ? (
          <text
            x="336"
            y="199"
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            {date(last.timestamp)}
          </text>
        ) : null}
      </svg>
      <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        Inspect a day
        <select
          className="min-w-0 rounded-md border border-input bg-background px-3 py-2 text-foreground"
          value={selected.day}
          onChange={(event) => setSelectedDay(event.target.value)}
        >
          {sessions.map((session) => (
            <option key={session.day} value={session.day}>
              {fullDate(session.timestamp)}
            </option>
          ))}
        </select>
      </label>
      {sessions.length === 1 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Your starting point. Log another day to see a trend.
        </p>
      ) : null}
    </>
  );
}

export default function ExerciseHistoryPage({
  exerciseId,
}: {
  exerciseId: string;
}) {
  const hydrated = useStoreHydrated();
  const exercise = useStore((state) => state.getExerciseById(exerciseId));
  const workout = useStore((state) =>
    exercise ? state.getWorkoutById(exercise.workoutId) : undefined,
  );
  const logs = useStore((state) => state.exerciseLogs);
  const [metric, setMetric] = useState<HistoryMetric>("weight");
  const [days, setDays] = useState<number | null>(null);
  const sessions = useMemo(
    () =>
      buildHistorySessions(logs.filter((log) => log.exerciseId === exerciseId)),
    [logs, exerciseId],
  );
  const hasWeight = sessions.some((session) => session.weight > 0);
  const activeMetric = !hasWeight && metric !== "reps" ? "reps" : metric;
  const visible = filterHistorySessions(sessions, days, new Date());
  if (!hydrated) return null;
  if (!exercise || !workout) notFound();
  const first = visible[0];
  const latest = visible[visible.length - 1];
  const change =
    latest && first ? latest[activeMetric] - first[activeMetric] : 0;
  const best = sessions.reduce(
    (value, session) => Math.max(value, session[activeMetric]),
    0,
  );
  return (
    <main className="mx-auto w-full max-w-md px-6 py-9 pb-32">
      <header className="mb-7 text-center">
        <h1 className="text-3xl font-bold">History</h1>
        <p className="mt-3 truncate text-xl font-semibold">{exercise.name}</p>
        <p className="text-sm text-muted-foreground">{workout.name}</p>
      </header>
      {sessions.length === 0 ? (
        <section className="rounded-xl border border-dashed px-6 py-14 text-center">
          <Activity className="mx-auto mb-4 size-8 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Your progress starts here</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Log your sets to see your weight, reps and training volume over
            time.
          </p>
          <Button asChild className="mt-6">
            <Link href={`/e/${exerciseId}`}>Log a set</Link>
          </Button>
        </section>
      ) : (
        <>
          <div
            className="mb-5 flex rounded-lg bg-muted p-1"
            aria-label="History period"
          >
            {ranges.map((range) => (
              <button
                key={range.label}
                aria-pressed={days === range.days}
                onClick={() => setDays(range.days)}
                className={cn(
                  "min-h-10 flex-1 rounded-md px-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring",
                  days === range.days
                    ? "bg-background shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          <section className="rounded-xl border p-4">
            <div className="flex gap-2" aria-label="Progress metric">
              {(Object.keys(metrics) as HistoryMetric[])
                .filter((key) => hasWeight || key === "reps")
                .map((key) => (
                  <button
                    key={key}
                    aria-pressed={activeMetric === key}
                    onClick={() => setMetric(key)}
                    className={cn(
                      "min-h-10 rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring",
                      activeMetric === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {metrics[key].label}
                  </button>
                ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {metrics[activeMetric].description}
            </p>
            {visible.length ? (
              <TrendChart sessions={visible} metric={activeMetric} />
            ) : (
              <p className="py-14 text-center text-sm text-muted-foreground">
                No sets logged in this period. Try All time.
              </p>
            )}
          </section>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <section className="rounded-xl bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">Change in period</p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {visible.length > 1
                  ? `${change > 0 ? "+" : ""}${number.format(change)} ${metrics[activeMetric].unit}`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {visible.length} training{" "}
                {visible.length === 1 ? "day" : "days"}
              </p>
            </section>
            <section className="rounded-xl bg-muted/50 p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="size-3.5" />
                All-time best
              </p>
              <p className="mt-2 text-xl font-bold tabular-nums">
                {number.format(best)}{" "}
                <span className="text-sm font-medium">
                  {metrics[activeMetric].unit}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics[activeMetric].label} in one day
              </p>
            </section>
          </div>
          {visible.length ? (
            <section className="mt-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Recent training days</h2>
                <Link
                  href={`/e/${exerciseId}/logs`}
                  className="flex min-h-10 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  All logs <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <ul className="divide-y">
                {visible
                  .slice(-5)
                  .reverse()
                  .map((session) => (
                    <li
                      key={session.day}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          {fullDate(session.timestamp)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {session.sets} {session.sets === 1 ? "set" : "sets"} ·{" "}
                          {session.reps} reps
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">
                        {number.format(session[activeMetric])}{" "}
                        {metrics[activeMetric].unit}
                      </p>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
