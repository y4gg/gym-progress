"use client";

import { use, useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { notFound, useRouter } from "next/navigation";
import { EditExerciseDialog } from "@/components/edit-exercise-dialog";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { DeleteDialog } from "@/components/delete-dialog";
import { toast } from "sonner";
import { Exercise } from "@/lib/types";
import { useDebounce } from "@/lib/use-debounce";

export default function ExercisePage({
  params,
}: {
  params: Promise<{ Id: string }>;
}) {
  const { Id: exerciseId } = use(params);
  const hydrated = useStoreHydrated();
  const router = useRouter();

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

  const { deleteExercise, editExercise } = useStore();

  const [currentSet, setCurrentSet] = useState(1);
  const [newExercise, setNewExercise] = useState<Exercise | undefined>(
    undefined,
  );

  useEffect(() => {
    if (exercise) {
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
      console.log("called");
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

  return (
    <div className="grid sm:p-24 mx-auto gap-2 p-6">
      <h1 className="text-4xl font-bold text-center">{exercise.name}</h1>

      <div>
        <Label>Weight</Label>
        <div className="flex items-center gap-1 mt-1">
          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              if (!newExercise) return;
              setNewExercise({
                ...newExercise,
                weight: Number(newExercise.weight + 1.25),
              });
            }}
          >
            <Plus />
          </Button>

          <div className="relative">
            <Input
              type="number"
              className="pr-7 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={newExercise?.weight ?? ""}
              onChange={(e) => {
                if (!newExercise) return;
                setNewExercise({
                  ...newExercise,
                  weight: Number(e.target.value),
                });
              }}
              min={0}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              kg
            </span>
          </div>

          <Button
            size="icon"
            variant="outline"
            onClick={() => {
              if (!newExercise) return;
              if (newExercise.weight - 1.25 <= 0) {
                setNewExercise({
                  ...newExercise,
                  weight: Number(0),
                });
                return;
              }
              setNewExercise({
                ...newExercise,
                weight: Number(newExercise.weight - 1.25),
              });
            }}
            disabled={newExercise && newExercise.weight <= 0}
          >
            <Minus />
          </Button>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          className="mt-1"
          value={newExercise?.notes ?? ""}
          onChange={(e) => {
            if (!newExercise) return;
            setNewExercise({
              ...newExercise,
              notes: e.target.value,
            });
          }}
        />
      </div>

      <div>
        <Label>Current Set</Label>
        <div className="flex items-center gap-1 mt-1">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentSet(currentSet + 1)}
            disabled={currentSet === exercise.sets}
          >
            <Plus />
          </Button>
          <Input
            type="number"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={currentSet}
            onChange={(e) => setCurrentSet(Number(e.target.value))}
            disabled
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => setCurrentSet(currentSet - 1)}
            disabled={currentSet === 1}
          >
            <Minus />
          </Button>
        </div>
      </div>

      <Separator orientation="horizontal" className="my-3" />

      <div className="grid grid-cols-2 gap-1">
        <div className="grid gap-1">
          <Button variant="outline" asChild>
            {typeof previousExercise === "undefined" ? (
              <Link href={`/w/${workout.id}`}>Workout Overview</Link>
            ) : (
              <Link href={`/e/${previousExercise.id}`}>Back</Link>
            )}
          </Button>

          <Button variant="secondary" asChild>
            <Link href={`/e/${exercise.id}/history`}>History</Link>
          </Button>

          <DeleteDialog
            onConfirm={handleDelete}
            element={<Button variant="destructive">Delete Exercise</Button>}
          />
        </div>

        <div className="grid gap-1">
          <Button variant="default" asChild>
            {typeof nextExercise === "undefined" ? (
              <Link href={`/w/${workout.id}`}>Finish Workout</Link>
            ) : (
              <Link href={`/e/${nextExercise.id}`}>Next</Link>
            )}
          </Button>

          <Button variant="secondary" asChild>
            <Link href={`/e/${exercise.id}/logs`}>Logs</Link>
          </Button>

          <EditExerciseDialog
            exercise={exercise}
            trigger={<Button variant="secondary">Edit Exercise</Button>}
          />
        </div>
      </div>
    </div>
  );
}
