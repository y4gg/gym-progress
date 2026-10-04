import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
};

export function EmptyState({ icon, title, children }: EmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center gap-6 py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        {icon ? (
          <div aria-hidden="true" className="text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      {children}
    </div>
  );
}
