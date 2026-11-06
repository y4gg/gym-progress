import { expect, test } from "bun:test";
import {
  buildHistorySessions,
  filterHistorySessions,
} from "./exercise-history";
import type { ExerciseLog } from "./types";

function log(
  id: string,
  day: number,
  weight: number,
  reps: number,
): ExerciseLog {
  return {
    id,
    exerciseId: "bench",
    workoutId: "push",
    weight,
    reps,
    performedAt: new Date(2026, 9, day, 12).toISOString(),
    createdAt: "",
  };
}

test("groups sets by day without losing repeated weights or reps-only logs", () => {
  const logs = [
    log("c", 3, 0, 20),
    log("b", 2, 50, 8),
    log("a", 2, 50, 10),
    log("d", 1, 50, 6),
  ];
  const sessions = buildHistorySessions(logs);
  expect(sessions).toHaveLength(3);
  expect(sessions[1]).toMatchObject({
    sets: 2,
    weight: 50,
    reps: 18,
    volume: 900,
  });
  expect(sessions[2]).toMatchObject({
    sets: 1,
    weight: 0,
    reps: 20,
    volume: 0,
  });
  expect(logs[0].id).toBe("c");
});

test("uses the heaviest set and sums volume for mixed weights", () => {
  const sessions = buildHistorySessions([
    log("a", 2, 40, 12),
    log("b", 2, 60, 6),
  ]);
  expect(sessions[0]).toMatchObject({ weight: 60, reps: 18, volume: 840 });
});

test("period includes its first calendar day and excludes older days", () => {
  const sessions = buildHistorySessions([
    log("a", 1, 50, 10),
    log("b", 2, 55, 10),
    log("c", 31, 60, 10),
  ]);
  const now = new Date(2026, 9, 31, 23, 59);
  expect(
    filterHistorySessions(sessions, 30, now).map((session) => session.weight),
  ).toEqual([55, 60]);
  expect(filterHistorySessions(sessions, null, now)).toHaveLength(3);
  expect(filterHistorySessions(sessions, 30, new Date(2027, 0, 1))).toEqual([]);
});

test("handles empty logs and skips invalid dates", () => {
  expect(buildHistorySessions([])).toEqual([]);
  expect(
    buildHistorySessions([{ ...log("a", 1, 50, 10), performedAt: "invalid" }]),
  ).toEqual([]);
});
