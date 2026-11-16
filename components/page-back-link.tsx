import { ArrowLeft } from "lucide-react";

import { AppLink } from "@/components/app-navigation";

export function PageBackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <AppLink
      href={href}
      className="mb-4 flex min-h-11 w-fit items-center gap-2 rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {children}
    </AppLink>
  );
}
