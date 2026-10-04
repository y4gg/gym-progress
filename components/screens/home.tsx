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
import { Dumbbell, Edit } from "lucide-react";
import { toast } from "sonner";

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
    <main className="mx-auto flex w-full max-w-sm flex-col gap-3 px-6 py-7 pb-28">
      {hydrated && workouts.length === 0 ? (
        <div className="flex min-h-[calc(100svh-8.75rem)] items-center">
          <EmptyState
            icon={<Dumbbell className="size-10" />}
            title="No workouts yet"
          >
            <CreateWorkoutDialog
              trigger={
                <Button className="h-12 w-full gap-2 text-base" type="button">
                  Create workout
                </Button>
              }
            />
          </EmptyState>
        </div>
      ) : null}
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
