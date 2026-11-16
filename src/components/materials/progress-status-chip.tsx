import { PROGRESS_LABELS, type ProgressStatus } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STYLES: Record<ProgressStatus, string> = {
  NOT_STARTED: "border-hairline text-ink-muted",
  IN_PROGRESS: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  COMPLETED: "border-primary/40 bg-primary/10 text-primary",
};

export function ProgressStatusChip({ status }: { status: ProgressStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", STYLES[status])}>
      {PROGRESS_LABELS[status]}
    </span>
  );
}
