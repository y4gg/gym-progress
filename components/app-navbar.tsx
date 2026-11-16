"use client";

import {
  AppLink as Link,
  useAppPathname,
} from "@/components/app-navigation";
import { Home } from "lucide-react";

import { AppLogo } from "@/components/app-logo";
import { Launchpad } from "@/components/launchpad";
import { NavigationMenu } from "@/components/navigation-menu";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

type NavLinkProps = {
  children: React.ReactNode;
  className?: string;
  href: string;
  label: string;
};

const navItemClassName =
  "flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 lg:flex-none lg:justify-start";

function NavLink({ children, className, href, label }: NavLinkProps) {
  return (
    <Link
      aria-label={label}
      className={cn(navItemClassName, className)}
      href={href}
    >
      {children}
    </Link>
  );
}

export function AppNavbar() {
  const pathname = useAppPathname();
  const session = authClient.useSession();

  if (pathname === "/offline") return null;

  return (
    <>
      <aside
        aria-label="Sidebar"
        className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex"
      >
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 border-b px-5 py-6 text-lg font-bold focus-visible:outline-2 focus-visible:outline-ring"
        >
          <AppLogo className="size-8 shrink-0" />
          Gym Ladder
        </Link>
        <NavigationMenu
          pathname={pathname}
          session={session.data}
          isSessionPending={session.isPending}
        />
      </aside>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-6 pointer-events-none lg:hidden"
      >
        <div className="pointer-events-auto grid h-16 w-full max-w-xs grid-cols-2 items-center gap-1 rounded-xl border border-border bg-background/90 p-1 shadow-lg backdrop-blur-md">
          <NavLink className="ml-1" href="/" label="Home">
            <Home />
            <span>Home</span>
          </NavLink>
          <Launchpad
            key={pathname}
            pathname={pathname}
            session={session.data}
            isSessionPending={session.isPending}
            triggerClassName={cn(navItemClassName, "mr-1 cursor-pointer")}
          />
        </div>
      </nav>
    </>
  );
}
