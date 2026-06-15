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
import { Exercise } from "@/lib/types";
import { toast } from "sonner";
import z from "zod";
import { Minus, Plus } from "lucide-react";
import { AdvancedExerciseOptionsDialog } from "@/components/advanced-exercise-options-dialog";

export function EditExerciseDialog({
  exercise,
  trigger,
}: {
  exercise: Exercise;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [newExercise, setNewExercise] = useState<Exercise>(exercise);

  const { editExercise } = useStore();

  const exerciseSchema = z.object({
    name: z.string().min(4),
    weight: z.number().min(0),
    notes: z.string().optional(),
    sets: z.number().min(1).multipleOf(1),
    logging: z.boolean(),
  });

  const handleEditExercise = () => {
    try {
      exerciseSchema.parse(newExercise);
    } catch (error) {
      if (error instanceof z.ZodError)
        error.issues.forEach((issue) => {
          toast.error(`${issue.input}: ${issue.code}`);
        });
      return;
    }
    editExercise(newExercise);
    toast.success("Exercise edited successfully.");
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setNewExercise(exercise);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8 text-2xl font-bold">
            Edit exercise
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" className="sr-only">
              Name
            </Label>
            <Input
              id="name"
              placeholder="Exercise name"
              value={newExercise.name}
              onChange={(e) =>
                setNewExercise({ ...newExercise, name: e.target.value })
              }
              className="h-16 px-5 text-center text-2xl font-semibold"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleEditExercise();
                }
              }}
            />
          </div>

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
              <Label htmlFor="sets" className="sr-only">
                Sets
              </Label>
              <Input
                id="sets"
                type="number"
                value={newExercise.sets}
                onChange={(e) =>
                  setNewExercise({
                    ...newExercise,
                    sets: Number(e.target.value),
                  })
                }
                className="h-16 px-4 pr-14 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleEditExercise();
                  }
                }}
                min={1}
                step={1}
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
        </div>
        <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
          <DialogClose asChild>
            <Button className="h-14 text-lg font-semibold" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            className="h-14 text-lg font-semibold"
            onClick={handleEditExercise}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
