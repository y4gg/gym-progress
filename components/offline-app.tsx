"use client";

import { AppLink, useAppPathname } from "@/components/app-navigation";
import { Button } from "@/components/ui/button";
import Home from "@/components/screens/home";
import Workout from "@/components/screens/workout";
import CreateExercise from "@/components/screens/create-exercise";
import Exercise from "@/components/screens/exercise";
import ExerciseHistory from "@/components/screens/exercise-history";
import ExerciseLogs from "@/components/screens/exercise-logs";
import { useStore } from "@/lib/store";
import { useStoreHydrated } from "@/lib/use-store-hydrated";

export function OfflineApp() {
  const pathname = useAppPathname();
  const hydrated = useStoreHydrated();
  const workouts = useStore((state) => state.workouts);

  if (!hydrated) return null;

  let screen;
  const workoutRoute = pathname.match(/^\/w\/([^/]+)(\/create)?\/?$/);
  const exerciseRoute = pathname.match(/^\/e\/([^/]+)(\/(history|logs))?\/?$/);

  if (pathname === "/" || pathname === "/offline") {
    screen = <Home />;
  } else if (
    workoutRoute &&
    workouts.some((workout) => workout.id === workoutRoute[1])
  ) {
    screen = workoutRoute[2] ? (
      <CreateExercise id={workoutRoute[1]} key={pathname} />
    ) : (
      <Workout id={workoutRoute[1]} key={pathname} />
    );
  } else if (
    exerciseRoute &&
    workouts.some((workout) =>
      workout.exercises.some((exercise) => exercise.id === exerciseRoute[1]),
    )
  ) {
    const exerciseId = exerciseRoute[1];
    screen =
      exerciseRoute[3] === "history" ? (
        <ExerciseHistory exerciseId={exerciseId} key={pathname} />
      ) : exerciseRoute[3] === "logs" ? (
        <ExerciseLogs exerciseId={exerciseId} key={pathname} />
      ) : (
        <Exercise exerciseId={exerciseId} key={pathname} />
      );
  } else {
    const isWorkoutRoute = Boolean(workoutRoute || exerciseRoute);
    screen = (
      <main className="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 py-9 pb-28 text-center">
        <h1 className="text-2xl font-bold">
          {isWorkoutRoute ? "Not saved on this device" : "Connection required"}
        </h1>
        <p className="text-muted-foreground">
          {isWorkoutRoute
            ? "This workout or exercise is unavailable. Your other saved workouts are ready to use."
            : "Connect to the internet to sign in or manage your account. You can keep tracking workouts offline."}
        </p>
        <Button asChild>
          <AppLink href="/">Go to workouts</AppLink>
        </Button>
      </main>
    );
  }

  return (
    <>
      <div
        className="mx-auto flex w-full max-w-sm items-center justify-between gap-3 px-6 pt-4 text-xs text-muted-foreground"
        role="status"
      >
        <span>Offline mode. Changes saved on this device.</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.location.reload()}
        >
          Reconnect
        </Button>
      </div>
      {screen}
    </>
  );
}
