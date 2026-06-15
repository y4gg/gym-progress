"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { use, useState } from "react";
import { Exercise } from "@/lib/types";
import { createId } from "@paralleldrive/cuid2";
import { notFound, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import * as z from "zod";
import { AdvancedExerciseOptionsDialog } from "@/components/advanced-exercise-options-dialog";

export default function CreateExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const hydrated = useStoreHydrated();
  const router = useRouter();
  const workout = useStore((state) => state.getWorkoutById(id));
  const [newExercise, setNewExercise] = useState<Exercise>({
    id: createId(),
    name: "",
    weight: 0,
    notes: "",
    sets: 3,
    logging: false,
    workoutId: id,
  });

  if (!hydrated) {
    return null;
  }

  if (!workout) {
    notFound();
  }

  const exerciseSchema = z.object({
    name: z.string().min(4),
    weight: z.number().min(0),
    notes: z.string().optional(),
    sets: z.number().min(1).multipleOf(1),
    logging: z.boolean(),
  });

  const handleCreateExercise = () => {
    // TODO: validate input
    try {
      exerciseSchema.parse(newExercise);
    } catch (error) {
      if (error instanceof z.ZodError)
        error.issues.forEach((issue) => {
          toast.error(`${issue.input}: ${issue.code}`);
        });
      return;
    }
    useStore.getState().addExercise(newExercise, workout.id);
    router.push(`/w/${workout.id}`);
    toast.success("Exercise created successfully!");
  };

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-9 pb-28">
      <form
        className="flex flex-col gap-4"
        id="create-exercise-form"
        onSubmit={(event) => {
          event.preventDefault();
          handleCreateExercise();
        }}
      >
        <Input
          aria-label="Exercise name"
          className="h-16 px-5 text-center text-2xl font-semibold"
          placeholder="Exercise name"
          value={newExercise.name}
          onChange={(e) =>
            setNewExercise({ ...newExercise, name: e.target.value })
          }
        />

        <div className="relative">
          <Input
            aria-label="Weight"
            className="h-16 px-5 pr-14 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            inputMode="decimal"
            min={0}
            onChange={(e) =>
              setNewExercise({
                ...newExercise,
                weight: Number(e.target.value),
              })
            }
            placeholder="0"
            step="any"
            type="number"
            value={newExercise.weight}
          />
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
            kg
          </span>
        </div>

        <Textarea
          aria-label="Notes"
          className="min-h-36 resize-none px-4 py-4 text-xl"
          placeholder="Notes"
          value={newExercise.notes}
          onChange={(e) =>
            setNewExercise({ ...newExercise, notes: e.target.value })
          }
        />

        <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2">
          <Button
            aria-label="Increase sets"
            className="h-16"
            onClick={() =>
              setNewExercise({
                ...newExercise,
                sets: newExercise.sets + 1,
              })
            }
            type="button"
            variant="outline"
          >
            <Plus className="size-8" />
          </Button>
          <div className="relative">
            <Input
              aria-label="Sets"
              className="h-16 px-4 pr-14 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              min={1}
              onChange={(e) => {
                setNewExercise({
                  ...newExercise,
                  sets: Number(e.target.value),
                });
              }}
              step={1}
              type="number"
              value={newExercise.sets}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
              sets
            </span>
          </div>
          <Button
            aria-label="Decrease sets"
            className="h-16"
            disabled={newExercise.sets <= 1}
            onClick={() =>
              setNewExercise({
                ...newExercise,
                sets: Math.max(1, newExercise.sets - 1),
              })
            }
            type="button"
            variant="outline"
          >
            <Minus className="size-8" />
          </Button>
        </div>

        <AdvancedExerciseOptionsDialog
          exercise={newExercise}
          onExerciseChange={setNewExercise}
        />

        <Button className="h-16 text-xl font-semibold" type="submit">
          Create Exercise
        </Button>
      </form>
    </main>
  );
}
