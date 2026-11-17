"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useAppRouter, AppLink as Link } from "@/components/app-navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, List, Minus, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import { EditExerciseDialog } from "@/components/edit-exercise-dialog";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { DeleteDialog } from "@/components/delete-dialog";
import { toast } from "sonner";
import { TrackRepsDialog } from "@/components/track-reps-dialog";
import { createId } from "@paralleldrive/cuid2";
import { WeightSuggestionReachedDialog } from "@/components/weight-suggestion-reached-dialog";
import { weightSchema } from "@/lib/workout-validation";
import { WorkoutIcon } from "@/components/workout-icon";

export default function ExercisePage({ exerciseId }: { exerciseId: string }) {
  return <ExerciseScreen key={exerciseId} exerciseId={exerciseId} />;
}

function ExerciseScreen({ exerciseId }: { exerciseId: string }) {
  const hydrated = useStoreHydrated();
  const router = useAppRouter();

  const exercise = useStore((state) => state.getExerciseById(exerciseId));
  const workout = useStore((state) =>
    exercise ? state.getWorkoutById(exercise.workoutId) : undefined,
  );
  const nextExercise = useStore((state) =>
    exercise ? state.getNextExerciseById(exercise.id) : undefined,
  );
  const previousExercise = useStore((state) =>
    exercise ? state.getPreviousExerciseById(exercise.id) : undefined,
  );
  const exerciseLogs = useStore((state) => state.exerciseLogs);

  const addExerciseLog = useStore((state) => state.addExerciseLog);
  const deleteExercise = useStore((state) => state.deleteExercise);
  const editExercise = useStore((state) => state.editExercise);

  const today = new Date().toDateString();
  const [setSelection, setSetSelection] = useState<{
    exerciseId: string;
    day: string;
    set: number | null;
  }>({ exerciseId, day: today, set: null });

  const selectionMatches =
    setSelection.exerciseId === exerciseId && setSelection.day === today;

  if (!selectionMatches) {
    setSetSelection({ exerciseId, day: today, set: null });
  }

  const completedSetsToday = useMemo(
    () =>
      exerciseLogs.filter(
        (log) =>
          log.exerciseId === exerciseId &&
          new Date(log.performedAt).toDateString() === today,
      ).length,
    [exerciseId, exerciseLogs, today],
  );
  const restoredSet = exercise?.logging ? completedSetsToday + 1 : 1;
  const currentSet = Math.min(
    exercise?.sets ?? 1,
    (selectionMatches ? setSelection.set : null) ?? restoredSet,
  );
  const setCurrentSet = (set: number) => {
    setSetSelection({ exerciseId, day: today, set });
  };
  const [trackRepsDialogOpen, setTrackRepsDialogOpen] = useState(false);
  const [weightSuggestionPending, setWeightSuggestionPending] = useState(false);

  const exerciseLogReps = useMemo(() => {
    if (!exercise) return undefined;

    return exerciseLogs
      .filter((exerciseLog) => exerciseLog.exerciseId === exercise.id)
      .sort(
        (firstLog, secondLog) =>
          new Date(secondLog.performedAt).getTime() -
          new Date(firstLog.performedAt).getTime(),
      )[0]?.reps;
  }, [exercise, exerciseLogs]);

  if (!hydrated) return null;
  if (!exercise || !workout) notFound();

  const handleDelete = () => {
    deleteExercise(exerciseId);
    router.push(`/w/${workout.id}`);
    toast.success("Exercise deleted successfully.");
  };

  const step = exercise.step ?? 2.5;
  const defaultReps = exerciseLogReps ?? exercise.maxReps ?? 8;
  const currentWeight = exercise.weight;
  const suggestedWeight = Number((currentWeight + step).toFixed(2));
  const canIncreaseWeight = weightSchema.safeParse(suggestedWeight).success;
  const targetReps = exercise.maxReps;
  const weightSuggestionEnabled = typeof targetReps === "number";
  const canTrackCurrentSet = exercise.logging;
  const isLastSet = currentSet === exercise.sets;
  const exerciseNumber =
    workout.exercises.findIndex((item) => item.id === exercise.id) + 1;

  const goToNextExercise = () => {
    if (typeof nextExercise === "undefined") {
      router.push(`/w/${workout.id}`);
      return;
    }

    router.push(`/e/${nextExercise.id}`);
  };

  const goToPreviousExercise = () => {
    if (typeof previousExercise === "undefined") {
      router.push(`/w/${workout.id}`);
      return;
    }

    router.push(`/e/${previousExercise.id}`);
  };

  const advanceSet = () => {
    if (isLastSet) {
      goToNextExercise();
      return;
    }

    setCurrentSet(Math.min(exercise.sets, currentSet + 1));
  };

  const previousSet = () => {
    if (currentSet === 1) {
      goToPreviousExercise();
      return;
    }

    setCurrentSet(Math.max(1, currentSet - 1));
  };

  const handleNextSet = () => {
    if (canTrackCurrentSet) {
      setTrackRepsDialogOpen(true);
      return;
    }

    advanceSet();
  };

  const handleConfirmReps = (reps: number) => {
    // Hold this set until advanceSet runs, including after a weight suggestion.
    setCurrentSet(currentSet);
    addExerciseLog({
      id: createId(),
      exerciseId: exercise.id,
      workoutId: workout.id,
      reps,
      weight: exercise.weight,
      performedAt: new Date().toISOString(),
    });
    setTrackRepsDialogOpen(false);
    toast.success("Set logged.");

    if (weightSuggestionEnabled && reps >= targetReps && canIncreaseWeight) {
      setWeightSuggestionPending(true);
      return;
    }

    advanceSet();
  };

  const handleSkipReps = () => {
    setTrackRepsDialogOpen(false);
    advanceSet();
  };

  const handleConfirmWeightSuggestion = () => {
    const updatedExercise = {
      ...exercise,
      weight: suggestedWeight,
    };

    editExercise(updatedExercise);
    setWeightSuggestionPending(false);
    advanceSet();
    toast.success("Weight increased.");
  };

  const handleCancelWeightSuggestion = () => {
    setWeightSuggestionPending(false);
    advanceSet();
  };

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-9 pb-32 lg:max-w-xl lg:pb-10">
      <div className="flex flex-col gap-4">
        <h1 className="flex min-w-0 items-center justify-center gap-3 text-3xl font-bold">
          <WorkoutIcon name={exercise.icon} className="size-8 shrink-0" />
          <span className="truncate">{exercise.name}</span>
        </h1>

        <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2">
          <Button
            aria-label="Increase weight"
            className="h-16"
            disabled={!canIncreaseWeight}
            onClick={() => {
              editExercise({
                ...exercise,
                weight: suggestedWeight,
              });
            }}
            type="button"
            variant="outline"
          >
            <Plus className="size-8" />
          </Button>

          <div className="relative">
            <Input
              aria-label="Weight"
              className="h-16 px-4 pr-14 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              inputMode="decimal"
              min={0}
              onChange={(e) => {
                const weight = Number(e.target.value);
                if (weightSchema.safeParse(weight).success) {
                  editExercise({ ...exercise, weight });
                }
              }}
              placeholder="0"
              step="any"
              type="number"
              value={exercise.weight}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
              kg
            </span>
          </div>

          <Button
            aria-label="Decrease weight"
            className="h-16"
            disabled={exercise.weight <= 0}
            onClick={() => {
              editExercise({
                ...exercise,
                weight: Math.max(
                  0,
                  Number((exercise.weight - step).toFixed(2)),
                ),
              });
            }}
            type="button"
            variant="outline"
          >
            <Minus className="size-8" />
          </Button>
        </div>

        <Textarea
          aria-label="Notes"
          className="min-h-36 resize-none px-4 py-4 text-xl"
          onChange={(e) => {
            editExercise({
              ...exercise,
              notes: e.target.value,
            });
          }}
          placeholder="Notes"
          value={exercise.notes}
        />

        <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2">
          <Button
            aria-label="Next set"
            className="h-16"
            onClick={handleNextSet}
            type="button"
            variant="outline"
          >
            <Plus className="size-8" />
          </Button>

          <div className="relative">
            <Input
              aria-label="Current set"
              className="h-16 px-4 pr-14 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              disabled
              max={exercise.sets}
              min={1}
              onChange={(e) => setCurrentSet(Number(e.target.value))}
              type="number"
              value={currentSet}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
              set
            </span>
          </div>

          <Button
            aria-label="Previous set"
            className="h-16"
            onClick={previousSet}
            type="button"
            variant="outline"
          >
            <Minus className="size-8" />
          </Button>
        </div>

        <Separator orientation="horizontal" className="my-2" />

        <nav aria-label="Exercise navigation" className="-mt-2 space-y-2">
          <p className="text-center text-xs font-medium text-muted-foreground">
            Exercise {exerciseNumber} of {workout.exercises.length}
          </p>
          <div className="flex gap-2">
            {previousExercise ? (
              <Button className="size-14 rounded-xl" variant="outline" asChild>
                <Link
                  href={`/e/${previousExercise.id}`}
                  aria-label={`Previous exercise: ${previousExercise.name}`}
                  title={`Previous exercise: ${previousExercise.name}`}
                >
                  <ChevronLeft className="size-5" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button
                aria-label="Previous exercise"
                className="size-14 rounded-xl"
                disabled
                type="button"
                variant="outline"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </Button>
            )}
            <Button
              className="h-14 min-w-0 flex-1 justify-between gap-3 rounded-xl px-4 text-left"
              asChild
            >
              {nextExercise ? (
                <Link
                  href={`/e/${nextExercise.id}`}
                  aria-label={`Next exercise: ${nextExercise.name}`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs opacity-70">Next exercise</span>
                    <span className="block truncate text-base font-semibold">
                      {nextExercise.name}
                    </span>
                  </span>
                  <ChevronRight className="size-5" aria-hidden="true" />
                </Link>
              ) : (
                <Link href={`/w/${workout.id}`}>
                  <span className="text-base font-semibold">Finish workout</span>
                  <Check className="size-5" aria-hidden="true" />
                </Link>
              )}
            </Button>
          </div>
          <Button
            className="h-11 w-full gap-2 text-sm text-muted-foreground"
            variant="ghost"
            asChild
          >
            <Link href={`/w/${workout.id}`}>
              <List className="size-4" aria-hidden="true" />
              Back to workout
            </Link>
          </Button>
        </nav>

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-14 text-xl font-semibold"
            variant="outline"
            asChild
          >
            <Link href={`/e/${exercise.id}/history`}>History</Link>
          </Button>

          <Button
            className="h-14 text-xl font-semibold"
            variant="outline"
            asChild
          >
            <Link href={`/e/${exercise.id}/logs`}>Logs</Link>
          </Button>
          <EditExerciseDialog
            exercise={exercise}
            trigger={
              <Button
                className="h-14 text-xl font-semibold"
                type="button"
                variant="secondary"
              >
                Edit
              </Button>
            }
          />

          <DeleteDialog
            onConfirm={handleDelete}
            element={
              <Button
                className="h-14 text-xl font-semibold"
                type="button"
                variant="destructive"
              >
                Delete
              </Button>
            }
          />
        </div>
        {trackRepsDialogOpen ? (
          <TrackRepsDialog
            defaultReps={defaultReps}
            exercise={exercise}
            onConfirm={handleConfirmReps}
            onSkip={handleSkipReps}
            open={trackRepsDialogOpen}
          />
        ) : null}
        {weightSuggestionPending ? (
          <WeightSuggestionReachedDialog
            currentWeight={currentWeight}
            exerciseName={exercise.name}
            nextWeight={suggestedWeight}
            onCancel={handleCancelWeightSuggestion}
            onConfirm={handleConfirmWeightSuggestion}
            open={weightSuggestionPending}
          />
        ) : null}
      </div>
    </main>
  );
}
