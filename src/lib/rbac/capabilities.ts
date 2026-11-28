export type Role = "SYSTEM_ADMIN" | "DISTRICT_HR" | "FACILITATOR" | "LEARNER";

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
export const STAFF_ROLE_VALUES = ["LEARNER", "FACILITATOR", "UNIT_HEAD", "DISTRICT_HR", "SYSTEM_ADMIN"] as const;

export function isStaffRole(value: string | null | undefined): value is StaffRole {
  return STAFF_ROLE_VALUES.includes(value as StaffRole);
}

/** The row a StaffRole writes: the stored role, plus the unit-head duty. */
export function roleForStaffRole(staffRole: StaffRole): { role: Role; unitHead: boolean } {
  return staffRole === "UNIT_HEAD" ? { role: "FACILITATOR", unitHead: true } : { role: staffRole, unitHead: false };
}

/**
 * Which roles one person may hand out.
 *
 * A system administrator may grant anything, including another administrator.
 * A District HR may make somebody in their district a facilitator or a unit head
 * — that is the point of the role, HR runs the establishment — but may not mint
 * administrators (who are unscoped, and so could reach every district) or another
 * District HR (which would multiply authority over their own district without
 * anybody above them deciding to). Enforced in the action, not only in the
 * picker: the picker is a convenience, the check is the rule.
 */
export function rolesAssignableBy(actor: Role): readonly StaffRole[] {
  if (actor === "SYSTEM_ADMIN") return STAFF_ROLE_VALUES;
  if (actor === "DISTRICT_HR") return ["LEARNER", "FACILITATOR", "UNIT_HEAD"];
  return [];
}

export function canAssignRole(actor: Role, target: StaffRole): boolean {
  return rolesAssignableBy(actor).includes(target);
}

/** Roles whose authority stops at their own district. One today. */
export function isDistrictScoped(role: Role): boolean {
  return role === "DISTRICT_HR";
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
  /** Legacy `programme_areas.id`: the user-facing Programme Field being acted on. */
  areaId?: string;
  region?: string;
  directorate?: string;
  grade?: string;
  reviewerIsAuthor?: boolean;
  audienceMatch?: boolean;
};

/** Everything, stated once. `DISTRICT_HR` below is this row less the exceptions. */
const SYSTEM_ADMIN_CAPABILITIES: Record<Action, boolean> = {
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
};

export const CAPABILITY_MATRIX: Record<Role, Record<Action, boolean>> = {
  SYSTEM_ADMIN: SYSTEM_ADMIN_CAPABILITIES,
  /**
   * An administrator of one district: people, facilities, notices and complaints
   * inside it, and nothing that reaches past its boundary.
   *
   * Written as the administrator's row minus what must not carry over, because a
   * list of what this role *can* do goes stale the moment an action is added: the
   * new action would default to "no" silently. Here it defaults to the
   * administrator's answer, and every exception below has to be argued for.
   */
  DISTRICT_HR: {
    ...SYSTEM_ADMIN_CAPABILITIES,
    /* People: yes, with the role scope in `rolesAssignableBy` and the district
     * boundary checked in every action. Bulk import is regional — a sheet for the
     * whole region landing in one district would be a quiet catastrophe. */
    "user.bulk_import": false,
    "user.assign_role": true,
    /* The programme taxonomy is regional: it decides what trainings exist for
     * every district at once. */
    "taxonomy.manage": false,
    "area.update": false,
    "area.assign_facilitator": false,
    /* Geography and notices are theirs inside their district, but those screens
     * are still administrator-only: turning the capability on before the district
     * filter exists would hand out a route that edits every district. Flipped on
     * in the change that lands the filter, not before. */
    "geography.manage": false,
    "notification.broadcast": false,
    /* Training register: read-only here. Recording a training is a facilitator's
     * act, and a district HR holds no programme grant. */
    "training.manage": false,
    "material.create": false,
    "material.upload_version": false,
    "material.submit_review": false,
    "material.review": false,
    "material.publish": false,
    "material.archive": false,
    "material.read_draft": false,
    "comment.moderate": false,
    /* Platform-wide surfaces. */
    "maintenance_banner.manage": false,
    "audit_log.read": true,
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
 * Empty on purpose: nothing here is done without a session. The set stays
 * because `can(null, …)` and the matrix are written against it — anything added
 * here becomes anonymous-accessible by definition, so it should stay empty
 * unless there is a real reason.
 */
export const PUBLIC_ACTIONS: ReadonlySet<Action> = new Set<Action>([]);

/**
 * Self-service and messaging actions a facilitator may perform outside their
 * assigned Programme Area/Field scope. Every other facilitator action that takes
 * an areaId is checked against the database grants in src/lib/server/rbac.ts;
 * either a parent Programme Area grant or a child Programme Field grant applies.
 */
export const FACILITATOR_GLOBAL_ACTIONS: readonly Action[] = [
  "training.manage",
  "material.read_published",
  "material.download",
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
