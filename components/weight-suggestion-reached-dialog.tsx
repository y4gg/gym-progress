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

type WeightSuggestionReachedDialogProps = {
  open: boolean;
  exerciseName: string;
  currentWeight: number;
  nextWeight: number;
  onCancel: () => void;
  onConfirm: () => void;
};

function formatWeight(weight: number) {
  return Number.isInteger(weight) ? `${weight}` : weight.toFixed(2);
}

export function WeightSuggestionReachedDialog({
  open,
  exerciseName,
  currentWeight,
  nextWeight,
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
            Increase {exerciseName} from {formatWeight(currentWeight)} kg to{" "}
            {formatWeight(nextWeight)} kg?
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
