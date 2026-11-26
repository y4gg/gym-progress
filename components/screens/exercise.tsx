"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useAppRouter, AppLink as Link } from "@/components/app-navigation";
import { BackLink } from "@/components/back-link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
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
import { roundKilograms, toKilograms, weightInputValue } from "@/lib/weight-units";

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
  const weightUnit = useStore((state) => state.weightUnit);

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
  const suggestedWeight = roundKilograms(currentWeight + step);
  const canIncreaseWeight = weightSchema.safeParse(suggestedWeight).success;
  const targetReps = exercise.maxReps;
  const weightSuggestionEnabled = typeof targetReps === "number";
  const canTrackCurrentSet = exercise.logging;
  const isLastSet = currentSet === exercise.sets;

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
    <main className="gym-page gym-page-narrow flex flex-col gap-4">
      <BackLink href={`/w/${workout.id}`}>Back to workout</BackLink>
      <section className="gym-panel gym-hero flex flex-col gap-4">
        <header className="border-b pb-4">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{workout.name}</p>
            <h1 className="gym-page-title flex min-w-0 items-center gap-3">
              <span className="gym-icon-tile size-12" data-workout-icon={exercise.icon}>
                <WorkoutIcon name={exercise.icon} className="size-7" />
              </span>
              <span className="truncate">{exercise.name}</span>
            </h1>
          </div>
        </header>

        <div>
          <label className="mb-2 block font-medium" htmlFor="exercise-weight">Weight</label>
          <div className="gym-stepper">
            <Button
              aria-label="Decrease weight"
              className="h-14"
              disabled={exercise.weight <= 0}
              onClick={() => {
                editExercise({
                  ...exercise,
                  weight: Math.max(0, roundKilograms(exercise.weight - step)),
                });
              }}
              type="button"
              variant="secondary"
            >
              <Minus aria-hidden="true" className="size-6" />
            </Button>
            <div className="relative min-w-0">
              <Input
                aria-describedby="exercise-weight-unit"
                className="gym-number h-14 px-2 pr-9 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                id="exercise-weight"
                inputMode="decimal"
                min={0}
                onChange={(e) => {
                  const weight = toKilograms(Number(e.target.value), weightUnit);
                  if (weightSchema.safeParse(weight).success) {
                    editExercise({ ...exercise, weight });
                  }
                }}
                placeholder="0"
                step="any"
                type="number"
                value={weightInputValue(exercise.weight, weightUnit)}
              />
              <span id="exercise-weight-unit" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground">
                {weightUnit}
              </span>
            </div>
            <Button
              aria-label="Increase weight"
              className="h-14"
              disabled={!canIncreaseWeight}
              onClick={() => editExercise({ ...exercise, weight: suggestedWeight })}
              type="button"
              variant="secondary"
            >
              <Plus aria-hidden="true" className="size-6" />
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
            <label className="font-medium" htmlFor="exercise-set">Current set</label>
            <span id="exercise-set-total" className="gym-number text-sm text-muted-foreground">
              {exercise.sets} total
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <Button
              aria-label="Previous set"
              className="h-14"
              onClick={previousSet}
              type="button"
              variant="secondary"
            >
              <ChevronLeft aria-hidden="true" className="size-6" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Input
              aria-label="Current set"
              aria-describedby="exercise-set-total"
              className="gym-number h-14 px-1 text-center text-2xl font-semibold disabled:opacity-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              disabled
              id="exercise-set"
              max={exercise.sets}
              min={1}
              type="number"
              value={currentSet}
            />
            <Button
              aria-label="Next set"
              className="h-14 gap-1.5 px-3 text-base font-semibold"
              onClick={handleNextSet}
              type="button"
            >
              {canTrackCurrentSet ? "Log set" : "Next set"}
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div>
          <label className="mb-2 block font-medium" htmlFor="exercise-notes">Notes</label>
          <Textarea
            id="exercise-notes"
            className="min-h-24 px-3 py-2"
            onChange={(e) => editExercise({ ...exercise, notes: e.target.value })}
            value={exercise.notes}
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-12 text-base"
            variant="secondary"
            asChild
          >
            {typeof previousExercise === "undefined" ? (
              <Link href={`/w/${workout.id}`}>Back</Link>
            ) : (
              <Link href={`/e/${previousExercise.id}`}>Back</Link>
            )}
          </Button>

          <Button className="h-12 text-base" variant="secondary" asChild>
            {typeof nextExercise === "undefined" ? (
              <Link href={`/w/${workout.id}`}>Finish</Link>
            ) : (
              <Link href={`/e/${nextExercise.id}`}>Next</Link>
            )}
          </Button>

          <Button
            className="h-12 text-base"
            variant="secondary"
            asChild
          >
            <Link href={`/e/${exercise.id}/history`}>History</Link>
          </Button>

          <Button
            className="h-12 text-base"
            variant="secondary"
            asChild
          >
            <Link href={`/e/${exercise.id}/logs`}>Logs</Link>
          </Button>
          <EditExerciseDialog
            exercise={exercise}
            trigger={
              <Button
                className="h-12 text-base"
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
                className="h-12 text-base"
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
            weightUnit={weightUnit}
            onCancel={handleCancelWeightSuggestion}
            onConfirm={handleConfirmWeightSuggestion}
            open={weightSuggestionPending}
          />
        ) : null}
    </main>
  );
}
