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
import { createId } from "@paralleldrive/cuid2";
import z from "zod";
import { toast } from "sonner";

export function CreateWorkoutDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [workoutName, setWorkoutName] = useState("");

  const { addWorkout } = useStore();

  const workoutSchema = z.object({
    name: z.string().nonempty(),
  });

  const handleCreateWorkout = () => {
    try {
      workoutSchema.parse({ name: workoutName });
    } catch (error) {
      if (error instanceof z.ZodError)
        error.issues.forEach((issue) => {
          toast.error(`${issue.input}: ${issue.code}`);
        });
      return;
    }
    const id = createId();
    addWorkout({ id, name: workoutName, exercises: [] });
    setWorkoutName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">Create Workout</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Workout</DialogTitle>
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
                handleCreateWorkout();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleCreateWorkout}>Create Workout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
