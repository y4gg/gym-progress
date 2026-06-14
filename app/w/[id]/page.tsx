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
    <main className="mx-auto flex w-full max-w-sm flex-col gap-3 px-6 py-9 pb-28">
      <h1 className="mb-2 truncate text-center text-3xl font-bold">
        {workout.name}
      </h1>
      {exercises.map((exercise: Exercise) => (
        <div className="flex w-full gap-2" key={exercise.id}>
          <Button
            asChild
            variant="outline"
            className="h-16 min-w-0 flex-1 justify-start px-5 text-left text-2xl font-semibold"
          >
            <Link href={`/e/${exercise.id}`}>
              <span className="min-w-0 truncate">{exercise.name}</span>
            </Link>
          </Button>
          <EditExerciseDialog
            trigger={
              <Button
                aria-label={`Edit ${exercise.name}`}
                className="h-16 w-16"
                variant="secondary"
              >
                <Edit />
              </Button>
            }
            exercise={exercise}
          />
        </div>
      ))}
    </main>
  );
}
