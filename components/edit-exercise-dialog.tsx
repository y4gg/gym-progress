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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

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

  const handleEditExercise = () => {
    editExercise(newExercise);
    toast.success("Exercise edited successfuly.");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Exercise</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            value={newExercise.name}
            onChange={(e) =>
              setNewExercise({ ...newExercise, name: e.target.value })
            }
            className="col-span-3"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleEditExercise();
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sets" className="text-right">
            Sets
          </Label>
          <Input
            id="sets"
            type="number"
            value={newExercise.sets}
            onChange={(e) =>
              setNewExercise({ ...newExercise, sets: Number(e.target.value) })
            }
            className="col-span-3"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleEditExercise();
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="logging" className="text-right">
            Logging
          </Label>
          <ToggleGroup
            type="single"
            onValueChange={(value) =>
              setNewExercise({ ...newExercise, logging: value === "false" })
            }
            defaultValue={newExercise.logging?.toString()}
          >
            <ToggleGroupItem value="true">Enabled</ToggleGroupItem>
            <ToggleGroupItem value="false">Disabled</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleEditExercise}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
