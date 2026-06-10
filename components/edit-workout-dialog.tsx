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
import { Edit } from "lucide-react";

export function EditWorkoutDialog({
  id,
  trigger,
}: {
  id: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

  const { editWorkout } = useStore();

  const handleEditWorkout = () => {
    editWorkout({ id, name: workoutName, exercises: [] });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Workout</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="col-span-3"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleEditWorkout();
              }
            }}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleEditWorkout}>
            Edit Workout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
