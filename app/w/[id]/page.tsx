"use client";
import { use } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Exercise } from "@/lib/types";
import { Edit } from "lucide-react";

export default function WorkoutOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const workout = useStore((state) => state.getWorkoutById(id));

  if (!workout) {
    return <div>Workout not found</div>;
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
          <Button variant="secondary" size="icon">
            <Edit />
          </Button>
        </div>
      ))}
    </div>
  );
}
