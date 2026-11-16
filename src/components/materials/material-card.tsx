import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock, Coins, FileText, FlaskConical, PlayCircle, type LucideIcon } from "lucide-react";
import { ProgressStatusChip } from "@/components/materials/progress-status-chip";
import { PriorityChip } from "@/components/ui/priority-chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatCredits, formatMinutes } from "@/lib/format";
import { MATERIAL_TYPE_LABELS, type MaterialType, type PriorityLevel, type ProgressStatus } from "@/lib/labels";

export interface MaterialSummary {
  id: string;
  title: string;
  summary: string | null;
  type: MaterialType;
  priority: PriorityLevel;
  requiresAcknowledgement: boolean;
  estimatedMinutes: number | null;
  cpdCreditsX10: number;
  status: ProgressStatus;
  watchedPercent: number;
}

const TYPE_ICON: Record<MaterialType, LucideIcon> = {
  DOCUMENT: FileText,
  VIDEO: PlayCircle,
  LAB: FlaskConical,
  ASSESSMENT_LINK: ClipboardCheck,
};

export function MaterialCard({ material, context }: { material: MaterialSummary; context?: string }) {
  const Icon = TYPE_ICON[material.type];
  return (
    <Link
      href={`/materials/${material.id}`}
      className="group flex h-full flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-panel transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-surface-2 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <ProgressStatusChip status={material.status} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {MATERIAL_TYPE_LABELS[material.type]}
          {context ? ` · ${context}` : ""}
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-ink group-hover:text-primary">{material.title}</h3>
        {material.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{material.summary}</p>}
      </div>

      {material.status === "IN_PROGRESS" && <ProgressBar value={material.watchedPercent} label={`Progress on ${material.title}`} />}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
        <PriorityChip priority={material.priority} />
        {material.requiresAcknowledgement && <span className="font-semibold text-warn">Acknowledgement required</span>}
        {material.estimatedMinutes !== null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatMinutes(material.estimatedMinutes)}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Coins className="h-3.5 w-3.5" aria-hidden />
          {formatCredits(material.cpdCreditsX10)}
        </span>
        <ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}
