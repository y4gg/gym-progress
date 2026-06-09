"use client";
import { useStore } from "@/lib/store";
import { Workout } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CreateWorkoutDialog } from "@/components/create-workout-dialog";
import { EditWorkoutDialog } from "@/components/edit-workout-dialog";
import Link from "next/link";

export default function Home() {
  const workouts = useStore((state) => state.workouts);

  return (
    <div className="flex flex-col items-center max-w-xl mx-auto py-10 gap-1">
      <div className="w-full">
        <CreateWorkoutDialog />
      </div>
      {workouts.map((workout: Workout) => (
        <div className="flex w-full gap-0.5" key={workout.id}>
          <Button
            asChild
            variant={"default"}
            className="flex-1 justify-between text-left"
          >
            <Link href={`/w/${workout.id}?redirect=true`}>
              <span>{workout.name}</span>
            </Link>
          </Button>
          <EditWorkoutDialog id={workout.id} />
        </div>
      ))}
    </div>
  );
}
