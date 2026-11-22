import { expect, test } from "bun:test";
import { buildProgressOverview } from "./progress-overview";
import type { Exercise, ExerciseLog, Workout } from "./types";

const now = new Date(2026, 10, 19, 12);
const bench: Exercise = {
  id: "bench",
  workoutId: "upper",
  name: "Bench press",
  position: 0,
  weight: 60,
  sets: 3,
  step: 2.5,
  logging: true,
  notes: "",
  createdAt: "",
  updatedAt: "",
};
const workouts: Workout[] = [{
  id: "upper",
  name: "Upper body",
  exercises: [
    bench,
    { ...bench, id: "pullups", name: "Pull-ups", weight: 0, position: 1 },
    { ...bench, id: "rows", name: "Rows", position: 2 },
  ],
  createdAt: "",
  updatedAt: "",
}];

function log(
  id: string,
  exerciseId: string,
  day: number,
  weight: number,
  reps: number,
): ExerciseLog {
  return {
    id,
    exerciseId,
    workoutId: "upper",
    weight,
    reps,
    performedAt: new Date(2026, 10, day, 12).toISOString(),
    createdAt: "",
  };
}

test("counts a local training day once and groups sets into Monday-to-Sunday weeks", () => {
  const logs = [
    log("sunday", "bench", 15, 40, 10),
    log("monday", "bench", 16, 60, 8),
    log("same-day", "pullups", 16, 0, 5),
    log("range-start", "bench", -5, 40, 10),
    log("before-range", "bench", -6, 40, 10),
    log("future-day", "bench", 20, 70, 8),
    { ...log("invalid", "bench", 16, 70, 8), performedAt: "invalid" },
  ];
  const progress = buildProgressOverview(workouts, logs, 4, now);

  expect(new Date(progress.weeks[0].start)).toEqual(new Date(2026, 9, 26));
  expect(progress.weeks.map(({ trainingDays }) => trainingDays)).toEqual([1, 0, 1, 1]);
  expect(progress.weeks[2].days.map(({ sets }) => sets)).toEqual([0, 0, 0, 0, 0, 0, 1]);
  expect(progress.weeks[2].days.map(({ logged }) => logged)).toEqual([
    false, false, false, false, false, false, true,
  ]);
  expect(progress.weeks[3].days.map(({ sets, upcoming }) => [sets, upcoming])).toEqual([
    [2, false], [0, false], [0, false], [0, false],
    [0, true], [0, true], [0, true],
  ]);
  expect(progress).toMatchObject({ trainingDays: 3, sets: 4, volume: 1280 });
  expect(buildProgressOverview(workouts, logs, 12, now).sets).toBe(5);
});

test("compares daily top weights or reps per set and reports one-day baselines", () => {
  const progress = buildProgressOverview(workouts, [
    log("bench-latest", "bench", 15, 62.5, 5),
    log("bench-first", "bench", 3, 60, 8),
    log("bench-warm-up", "bench", 3, 40, 10),
    log("pullups-first", "pullups", 3, 0, 7),
    log("pullups-set-one", "pullups", 16, 0, 9),
    log("pullups-set-two", "pullups", 16, 0, 6),
    log("rows-first", "rows", 18, 55, 8),
    log("rows-second", "rows", 18, 50, 10),
  ], 4, now);

  expect(progress.exercises).toMatchObject([
    { exercise: { id: "rows" }, first: null, latest: 55, unit: "kg" },
    { exercise: { id: "pullups" }, first: 7, latest: 9, unit: "reps" },
    { exercise: { id: "bench" }, first: 60, latest: 62.5, unit: "kg" },
  ]);
});
