"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatWeight, type WeightUnit } from "@/lib/weight-units";

type WeightSuggestionReachedDialogProps = {
  open: boolean;
  exerciseName: string;
  currentWeight: number;
  nextWeight: number;
  weightUnit: WeightUnit;
  onCancel: () => void;
  onConfirm: () => void;
};

export function WeightSuggestionReachedDialog({
  open,
  exerciseName,
  currentWeight,
  nextWeight,
  weightUnit,
  onCancel,
  onConfirm,
}: WeightSuggestionReachedDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent onEscapeKeyDown={(event) => event.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-3xl font-bold">
            Weight suggestion
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-base leading-6">
            Congratulations! You have reached your weight suggestion threshold.
            Increase {exerciseName} from {formatWeight(currentWeight, weightUnit)} {weightUnit} to{" "}
            {formatWeight(nextWeight, weightUnit)} {weightUnit}?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="h-14 text-xl font-semibold"
            onClick={onCancel}
            type="button"
            variant="outline"
          >
            No
          </AlertDialogCancel>
          <AlertDialogAction
            className="h-14 text-xl font-semibold"
            onClick={onConfirm}
            type="button"
          >
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
