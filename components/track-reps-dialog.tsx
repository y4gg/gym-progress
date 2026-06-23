"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Exercise } from "@/lib/types";

function clampReps(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function TrackRepsDialog({
  defaultReps,
  exercise,
  onConfirm,
  onSkip,
  open,
}: {
  defaultReps: number;
  exercise: Exercise;
  onConfirm: (reps: number) => void;
  onSkip: () => void;
  open: boolean;
}) {
  const [reps, setReps] = useState(() => clampReps(defaultReps));

  return (
    <Dialog open={open}>
      <DialogContent
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-3xl font-bold">
            Track reps?
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2">
          <Button
            aria-label={`Decrease reps for ${exercise.name}`}
            className="h-16"
            disabled={reps <= 0}
            onClick={() => setReps((currentReps) => Math.max(0, currentReps - 1))}
            type="button"
            variant="outline"
          >
            <Minus className="size-8" />
          </Button>

          <Input
            aria-label={`Reps for ${exercise.name}`}
            className="h-16 px-5 text-center text-3xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            inputMode="numeric"
            min={0}
            onChange={(event) => setReps(clampReps(Number(event.target.value)))}
            placeholder="0"
            step={1}
            type="number"
            value={reps}
          />

          <Button
            aria-label={`Increase reps for ${exercise.name}`}
            className="h-16"
            onClick={() => setReps((currentReps) => currentReps + 1)}
            type="button"
            variant="outline"
          >
            <Plus className="size-8" />
          </Button>
        </div>

        <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
          <Button
            className="h-14 text-xl font-semibold"
            onClick={onSkip}
            type="button"
            variant="outline"
          >
            No
          </Button>
          <Button
            className="h-14 text-xl font-semibold"
            onClick={() => onConfirm(clampReps(reps))}
            type="button"
          >
            Yes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
