import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { AppLink } from "@/components/app-navigation";
import { Button } from "@/components/ui/button";

export function SettingsLayout({
  title,
  back = true,
  children,
}: {
  title: string;
  back?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-9 pb-28 lg:pb-10">
      <div className="grid gap-6">
        <header className="flex min-h-11 items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {back && (
            <Button asChild variant="ghost" className="min-h-11">
              <AppLink href="/settings" aria-label="Back to settings">
                <ArrowLeft aria-hidden="true" />
                Back
              </AppLink>
            </Button>
          )}
        </header>
        {children}
      </div>
    </main>
  );
}
