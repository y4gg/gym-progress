import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { AppLink } from "@/components/app-navigation";
import { Button } from "@/components/ui/button";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      asChild
      variant="ghost"
      className="mb-3 h-11 gap-2 px-3 text-base text-muted-foreground"
    >
      <AppLink href={href}>
        <ArrowLeft aria-hidden="true" />
        {children}
      </AppLink>
    </Button>
  );
}
