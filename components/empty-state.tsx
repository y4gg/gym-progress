import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
};

export function EmptyState({
  icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-xl border border-dashed px-6 py-10 text-center">
      {icon ? (
        <div
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        >
          {icon}
        </div>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
