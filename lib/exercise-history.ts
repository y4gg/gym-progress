import type { ExerciseLog } from "@/lib/types";

export type HistoryMetric = "weight" | "reps" | "volume";
export type HistorySession = {
  day: string;
  timestamp: number;
  sets: number;
  weight: number;
  reps: number;
  volume: number;
};

// Match the logs page: a session is one local calendar day.
export function buildHistorySessions(logs: ExerciseLog[]): HistorySession[] {
  const days = new Map<string, HistorySession>();
  for (const log of logs) {
    const date = new Date(log.performedAt);
    if (!Number.isFinite(date.getTime())) continue;
    const day = date.toDateString();
    const session = days.get(day) ?? {
      day,
      timestamp: new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ).getTime(),
      sets: 0,
      weight: 0,
      reps: 0,
      volume: 0,
    };
    session.sets += 1;
    session.weight = Math.max(session.weight, log.weight);
    session.reps += log.reps;
    session.volume += log.weight * log.reps;
    days.set(day, session);
  }
  return [...days.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function filterHistorySessions(
  sessions: HistorySession[],
  days: number | null,
  now: Date,
) {
  if (days === null) return sessions;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - days + 1);
  return sessions.filter((session) => session.timestamp >= start.getTime());
}
