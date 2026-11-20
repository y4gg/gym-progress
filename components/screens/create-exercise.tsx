"use client";
import { useAppRouter } from "@/components/app-navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { NewExercise } from "@/lib/types";
import { createId } from "@paralleldrive/cuid2";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { parseExerciseFields } from "@/lib/workout-validation";
import { toKilograms, weightInputValue } from "@/lib/weight-units";
import { AdvancedExerciseOptionsDialog } from "@/components/advanced-exercise-options-dialog";
import { WorkoutIconPicker } from "@/components/workout-icon-picker";
import { normalizeWorkoutIcon } from "@/lib/workout-icons";

export default function CreateExercisePage({ id }: { id: string }) {
  const hydrated = useStoreHydrated();
  if (!hydrated) return null;

  return <CreateExerciseForm key={id} id={id} />;
}

function CreateExerciseForm({ id }: { id: string }) {
  const router = useAppRouter();
  const workout = useStore((state) => state.getWorkoutById(id));
  const weightUnit = useStore((state) => state.weightUnit);
  const [stepInput, setStepInput] = useState<string | null>(null);
  const [newExercise, setNewExercise] = useState<NewExercise>(() => ({
    id: createId(),
    name: "",
    weight: 0,
    notes: "",
    ...useStore.getState().trainingDefaults,
    workoutId: id,
  }));

  if (!workout) {
    notFound();
  }

  const handleCreateExercise = () => {
    const result = parseExerciseFields(newExercise, stepInput, weightUnit);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    useStore.getState().addExercise({ ...newExercise, ...result.data });
    router.push(`/w/${workout.id}`);
    toast.success("Exercise created successfully!");
  };

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-9 pb-28 lg:max-w-xl lg:pb-10">
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

        <WorkoutIconPicker
          label="Exercise icon"
          value={normalizeWorkoutIcon(newExercise.icon)}
          onChange={(icon) => setNewExercise({ ...newExercise, icon })}
        />

        <div className="relative">
          <Input
            aria-label="Weight"
            aria-describedby="starting-weight-unit"
            className="h-16 px-5 pr-14 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            inputMode="decimal"
            min={0}
            onChange={(e) =>
              setNewExercise({
                ...newExercise,
                weight: toKilograms(Number(e.target.value), weightUnit),
              })
            }
            placeholder="0"
            step="any"
            type="number"
            value={weightInputValue(newExercise.weight, weightUnit)}
          />
          <span id="starting-weight-unit" className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-2xl font-semibold text-muted-foreground">
            {weightUnit}
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
          stepInput={stepInput}
          onStepInputChange={setStepInput}
          weightUnit={weightUnit}
        />

        <Button className="h-16 text-xl font-semibold" type="submit">
          Create Exercise
        </Button>
      </form>
    </main>
  );
}
