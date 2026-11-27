export type Role = "SYSTEM_ADMIN" | "FACILITATOR" | "LEARNER";

/**
 * What an administrator picks in a role field.
 *
 * Unit head is offered beside the three stored roles because that is how the
 * service talks about the post: a facilitator who also signs off the material
 * filed under their fields. In the database it stays a facilitator carrying the
 * `is_unit_head` duty — handing it its own enum value would mean re-checking
 * every area assignment, training and material query for a fourth role, and the
 * only extra permission it grants is deciding on the review queue.
 */
export type StaffRole = Role | "UNIT_HEAD";

/** Ordered by how much authority the choice carries. */
export const STAFF_ROLE_VALUES = ["LEARNER", "FACILITATOR", "UNIT_HEAD", "SYSTEM_ADMIN"] as const;

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return STAFF_ROLE_VALUES.includes(value as StaffRole);
}

/** The row a StaffRole writes: the stored role, plus the unit-head duty. */
export function roleForStaffRole(staffRole: StaffRole): { role: Role; unitHead: boolean } {
  return staffRole === "UNIT_HEAD" ? { role: "FACILITATOR", unitHead: true } : { role: staffRole, unitHead: false };
}

/** The choice a stored row corresponds to — the inverse of roleForStaffRole. */
export function staffRoleOf(user: { role: Role; unitHead?: boolean | null }): StaffRole {
  return user.role === "FACILITATOR" && user.unitHead === true ? "UNIT_HEAD" : user.role;
}

export type Action =
  | "user.create"
  | "user.bulk_import"
  | "user.deactivate"
  | "user.reactivate"
  | "user.assign_role"
  | "user.reset_password"
  | "user.read_pii"
  | "area.update"
  | "area.assign_facilitator"
  | "material.create"
  | "material.upload_version"
  | "material.submit_review"
  | "material.review"
  | "material.publish"
  | "material.archive"
  | "material.read_draft"
  | "material.read_published"
  | "material.download"
  | "assessment.configure"
  | "assessment.take"
  | "assessment.override_score"
  | "enrollment.self"
  | "enrollment.assign"
  | "comment.create"
  | "comment.edit_own"
  | "comment.moderate"
  | "message.send"
  | "message.read_any_thread"
  | "notification.broadcast"
  | "notification.view"
  | "training.manage"
  | "taxonomy.manage"
  | "geography.manage"
  | "analytics.view_personal"
  | "analytics.view_cohort"
  | "analytics.export"
  | "audit_log.read"
  | "maintenance_banner.manage"

export type Scope = {
  areaId?: string;
  region?: string;
  directorate?: string;
  cadre?: string;
  reviewerIsAuthor?: boolean;
  enrolled?: boolean;
  attemptsLeft?: boolean;
  audienceMatch?: boolean;
};

export const CAPABILITY_MATRIX: Record<Role, Record<Action, boolean>> = {
  SYSTEM_ADMIN: {
    "user.create": true,
    "user.bulk_import": true,
    "user.deactivate": true,
    "user.reactivate": true,
    "user.assign_role": true,
    "user.reset_password": true,
    "user.read_pii": true,
    "area.update": true,
    "area.assign_facilitator": true,
    "material.create": true,
    "material.upload_version": true,
    "material.submit_review": true,
    "material.review": true,
    "material.publish": true,
    "material.archive": true,
    "material.read_draft": true,
    "material.read_published": true,
    "material.download": true,
    "training.manage": true,
    "taxonomy.manage": true,
    "geography.manage": true,
    "assessment.configure": true,
    "assessment.take": true,
    "assessment.override_score": true,
    "enrollment.self": true,
    "enrollment.assign": true,
    "comment.create": true,
    "comment.edit_own": true,
    "comment.moderate": true,
    "message.send": true,
    "message.read_any_thread": true,
    "notification.broadcast": true,
    "notification.view": true,
    "analytics.view_personal": true,
    "analytics.view_cohort": true,
    "analytics.export": true,
    "audit_log.read": true,
    "maintenance_banner.manage": true,
  },
  FACILITATOR: {
    "user.create": false,
    "user.bulk_import": false,
    "user.deactivate": false,
    "user.reactivate": false,
    "user.assign_role": false,
    "user.reset_password": false,
    "user.read_pii": false,
    "area.update": false,
    "area.assign_facilitator": false,
    "material.create": true,
    "material.upload_version": true,
    "material.submit_review": true,
    "material.review": true,
    "material.publish": true,
    "material.archive": true,
    "material.read_draft": true,
    "material.read_published": true,
    "material.download": true,
    "training.manage": true,
    "taxonomy.manage": false,
    "geography.manage": false,
    "assessment.configure": true,
    "assessment.take": true,
    "assessment.override_score": false,
    "enrollment.self": true,
    "enrollment.assign": true,
    "comment.create": true,
    "comment.edit_own": true,
    "comment.moderate": true,
    "message.send": true,
    "message.read_any_thread": false,
    "notification.broadcast": true,
    "notification.view": true,
    "analytics.view_personal": true,
    "analytics.view_cohort": true,
    "analytics.export": true,
    "audit_log.read": false,
    "maintenance_banner.manage": false,
  },
  LEARNER: {
    "user.create": false,
    "user.bulk_import": false,
    "user.deactivate": false,
    "user.reactivate": false,
    "user.assign_role": false,
    "user.reset_password": false,
    "user.read_pii": false,
    "area.update": false,
    "area.assign_facilitator": false,
    "material.create": false,
    "material.upload_version": false,
    "material.submit_review": false,
    "material.review": false,
    "material.publish": false,
    "material.archive": false,
    "material.read_draft": false,
    "material.read_published": true,
    "material.download": true,
    "training.manage": false,
    "taxonomy.manage": false,
    "geography.manage": false,
    "assessment.configure": false,
    "assessment.take": true,
    "assessment.override_score": false,
    "enrollment.self": true,
    "enrollment.assign": false,
    "comment.create": true,
    "comment.edit_own": true,
    "comment.moderate": false,
    "message.send": true,
    "message.read_any_thread": false,
    "notification.broadcast": false,
    "notification.view": true,
    "analytics.view_personal": true,
    "analytics.view_cohort": false,
    "analytics.export": false,
    "audit_log.read": false,
    "maintenance_banner.manage": false,
  },
};

/**
 * Actions that need no session at all.
 *
 * Empty on purpose: certificate verification was the only public action, and it
 * is gone with the awarding model. The set stays because `can(null, …)` and the
 * matrix are written against it — anything added here becomes anonymous-accessible
 * by definition, so it should stay empty unless there is a real reason.
 */
export const PUBLIC_ACTIONS: ReadonlySet<Action> = new Set<Action>([]);

/**
 * Self-service and messaging actions a facilitator may perform outside their
 * assigned programme areas. Everything else they do is area-scoped, and
 * src/lib/server/rbac.ts verifies the assignment against area_facilitators.
 */
export const FACILITATOR_GLOBAL_ACTIONS: readonly Action[] = [
  "training.manage",
  "material.read_published",
  "material.download",
  "assessment.take",
  "enrollment.self",
  "comment.create",
  "comment.edit_own",
  "message.send",
  "notification.view",
  "analytics.view_personal",
];

export function isGlobalForFacilitators(action: Action): boolean {
  return FACILITATOR_GLOBAL_ACTIONS.includes(action);
}

/** Narrows an untrusted string (a search param, a form field) to a Role. */
export function isRole(value: string | null | undefined): value is Role {
  return value === "SYSTEM_ADMIN" || value === "FACILITATOR" || value === "LEARNER";
}

export function can(role: Role | null | undefined, action: Action): boolean {
  if (PUBLIC_ACTIONS.has(action)) return true;
  if (!role) return false;
  return CAPABILITY_MATRIX[role][action] ?? false;
}

export function scopeAllows(
  role: Role | null | undefined,
  action: Action,
  scope: Scope,
): boolean {
  if (!role) return false;

  if (!CAPABILITY_MATRIX[role][action]) return false;

  if (role === "LEARNER") {
    // docs/rbac.md §1: both reading and downloading require an audience match.
    if ((action === "material.read_published" || action === "material.download") && scope.audienceMatch === false) {
      return false;
    }
    if (action === "assessment.take" && (scope.enrolled === false || scope.attemptsLeft === false)) return false;
    return true;
  }

  if (role === "FACILITATOR") {
    // Two-person rule: the author of a version never reviews or publishes it.
    if ((action === "material.publish" || action === "material.review") && scope.reviewerIsAuthor === true) {
      return false;
    }
    // Self-service and messaging actions are global; everything else is area-bound.
    if (isGlobalForFacilitators(action)) return true;
    if (!scope.areaId) return false;
    return true;
  }

  return true;
}
