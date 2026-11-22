import { buildHistorySessions } from "@/lib/exercise-history";
import type { ExerciseLog, Workout } from "@/lib/types";

function calendarDay(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

export function buildProgressOverview(
  workouts: Workout[],
  logs: ExerciseLog[],
  weekCount: number,
  now: Date,
) {
  const monday = calendarDay(now, -((now.getDay() + 6) % 7));
  const start = calendarDay(monday, -7 * (weekCount - 1)).getTime();
  const tomorrow = calendarDay(now, 1).getTime();
  const periodLogs = logs.filter((log) => {
    const timestamp = Date.parse(log.performedAt);
    return timestamp >= start && timestamp < tomorrow;
  });
  const sessions = buildHistorySessions(periodLogs);
  const setsByDay = new Map(sessions.map(({ timestamp, sets }) => [timestamp, sets]));
  const trainingDays = new Set(sessions.map(({ timestamp }) => timestamp));

  const weeks = Array.from({ length: weekCount }, (_, index) => {
    const offset = 7 * (index - weekCount + 1);
    const days = Array.from({ length: 7 }, (_, day) => {
      const timestamp = calendarDay(monday, offset + day).getTime();
      return {
        timestamp,
        sets: setsByDay.get(timestamp) ?? 0,
        logged: trainingDays.has(timestamp),
        upcoming: timestamp >= tomorrow,
      };
    });
    return {
      start: days[0].timestamp,
      end: days[6].timestamp,
      trainingDays: days.filter(({ logged }) => logged).length,
      days,
    };
  });

  const logsByExercise = new Map<string, ExerciseLog[]>();
  for (const log of periodLogs) {
    const exerciseLogs = logsByExercise.get(log.exerciseId);
    if (exerciseLogs) exerciseLogs.push(log);
    else logsByExercise.set(log.exerciseId, [log]);
  }

  const exercises = workouts.flatMap((workout) =>
    workout.exercises.flatMap((exercise) => {
      const exerciseLogs = logsByExercise.get(exercise.id);
      if (!exerciseLogs) return [];

      const days = buildHistorySessions(exerciseLogs);
      const first = days[0];
      const latest = days[days.length - 1];
      const weighted = days.some((day) => day.weight > 0);
      const metric = weighted ? "weight" : "maxReps";

      return [{
        exercise,
        workoutName: workout.name,
        unit: weighted ? "kg" : "reps",
        first: days.length > 1 ? first[metric] : null,
        latest: latest[metric],
        lastTrainedAt: latest.timestamp,
      }];
    }),
  );

  return {
    trainingDays: sessions.length,
    sets: periodLogs.length,
    volume: sessions.reduce((total, session) => total + session.volume, 0),
    weeks,
    exercises: exercises.sort((a, b) => b.lastTrainedAt - a.lastTrainedAt),
  };
}
