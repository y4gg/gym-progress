"use client";

import { Info, SlidersHorizontal } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Exercise } from "@/lib/types";

export function AdvancedExerciseOptionsDialog({
  exercise,
  onExerciseChange,
}: {
  exercise: Exercise;
  onExerciseChange: (exercise: Exercise) => void;
}) {
  const loggingId = useId();
  const stepId = useId();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="h-16 justify-start gap-3 px-5 text-xl font-semibold"
          type="button"
          variant="outline"
        >
          <SlidersHorizontal className="size-6" />
          <span>Advanced</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="pr-8 text-2xl font-bold">
            Advanced
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Label htmlFor={stepId} className="sr-only">
              Weight step
            </Label>
            <Input
              className="h-16 px-5 pr-14 text-center text-2xl font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              defaultValue={exercise.step ?? 2.5}
              id={stepId}
              inputMode="decimal"
              min={0.01}
              onChange={(event) =>
                onExerciseChange({
                  ...exercise,
                  step:
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                })
              }
              placeholder="2.5"
              step="any"
              type="number"
            />
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
              kg steps
            </span>
          </div>

          <div className="grid grid-cols-[1fr_4.5rem] gap-2">
            <Button
              className="h-16 justify-start whitespace-normal px-5 text-left text-base"
              type="button"
              variant="outline"
            >
              Increase weight suggestion
            </Button>
            <Button
              aria-label="Increase weight suggestion info"
              className="h-16"
              type="button"
              variant="outline"
            >
              <Info className="size-8" />
            </Button>
          </div>

          <label
            className="flex h-16 items-center justify-between gap-4 rounded-lg border border-input px-5 text-xl font-semibold"
            htmlFor={loggingId}
          >
            <span className="min-w-0 truncate">Enable Rep Tracking</span>
            <Switch
              checked={exercise.logging}
              id={loggingId}
              onCheckedChange={(checked) =>
                onExerciseChange({ ...exercise, logging: checked })
              }
            />
          </label>
        </div>

        <DialogFooter className="grid">
          <DialogClose asChild>
            <Button
              className="h-14 w-full text-lg font-semibold"
              variant="outline"
            >
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
