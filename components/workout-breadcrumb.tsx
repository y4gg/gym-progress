import { AppLink } from "@/components/app-navigation";
import { WorkoutIcon } from "@/components/workout-icon";
import type { Workout } from "@/lib/types";

export function WorkoutBreadcrumb({
  workout,
  currentPage,
}: {
  workout: Pick<Workout, "id" | "name" | "icon">;
  currentPage: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
      <ol className="flex min-h-11 min-w-0 items-center justify-center gap-2">
        <li className="min-w-0">
          <AppLink
            href={`/w/${workout.id}`}
            className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-sm font-medium transition-colors hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <WorkoutIcon name={workout.icon} className="size-4 shrink-0" />
            <span className="truncate">{workout.name}</span>
          </AppLink>
        </li>
        <li aria-hidden="true" className="shrink-0 text-border">
          /
        </li>
        <li aria-current="page" className="shrink-0">
          {currentPage}
        </li>
      </ol>
    </nav>
  );
}
