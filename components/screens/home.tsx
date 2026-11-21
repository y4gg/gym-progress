"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Workout } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EditWorkoutDialog } from "@/components/edit-workout-dialog";
import { CreateWorkoutDialog } from "@/components/create-workout-dialog";
import { EmptyState } from "@/components/empty-state";
import { AppLink as Link } from "@/components/app-navigation";
import { useStoreHydrated } from "@/lib/use-store-hydrated";
import { Dumbbell, Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { WorkoutIcon } from "@/components/workout-icon";

export default function Home() {
  const workouts = useStore((state) => state.workouts);
  const hydrated = useStoreHydrated();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.get("emailVerified") !== "true") {
      return;
    }

    toast.success("Email verified.");
    searchParams.delete("emailVerified");

    const nextSearch = searchParams.toString();
    const nextURL = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;

    window.history.replaceState(null, "", nextURL);
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-[calc(var(--container-sm)+3rem)] flex-col gap-3 px-6 pt-6 pb-28 lg:max-w-3xl lg:pb-10">
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Workouts</h1>
        {hydrated && (
          <CreateWorkoutDialog
            trigger={
              <Button className="h-11 gap-2 px-3 text-base" type="button">
                <Plus aria-hidden="true" />
                Create workout
              </Button>
            }
          />
        )}
      </header>
      {hydrated && workouts.length === 0 && (
        <EmptyState
          icon={<Dumbbell className="size-10" />}
          title="No workouts yet"
        />
      )}
      {workouts.map((workout: Workout) => (
        <div className="flex w-full gap-2" key={workout.id}>
          <Button
            asChild
            variant="outline"
            className="h-16 min-w-0 flex-1 justify-start px-5 text-left text-2xl font-semibold"
          >
            <Link href={`/w/${workout.id}?redirect=true`}>
              <WorkoutIcon name={workout.icon} className="mr-2 size-6 shrink-0" />
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
