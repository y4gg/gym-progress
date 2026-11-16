"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { createId } from "@paralleldrive/cuid2";
import { workoutFieldsSchema } from "@/lib/workout-validation";
import { toast } from "sonner";
import { WorkoutIconPicker } from "@/components/workout-icon-picker";
import { DEFAULT_WORKOUT_ICON, type WorkoutIconName } from "@/lib/workout-icons";

export function CreateWorkoutDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");
  const [workoutIcon, setWorkoutIcon] =
    useState<WorkoutIconName>(DEFAULT_WORKOUT_ICON);

  const addWorkout = useStore((state) => state.addWorkout);

  const handleCreateWorkout = () => {
    const result = workoutFieldsSchema.safeParse({
      name: workoutName,
      icon: workoutIcon,
    });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    const id = createId();
    addWorkout({ id, ...result.data, exercises: [] });
    setWorkoutName("");
    setWorkoutIcon(DEFAULT_WORKOUT_ICON);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Create Workout</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8 text-2xl font-bold">
            New workout
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="workout-name" className="sr-only">
            Workout name
          </Label>
          <Input
            id="workout-name"
            placeholder="Workout name"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="h-16 px-5 text-center text-2xl font-semibold"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateWorkout();
              }
            }}
          />
        </div>
        <WorkoutIconPicker value={workoutIcon} onChange={setWorkoutIcon} />
        <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
          <DialogClose asChild>
            <Button className="h-14 text-lg font-semibold" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="h-14 text-lg font-semibold"
            onClick={handleCreateWorkout}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
