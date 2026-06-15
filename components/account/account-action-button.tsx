"use client";

import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AccountActionButtonProps = Omit<
  ComponentProps<typeof Button>,
  "children"
> & {
  children: ReactNode;
  icon: ReactNode;
};

export function AccountActionButton({
  children,
  className,
  icon,
  type = "button",
  variant = "outline",
  ...props
}: AccountActionButtonProps) {
  return (
    <Button
      className={cn(
        "h-14 w-full justify-start gap-3 px-4 text-base",
        className,
      )}
      type={type}
      variant={variant}
      {...props}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </Button>
  );
}
