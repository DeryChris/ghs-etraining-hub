import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock, FileText, FlaskConical, PlayCircle, type LucideIcon } from "lucide-react";
import { PriorityChip } from "@/components/ui/priority-chip";
import { formatMinutes } from "@/lib/format";
import { MATERIAL_TYPE_LABELS, type MaterialType, type PriorityLevel } from "@/lib/labels";

export interface MaterialSummary {
  id: string;
  title: string;
  summary: string | null;
  type: MaterialType;
  priority: PriorityLevel;
  estimatedMinutes: number | null;
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
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {MATERIAL_TYPE_LABELS[material.type]}
          {context ? ` · ${context}` : ""}
        </p>
        <h3 className="mt-1 text-base font-semibold leading-snug text-ink group-hover:text-primary">{material.title}</h3>
        {material.summary && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{material.summary}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
        <PriorityChip priority={material.priority} />
        {material.estimatedMinutes !== null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatMinutes(material.estimatedMinutes)}
          </span>
        )}
        <ArrowRight className="ml-auto h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </Link>
  );
}
