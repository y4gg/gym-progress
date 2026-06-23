"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { notFound, useRouter } from "next/navigation";
import { EditExerciseDialog } from "@/components/edit-exercise-dialog";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { DeleteDialog } from "@/components/delete-dialog";
import { toast } from "sonner";
import { Exercise } from "@/lib/types";
import { useDebounce } from "@/lib/use-debounce";
import { authClient } from "@/lib/auth-client";
import { TrackRepsDialog } from "@/components/track-reps-dialog";
import { createId } from "@paralleldrive/cuid2";

export default function ExercisePage({
  params,
}: {
  params: Promise<{ Id: string }>;
}) {
  const { Id: exerciseId } = use(params);
  const hydrated = useStoreHydrated();
  const router = useRouter();
  const session = authClient.useSession();

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

  const { addExerciseLog, deleteExercise, editExercise } = useStore();

  const [currentSet, setCurrentSet] = useState(1);
  const [trackRepsDialogOpen, setTrackRepsDialogOpen] = useState(false);
  const [newExercise, setNewExercise] = useState<Exercise | undefined>(
    undefined,
  );

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

  useEffect(() => {
    if (exercise) {
      // eslint-disable-next-line
      setNewExercise(exercise);
    }
  }, [exercise]);

  const debouncedExercise = useDebounce(newExercise, 1500);

  useEffect(() => {
    if (!debouncedExercise || !exercise) return;

    if (
      debouncedExercise.weight !== exercise.weight ||
      debouncedExercise.notes !== exercise.notes
    ) {
      editExercise(debouncedExercise);
    }
  }, [debouncedExercise, exercise, editExercise]);

  if (!hydrated) return null;
  if (!exercise || !workout) notFound();

  const handleDelete = async () => {
    await deleteExercise(exerciseId);
    router.push(`/w/${workout.id}`);
    toast.success("Exercise deleted successfully.");
  };

  const step = exercise.step ?? 2.5;
  const defaultReps = exerciseLogReps ?? exercise.maxReps ?? 8;
  const isLoggedIn = Boolean(session.data);
  const canTrackCurrentSet = isLoggedIn && exercise.logging;
  const isLastSet = currentSet === exercise.sets;

  const goToNextExercise = () => {
    if (typeof nextExercise === "undefined") {
      router.push(`/w/${workout.id}`);
      return;
    }

    router.push(`/e/${nextExercise.id}`);
  };

  const advanceSet = () => {
    if (isLastSet) {
      goToNextExercise();
      return;
    }

    setCurrentSet((set) => Math.min(exercise.sets, set + 1));
  };

  const handleNextSet = () => {
    if (isLastSet && !canTrackCurrentSet) return;

    if (canTrackCurrentSet) {
      setTrackRepsDialogOpen(true);
      return;
    }

    advanceSet();
  };

  const handleConfirmReps = (reps: number) => {
    addExerciseLog({
      id: createId(),
      exerciseId: exercise.id,
      workoutId: workout.id,
      reps,
      weight: newExercise?.weight ?? exercise.weight,
      performedAt: new Date().toISOString(),
    });
    setTrackRepsDialogOpen(false);
    advanceSet();
    toast.success("Set logged.");
  };

  const handleSkipReps = () => {
    setTrackRepsDialogOpen(false);
    advanceSet();
  };

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-9 pb-32">
      <div className="flex flex-col gap-4">
        <h1 className="truncate text-center text-3xl font-bold">
          {exercise.name}
        </h1>

        <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2">
          <Button
            aria-label="Increase weight"
            className="h-16"
            onClick={() => {
              if (!newExercise) return;
              setNewExercise({
                ...newExercise,
                weight: Number(newExercise.weight + step),
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
                if (!newExercise) return;
                setNewExercise({
                  ...newExercise,
                  weight: Number(e.target.value),
                });
              }}
              placeholder="0"
              step="any"
              type="number"
              value={newExercise?.weight ?? ""}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
              kg
            </span>
          </div>

          <Button
            aria-label="Decrease weight"
            className="h-16"
            disabled={newExercise ? newExercise.weight <= 0 : true}
            onClick={() => {
              if (!newExercise) return;
              setNewExercise({
                ...newExercise,
                weight: Math.max(0, Number(newExercise.weight - step)),
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
            if (!newExercise) return;
            setNewExercise({
              ...newExercise,
              notes: e.target.value,
            });
          }}
          placeholder="Notes"
          value={newExercise?.notes ?? ""}
        />

        <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2">
          <Button
            aria-label="Next set"
            className="h-16"
            disabled={isLastSet && !canTrackCurrentSet}
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
            disabled={currentSet === 1}
            onClick={() => setCurrentSet((set) => Math.max(1, set - 1))}
            type="button"
            variant="outline"
          >
            <Minus className="size-8" />
          </Button>
        </div>

        <Separator orientation="horizontal" className="my-2" />

        <div className="grid grid-cols-2 gap-2 -mt-2">
          <Button
            className="h-14 text-xl font-semibold"
            variant="outline"
            asChild
          >
            {typeof previousExercise === "undefined" ? (
              <Link href={`/w/${workout.id}`}>Back</Link>
            ) : (
              <Link href={`/e/${previousExercise.id}`}>Back</Link>
            )}
          </Button>

          <Button className="h-14 text-xl font-semibold" asChild>
            {typeof nextExercise === "undefined" ? (
              <Link href={`/w/${workout.id}`}>Finish</Link>
            ) : (
              <Link href={`/e/${nextExercise.id}`}>Next</Link>
            )}
          </Button>

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
      </div>
    </main>
  );
}
