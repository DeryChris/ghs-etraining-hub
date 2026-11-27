/**
 * The icon for each sidebar/nav destination, in one map.
 *
 * Both shells draw from the same list, so a destination that changes its glyph
 * changes it everywhere instead of in the shell somebody happened to be editing.
 * Pure data plus lucide components: no hooks, no markup.
 */
import {
  BarChart3,
  Bell,
  CalendarCheck2,
  ClipboardCheck,
  FolderOpen,
  FolderTree,
  LayoutGrid,
  MapPinned,
  Megaphone,
  MessageSquare,
  MessageSquareWarning,
  PenLine,
  Settings,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { NavIcon } from "@/lib/nav";

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutGrid,
  training: CalendarCheck2,
  library: FolderOpen,
  messages: MessageSquare,
  notifications: Bell,
  cpd: BarChart3,
  insights: TrendingUp,
  materials: PenLine,
  review: ClipboardCheck,
  notice: Megaphone,
  users: Users,
  geography: MapPinned,
  taxonomy: FolderTree,
  complaint: MessageSquareWarning,
  settings: Settings,
};
