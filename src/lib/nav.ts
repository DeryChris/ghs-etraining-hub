/**
 * The signed-in navigation, in one place.
 *
 * Pure data: no React, no database, no server-only imports, so the menu can be
 * unit-tested and rendered identically in the sidebar and anywhere else that
 * needs to know what a role may reach. Whether a role *may* use a destination is
 * still decided on the server (`requireRole` / `checkCapability`); this module
 * only decides what is worth showing, so a learner never sees a door they cannot
 * open.
 *
 * Sections are the headings in the sidebar. An item whose roles exclude the
 * viewer disappears, and a section that loses all of its items disappears with
 * it — which is why the administrator sees "Author" holding only the review
 * queue, while a facilitator sees their materials and notices there too.
 *
 * "Trainings" is the register (ADR-0013); "Catalogue" is the way into the
 * programme taxonomy it is filed under (ADR-0014). There is no longer a Sessions
 * tab: a session is a training, and it is recorded on the register.
 */
import type { Role } from "@/lib/rbac/capabilities";

/** Icon names are resolved to components by the sidebar, keeping this module pure. */
export type NavIcon =
  | "dashboard"
  | "training"
  | "geography"
  | "taxonomy"
  | "library"
  | "assessment"
  | "messages"
  | "notifications"
  | "cpd"
  | "insights"
  | "materials"
  | "review"
  | "notice"
  | "users"
  | "complaint"
  | "settings";

/** Unread/outstanding counts the shell already knows how to fetch. */
export type NavCount = "messages" | "notifications" | "reviews";

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  roles: readonly Role[];
  count?: NavCount;
  /** One line used as the link's title attribute where the label is terse. */
  hint?: string;
  /** Also shown to facilitators who are unit heads (they carry an extra duty). */
  unitHeadOnly?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: readonly NavItem[];
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const EVERYONE: readonly Role[] = ["SYSTEM_ADMIN", "FACILITATOR", "LEARNER"];
const STAFF: readonly Role[] = ["SYSTEM_ADMIN", "FACILITATOR"];
const FACILITATOR_ONLY: readonly Role[] = ["FACILITATOR"];
const ADMIN_ONLY: readonly Role[] = ["SYSTEM_ADMIN"];

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "learn",
    label: "Learn",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: EVERYONE },
      {
        href: "/trainings",
        label: "Trainings",
        icon: "training",
        roles: EVERYONE,
        hint: "Every training GHS has planned or run, by programme field and area",
      },
      { href: "/library", label: "Library", icon: "library", roles: EVERYONE },
      {
        href: "/assessments",
        label: "Pre/Post Test",
        icon: "assessment",
        roles: EVERYONE,
        hint: "Pre-tests, post-tests and the practical labs attached to them",
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    items: [
      { href: "/messages", label: "Messages", icon: "messages", roles: EVERYONE, count: "messages" },
      {
        href: "/notifications",
        label: "Notifications",
        icon: "notifications",
        roles: EVERYONE,
        count: "notifications",
      },
    ],
  },
  {
    id: "record",
    label: "My record",
    items: [
      { href: "/analytics", label: "My activity", icon: "cpd", roles: EVERYONE },
      {
        href: "/insights",
        label: "Insights",
        icon: "insights",
        roles: STAFF,
        hint: "Coverage, review backlog and completion across the programmes you run",
      },
    ],
  },
  {
    id: "author",
    label: "Author",
    items: [
      { href: "/authoring", label: "My materials", icon: "materials", roles: FACILITATOR_ONLY },
      {
        href: "/review",
        label: "Review queue",
        icon: "review",
        roles: ADMIN_ONLY,
        unitHeadOnly: true,
        count: "reviews",
        hint: "Versions waiting for a decision before anything goes live",
      },
      { href: "/notices", label: "Send notice", icon: "notice", roles: FACILITATOR_ONLY },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    items: [
      { href: "/users", label: "Users", icon: "users", roles: ADMIN_ONLY },
      {
        href: "/geography",
        label: "Geography & facilities",
        icon: "geography",
        roles: ADMIN_ONLY,
        hint: "Regions, districts, sub-districts and the facilities a training is held at",
      },
      {
        href: "/programme-fields",
        label: "Programme fields",
        icon: "taxonomy",
        roles: ADMIN_ONLY,
        hint: "The programme fields and areas a training plan is filed under",
      },
      {
        href: "/complaints",
        label: "Complaints",
        icon: "complaint",
        roles: STAFF,
        hint: "What staff have reported, to answer or reset access from",
      },
      { href: "/settings", label: "Settings", icon: "settings", roles: ADMIN_ONLY },
    ],
  },
];

/**
 * The sections a role should see, in order, with empty ones removed. The order
 * of `NAV_SECTIONS` is the order on screen, so a role's menu is never reordered
 * between pages.
 */
export function navFor(role: Role, options: { unitHead?: boolean } = {}): NavGroup[] {
  return NAV_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    items: section.items.filter(
      (item) =>
        item.roles.includes(role) ||
        // The extra duty only widens a facilitator's menu; it never promotes anyone.
        (role === "FACILITATOR" && options.unitHead === true && item.unitHeadOnly === true),
    ),
  })).filter((section) => section.items.length > 0);
}

/**
 * Which item is "here". `/dashboard` matches exactly — it is the root of the
 * shell, so every other path would otherwise light it up. Everything else matches
 * itself and its sub-paths (`/authoring/abc` keeps "My materials" selected).
 */
export function isActiveHref(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The active href for a pathname, if any — useful for breadcrumbs and tests. */
export function activeHref(pathname: string, role: Role, options: { unitHead?: boolean } = {}): string | undefined {
  const items = navFor(role, options).flatMap((section) => section.items);
  const match = items.filter((item) => isActiveHref(pathname, item.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href;
}
