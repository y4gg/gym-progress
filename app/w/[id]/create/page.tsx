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

export default function CreateExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const workout = useStore((state) => state.getWorkoutById(id));
  const [exercise, setExercise] = useState<Exercise>({
    id: createId(),
    name: "",
    weight: 0,
    notes: "",
    sets: 0,
    logging: false,
    workoutId: id,
  });

  if (!workout) {
    return <div>Workout not found</div>;
  }

  const handleCreateExercise = () => {
    // TODO: validate input
    useStore.getState().addExercise(exercise, workout.id);
    router.push(`/w/${workout.id}`);
    toast.success("Exercise created successfully!");
  };

  return (
    <div className="grid sm:p-24 mx-auto max-w-7xl gap-2 p-6">
      <h1 className="text-4xl font-bold">Create Exercise</h1>
      <div className="grid gap-1">
        <Label>Exercise Name</Label>
        <Input
          value={exercise.name}
          onChange={(e) => setExercise({ ...exercise, name: e.target.value })}
        />
      </div>
      <div>
        <Label>Weight</Label>
        <div className="relative mt-1">
          <Input
            type="number"
            className="pr-7"
            value={exercise.weight}
            onChange={(e) =>
              setExercise({ ...exercise, weight: Number(e.target.value) })
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
          value={exercise.notes}
          onChange={(e) => setExercise({ ...exercise, notes: e.target.value })}
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
              className="pr-10"
              value={exercise.sets}
              onChange={(e) =>
                setExercise({ ...exercise, sets: Number(e.target.value) })
              }
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
            setExercise({ ...exercise, logging: value === "true" })
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
