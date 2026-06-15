"use client";
import {
  Dialog,
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
import z from "zod";
import { toast } from "sonner";
import { DeleteDialog } from "@/components/delete-dialog";

export function EditWorkoutDialog({
  id,
  trigger,
}: {
  id: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

  const workout = useStore((state) => state.getWorkoutById(id));
  const editWorkout = useStore((state) => state.editWorkout);
  const deleteWorkout = useStore((state) => state.deleteWorkout);

  const workoutSchema = z.object({
    name: z.string().nonempty(),
  });

  const handleEditWorkout = () => {
    try {
      workoutSchema.parse({ name: workoutName });
    } catch (error) {
      if (error instanceof z.ZodError)
        error.issues.forEach((issue) => {
          toast.error(`${issue.input}: ${issue.code}`);
        });
      return;
    }
    if (!workout) return;

    editWorkout({ ...workout, name: workoutName });
    setOpen(false);
  };

  const handleDeleteWorkout = () => {
    deleteWorkout(id);
    toast.success("Workout deleted successfully.");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setWorkoutName(workout?.name ?? "");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8 text-2xl font-bold">
            Edit workout
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="sr-only">
            Name
          </Label>
          <Input
            id="name"
            placeholder="Workout name"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            className="h-16 px-5 text-center text-2xl font-semibold"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleEditWorkout();
              }
            }}
          />
        </div>
        <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
          <DeleteDialog
            onConfirm={handleDeleteWorkout}
            title="Delete workout?"
            element={
              <Button
                className="h-14 text-lg font-semibold"
                variant="destructive"
              >
                Delete
              </Button>
            }
          />
          <Button
            className="h-14 text-lg font-semibold"
            onClick={handleEditWorkout}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
