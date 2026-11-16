import { ClipboardCheck, FileText, FlaskConical, PlayCircle, type LucideIcon } from "lucide-react";
import type { MaterialType } from "@/lib/labels";

const ICONS: Record<MaterialType, LucideIcon> = {
  DOCUMENT: FileText,
  VIDEO: PlayCircle,
  LAB: FlaskConical,
  ASSESSMENT_LINK: ClipboardCheck,
};

export function KindLabel({ type }: { type: MaterialType }) {
  const Icon = ICONS[type];
  return <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />;
}
