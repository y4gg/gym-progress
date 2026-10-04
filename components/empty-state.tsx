import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  children?: ReactNode;
};

export function EmptyState({ title, children }: EmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center gap-6 py-10 text-center">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}
