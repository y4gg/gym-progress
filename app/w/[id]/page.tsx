"use client";
import { use } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Exercise } from "@/lib/types";
import { Edit } from "lucide-react";
import { notFound } from "next/navigation";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { EditExerciseDialog } from "@/components/edit-exercise-dialog";

export default function WorkoutOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const hydrated = useStoreHydrated();
  const workout = useStore((state) => state.getWorkoutById(id));

  if (!hydrated) {
    return null;
  }

  if (!workout) {
    notFound();
  }

  const exercises = workout.exercises;

  return (
    <div className="flex flex-col items-center max-w-xl mx-auto py-10 gap-1">
      <div className="w-full">
        <Link href={`/w/${id}/create`}>
          <Button variant="outline">Create Exercise</Button>
        </Link>
      </div>
      {exercises.map((exercise: Exercise) => (
        <div className="flex w-full gap-0.5" key={exercise.id}>
          <Button
            asChild
            variant={"default"}
            className="flex-1 justify-between text-left"
          >
            <Link href={`/e/${exercise.id}`}>
              <span>{exercise.name}</span>
            </Link>
          </Button>
          <EditExerciseDialog
            trigger={
              <Button variant="secondary" size="icon">
                <Edit />
              </Button>
            }
            exercise={exercise}
          />
        </div>
      ))}
    </div>
  );
}
