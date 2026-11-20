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
    <main className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 sm:px-8 lg:mx-0 lg:max-w-3xl lg:px-12 lg:pt-10 lg:pb-12">
      <div className="grid gap-7 sm:gap-8 lg:gap-6">
        <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="text-[2rem] leading-[1.08] font-bold tracking-[-0.055em] sm:text-[2.5rem]">
            {title}
          </h1>
          {back && (
            <Button asChild variant="ghost" className="min-h-11 text-muted-foreground hover:text-foreground">
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
