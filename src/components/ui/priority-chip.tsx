import { AlertTriangle, Circle, ShieldAlert, type LucideIcon } from "lucide-react";
import { PRIORITY_LABELS, type PriorityLevel } from "@/lib/labels";
import { cn } from "@/lib/utils";

// Priority is conveyed by icon and text together, never by colour alone.
const STYLES: Record<PriorityLevel, { icon: LucideIcon; className: string }> = {
  CRITICAL: { icon: ShieldAlert, className: "border-danger/40 bg-danger/10 text-danger" },
  HIGH: { icon: AlertTriangle, className: "border-warn/40 bg-warn/10 text-warn" },
  MEDIUM: { icon: Circle, className: "border-hairline bg-surface-2 text-ink" },
  LOW: { icon: Circle, className: "border-hairline bg-transparent text-ink-muted" },
};

export function PriorityChip({ priority }: { priority: PriorityLevel }) {
  const { icon: Icon, className } = STYLES[priority];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", className)}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {PRIORITY_LABELS[priority]} priority
    </span>
  );
}
