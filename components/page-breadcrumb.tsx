import { ChevronRight } from "lucide-react";

import { AppLink } from "@/components/app-navigation";
import { WorkoutIcon } from "@/components/workout-icon";

export function PageBreadcrumb({
  href,
  parentName,
  parentIcon,
  currentPage,
}: {
  href: string;
  parentName: string;
  parentIcon?: string;
  currentPage: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex min-w-0 items-center gap-2">
        <li className="min-w-0 max-w-[60%]">
          <AppLink
            href={href}
            className="-ml-2 flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <WorkoutIcon name={parentIcon} className="size-4 shrink-0" />
            <span className="truncate">{parentName}</span>
          </AppLink>
        </li>
        <li aria-hidden="true" className="shrink-0 text-muted-foreground/50">
          <ChevronRight className="size-3.5" />
        </li>
        <li aria-current="page" className="min-w-0 truncate font-medium">
          {currentPage}
        </li>
      </ol>
    </nav>
  );
}
