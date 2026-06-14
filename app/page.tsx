"use client";
import { useStore } from "@/lib/store";
import { Workout } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EditWorkoutDialog } from "@/components/edit-workout-dialog";
import Link from "next/link";
import { Edit } from "lucide-react";

export default function Home() {
  const workouts = useStore((state) => state.workouts);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-3 px-6 py-7 pb-28">
      {workouts.map((workout: Workout) => (
        <div className="flex w-full gap-2" key={workout.id}>
          <Button
            asChild
            variant="outline"
            className="h-16 min-w-0 flex-1 justify-start px-5 text-left text-2xl font-semibold"
          >
            <Link href={`/w/${workout.id}?redirect=true`}>
              <span className="min-w-0 truncate">{workout.name}</span>
            </Link>
          </Button>
          <EditWorkoutDialog
            id={workout.id}
            trigger={
              <Button
                aria-label={`Edit ${workout.name}`}
                className="h-16 w-16"
                variant="secondary"
              >
                <Edit />
              </Button>
            }
          />
        </div>
      ))}
    </main>
  );
}
