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
 * The learner does not use the sections at all: `LEARNER_NAV` below is the top bar
 * of the reading shell (ADR-0027), and a test keeps the two lists in step.
 *
 * "Trainings" is the flat, filterable list of events (ADR-0013).
 * "Library" is the way in by subject — programme area, then programme field, then
 * the trainings and material filed under it (ADR-0014). They were briefly one
 * screen, which left the trainings list sharing space with the taxonomy; they are two
 * doors again because people arrive with one of two questions — "what ran this
 * year?" or "what exists for malaria?".
 *
 * There is no separate "Catalogue" item and no separate "Library" item: the
 * catalogue route is the library, and searching it is what the header box does.
 */
import type { Role } from "@/lib/rbac/capabilities";

/** Icon names are resolved to components by the sidebar, keeping this module pure. */
export type NavIcon =
  | "dashboard"
  | "training"
  | "geography"
  | "taxonomy"
  | "library"
  | "messages"
  | "notifications"
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

const EVERYONE: readonly Role[] = ["SYSTEM_ADMIN", "DISTRICT_HR", "FACILITATOR", "LEARNER"];
const STAFF: readonly Role[] = ["SYSTEM_ADMIN", "DISTRICT_HR", "FACILITATOR"];
const FACILITATOR_ONLY: readonly Role[] = ["FACILITATOR"];
const ADMIN_ONLY: readonly Role[] = ["SYSTEM_ADMIN"];
/** A district HR administers people in their own district, and nothing regional. */
const PEOPLE_ADMIN: readonly Role[] = ["SYSTEM_ADMIN", "DISTRICT_HR"];

export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "learn",
    label: "Learn",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: EVERYONE },
      {
        href: "/catalogue",
        label: "Library",
        icon: "library",
        roles: EVERYONE,
        hint: "Browse Programme Areas → Programme Fields, with published Training Materials and associated Training Session records",
      },
      {
        href: "/trainings",
        label: "Trainings",
        icon: "training",
        roles: EVERYONE,
        hint: "Search planned, held and cancelled Training Session records by Programme Area, Programme Field, date and status",
      },
    ],
  },
  {
    id: "community",
    label: "Community",
    items: [
      {
        href: "/messages",
        label: "Messages & complaints",
        icon: "messages",
        roles: EVERYONE,
        count: "messages",
        hint: "Conversations with colleagues and what staff have reported, in one list",
      },
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
      {
        href: "/insights",
        label: "Insights",
        icon: "insights",
        roles: STAFF,
        hint: "Training Material activity in your assigned scope, Training register records visible to you, and library reference counts",
      },
    ],
  },
  {
    id: "author",
    label: "Author",
    items: [
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
      { href: "/users", label: "Users", icon: "users", roles: PEOPLE_ADMIN },
      {
        href: "/geography",
        label: "Geography & facilities",
        icon: "geography",
        roles: PEOPLE_ADMIN,
        hint: "Regions, districts, sub-districts and the facilities a training is held at",
      },
      {
        href: "/programme-fields",
        label: "Programme areas",
        icon: "taxonomy",
        roles: ADMIN_ONLY,
        hint: "The programme areas and fields a training plan is filed under",
      },
      { href: "/settings", label: "Settings", icon: "settings", roles: ADMIN_ONLY },
    ],
  },
];

/**
 * The learner's five destinations — a top bar, not a sidebar.
 *
 * Members of staff are trained, not administered: they open the library, read
 * what their programme published, and write to a facilitator. A rail built for
 * people who live in tables made the product look like a management console and
 * pushed the two things they do most (find material, pick up where they left
 * off) into a corner. So the learner gets the same shape as the public site —
 * brand, five links, search, their account — and a bottom bar on a phone, which
 * is how most of them will see it.
 *
 * What is *not* here matters as much: no insights, no review queue, no user
 * administration, and no "My activity" tab. Their activity is on the dashboard,
 * where they will actually meet it (ADR‑0027).
 */
export interface LearnerNavItem {
  href: string;
  label: string;
  icon: NavIcon;
  /** Unread count to show as a badge, when this destination carries one. */
  count?: NavCount;
}

export const LEARNER_NAV: readonly LearnerNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/catalogue", label: "Library", icon: "library" },
  { href: "/trainings", label: "Trainings", icon: "training" },
  { href: "/messages", label: "Messages", icon: "messages", count: "messages" },
  { href: "/notifications", label: "Notifications", icon: "notifications", count: "notifications" },
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
