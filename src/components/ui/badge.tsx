import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success" | "warn" | "danger";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-surface-2 border border-hairline text-ink-muted",
    outline: "bg-transparent border border-hairline text-ink-muted",
    success: "bg-ghs-green/10 border-ghs-green/30 text-ghs-green",
    warn: "bg-amber-400/10 border-amber-400/30 text-amber-400",
    danger: "bg-rose-400/10 border-rose-400/30 text-rose-400",
  };

  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
