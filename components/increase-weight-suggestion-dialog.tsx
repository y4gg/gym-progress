"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const DEFAULT_MAX_REPS = 8;

function clampMaxReps(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

export function IncreaseWeightSuggestionDialog<
  TExercise extends { maxReps?: number },
>({
  exercise,
  onExerciseChange,
  onOpenChange,
  open,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: TExercise;
  onExerciseChange: Dispatch<SetStateAction<TExercise>>;
}) {
  const enabledId = useId();
  const repsId = useId();
  const [enabled, setEnabled] = useState(() => exercise.maxReps !== undefined);
  const [reps, setReps] = useState(() =>
    clampMaxReps(exercise.maxReps ?? DEFAULT_MAX_REPS),
  );

  const saveSuggestion = () => {
    onExerciseChange((currentExercise) => ({
      ...currentExercise,
      maxReps: enabled ? clampMaxReps(reps) : undefined,
    }));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8 text-2xl font-bold">
            Weight suggestion
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <label
            className="flex h-16 items-center justify-between gap-4 rounded-lg border border-input px-5 text-xl font-semibold"
            htmlFor={enabledId}
          >
            <span>Enabled</span>
            <Switch
              checked={enabled}
              id={enabledId}
              onCheckedChange={setEnabled}
            />
          </label>

          <div className="grid grid-cols-[4.5rem_1fr_4.5rem] gap-2">
            <Button
              aria-label="Decrease target reps"
              className="h-16"
              disabled={!enabled || reps <= 1}
              onClick={() =>
                setReps((currentReps) => Math.max(1, currentReps - 1))
              }
              type="button"
              variant="outline"
            >
              <Minus className="size-8" />
            </Button>

            <div className="relative">
              <Label htmlFor={repsId} className="sr-only">
                Target reps
              </Label>
              <Input
                className="h-16 px-4 pr-14 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                disabled={!enabled}
                id={repsId}
                inputMode="numeric"
                min={1}
                onChange={(event) =>
                  setReps(clampMaxReps(Number(event.target.value)))
                }
                placeholder={`${DEFAULT_MAX_REPS}`}
                step={1}
                type="number"
                value={reps}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                reps
              </span>
            </div>

            <Button
              aria-label="Increase target reps"
              className="h-16"
              disabled={!enabled}
              onClick={() => setReps((currentReps) => currentReps + 1)}
              type="button"
              variant="outline"
            >
              <Plus className="size-8" />
            </Button>
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 sm:grid-cols-2">
          <Button
            className="h-14 text-xl font-semibold"
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="h-14 text-xl font-semibold"
            onClick={saveSuggestion}
            type="button"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
