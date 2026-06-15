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
