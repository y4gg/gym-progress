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
import { ChevronRight, Dumbbell, Edit, Plus } from "lucide-react";
import { toast } from "sonner";
import { WorkoutIcon } from "@/components/workout-icon";
import { AppLogo } from "@/components/app-logo";

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
    <main className="gym-page flex flex-col gap-4">
      <header className="gym-panel gym-hero gym-hero-home">
        <div className="gym-hero-plate" aria-hidden="true">
          <AppLogo />
        </div>
        <div className="relative z-10 max-w-fit">
          <h1 className="gym-page-title gym-hero-title">Workouts</h1>
          {hydrated && (
            <CreateWorkoutDialog
              trigger={
                <Button className="mt-4 h-11 gap-2 px-3 text-base" type="button">
                  <Plus aria-hidden="true" />
                  Create workout
                </Button>
              }
            />
          )}
        </div>
      </header>
      {hydrated && workouts.length === 0 && (
        <div className="gym-panel">
          <EmptyState
            icon={<Dumbbell className="size-8" />}
            title="No workouts yet"
          />
        </div>
      )}
      {workouts.map((workout: Workout) => (
        <div className="gym-row flex min-h-18 items-center gap-1 p-2" key={workout.id}>
          <Link
            aria-label={workout.name}
            className="gym-row-link gym-focus flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-lg px-2"
            href={`/w/${workout.id}?redirect=true`}
          >
            <span className="gym-icon-tile size-10">
              <WorkoutIcon name={workout.icon} className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xl leading-tight font-semibold">{workout.name}</span>
              <span aria-hidden="true" className="text-sm text-muted-foreground">
                {workout.exercises.length} {workout.exercises.length === 1 ? "exercise" : "exercises"}
              </span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </Link>
          <EditWorkoutDialog
            id={workout.id}
            trigger={
              <Button
                aria-label={`Edit ${workout.name}`}
                className="size-11"
                size="icon"
                variant="outline"
              >
                <Edit aria-hidden="true" />
              </Button>
            }
          />
        </div>
      ))}
    </main>
  );
}
