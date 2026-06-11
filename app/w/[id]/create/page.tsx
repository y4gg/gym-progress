"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Exercise } from "@/lib/types";
import { createId } from "@paralleldrive/cuid2";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { use } from "react";
import { notFound } from "next/navigation";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import * as z from "zod";

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

  const exercise = z.object({
    name: z.string().min(4),
    weight: z.number().min(0),
    notes: z.string().optional(),
    sets: z.number().min(1).multipleOf(1),
    logging: z.boolean(),
  });

  const handleCreateExercise = () => {
    // TODO: validate input
    try {
      exercise.parse(newExercise);
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
    <div className="grid sm:p-24 mx-auto max-w-7xl gap-2 p-6">
      <h1 className="text-4xl font-bold">Create Exercise</h1>
      <div className="grid gap-1">
        <Label>Exercise Name</Label>
        <Input
          value={newExercise.name}
          onChange={(e) =>
            setNewExercise({ ...newExercise, name: e.target.value })
          }
        />
      </div>
      <div>
        <Label>Weight</Label>
        <div className="relative mt-1">
          <Input
            type="number"
            className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            value={newExercise.weight}
            onChange={(e) =>
              setNewExercise({ ...newExercise, weight: Number(e.target.value) })
            }
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            kg
          </span>
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea
          className="mt-1"
          value={newExercise.notes}
          onChange={(e) =>
            setNewExercise({ ...newExercise, notes: e.target.value })
          }
        />
      </div>
      <div>
        <Label>Sets</Label>
        <div className="flex items-center gap-1 mt-1">
          <Button size="icon" variant="outline">
            <Plus />
          </Button>
          <div className="relative">
            <Input
              type="number"
              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={newExercise.sets}
              onChange={(e) => {
                setNewExercise({
                  ...newExercise,
                  sets: Number(e.target.value),
                });
              }}
              min={1}
              step={1}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              sets
            </span>
          </div>
          <Button size="icon" variant="outline">
            <Minus />
          </Button>
        </div>
      </div>
      <div className="grid gap-1">
        <Label>Reps</Label>
        <div className="flex gap-1">
          <Button className="flex-1" variant="outline">
            Increase weight suggestions
          </Button>
          <Button variant="outline" size="icon">
            <Info />
          </Button>
        </div>
      </div>
      <div className="grid gap-1">
        <Label>Logging</Label>
        <ToggleGroup
          type="single"
          variant={"outline"}
          defaultValue="false"
          onValueChange={(value) =>
            setNewExercise({ ...newExercise, logging: value === "true" })
          }
        >
          <ToggleGroupItem value="true">Enabled</ToggleGroupItem>
          <ToggleGroupItem value="false">Disabled</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <Button onClick={handleCreateExercise}>Create Exercise</Button>
    </div>
  );
}
