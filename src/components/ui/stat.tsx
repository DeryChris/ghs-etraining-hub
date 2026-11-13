import * as React from "react";
import { cn } from "@/lib/utils";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: React.ReactNode;
}

export function Stat({ className, value, label, ...props }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-xs text-ink-muted">{label}</div>
    </div>
  );
}
