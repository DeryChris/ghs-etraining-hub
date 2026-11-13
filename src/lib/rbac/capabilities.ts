export type Role = "SYSTEM_ADMIN" | "FACILITATOR" | "LEARNER";

export type Action =
  | "user.create"
  | "user.bulk_import"
  | "user.deactivate"
  | "user.reactivate"
  | "user.assign_role"
  | "user.reset_password"
  | "user.read_pii"
  | "category.create"
  | "category.update"
  | "category.archive"
  | "category.assign_facilitator"
  | "space.create"
  | "space.update"
  | "material.create"
  | "material.upload_version"
  | "material.submit_review"
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
  | "message.read_thread"
  | "notification.broadcast"
  | "notification.view"
  | "analytics.view_personal"
  | "analytics.view_cohort"
  | "analytics.export"
  | "audit_log.read"
  | "maintenance_banner.manage"
  | "certificate.verify"
  | "certificate.revoke";

export type Scope = {
  categoryId?: string;
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
    "category.create": true,
    "category.update": true,
    "category.archive": true,
    "category.assign_facilitator": true,
    "space.create": true,
    "space.update": true,
    "material.create": true,
    "material.upload_version": true,
    "material.submit_review": true,
    "material.publish": true,
    "material.archive": true,
    "material.read_draft": true,
    "material.read_published": true,
    "material.download": true,
    "assessment.configure": true,
    "assessment.take": true,
    "assessment.override_score": true,
    "enrollment.self": true,
    "enrollment.assign": true,
    "comment.create": true,
    "comment.edit_own": true,
    "comment.moderate": true,
    "message.send": true,
    "message.read_thread": true,
    "notification.broadcast": true,
    "notification.view": true,
    "analytics.view_personal": true,
    "analytics.view_cohort": true,
    "analytics.export": true,
    "audit_log.read": true,
    "maintenance_banner.manage": true,
    "certificate.verify": true,
    "certificate.revoke": true,
  },
  FACILITATOR: {
    "user.create": false,
    "user.bulk_import": false,
    "user.deactivate": false,
    "user.reactivate": false,
    "user.assign_role": false,
    "user.reset_password": false,
    "user.read_pii": false,
    "category.create": false,
    "category.update": false,
    "category.archive": false,
    "category.assign_facilitator": false,
    "space.create": true,
    "space.update": true,
    "material.create": true,
    "material.upload_version": true,
    "material.submit_review": true,
    "material.publish": true,
    "material.archive": true,
    "material.read_draft": true,
    "material.read_published": true,
    "material.download": true,
    "assessment.configure": true,
    "assessment.take": true,
    "assessment.override_score": false,
    "enrollment.self": true,
    "enrollment.assign": true,
    "comment.create": true,
    "comment.edit_own": true,
    "comment.moderate": true,
    "message.send": true,
    "message.read_thread": false,
    "notification.broadcast": true,
    "notification.view": true,
    "analytics.view_personal": true,
    "analytics.view_cohort": true,
    "analytics.export": true,
    "audit_log.read": false,
    "maintenance_banner.manage": false,
    "certificate.verify": true,
    "certificate.revoke": false,
  },
  LEARNER: {
    "user.create": false,
    "user.bulk_import": false,
    "user.deactivate": false,
    "user.reactivate": false,
    "user.assign_role": false,
    "user.reset_password": false,
    "user.read_pii": false,
    "category.create": false,
    "category.update": false,
    "category.archive": false,
    "category.assign_facilitator": false,
    "space.create": false,
    "space.update": false,
    "material.create": false,
    "material.upload_version": false,
    "material.submit_review": false,
    "material.publish": false,
    "material.archive": false,
    "material.read_draft": false,
    "material.read_published": true,
    "material.download": true,
    "assessment.configure": false,
    "assessment.take": true,
    "assessment.override_score": false,
    "enrollment.self": true,
    "enrollment.assign": false,
    "comment.create": true,
    "comment.edit_own": true,
    "comment.moderate": false,
    "message.send": true,
    "message.read_thread": false,
    "notification.broadcast": false,
    "notification.view": true,
    "analytics.view_personal": true,
    "analytics.view_cohort": false,
    "analytics.export": false,
    "audit_log.read": false,
    "maintenance_banner.manage": false,
    "certificate.verify": true,
    "certificate.revoke": false,
  },
};

export function can(role: Role | null | undefined, action: Action): boolean {
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
    if (action === "material.read_published" && scope.audienceMatch === false) return false;
    if (action === "assessment.take" && (scope.enrolled === false || scope.attemptsLeft === false)) return false;
    return true;
  }

  if (role === "FACILITATOR") {
    if (action === "material.publish" && scope.reviewerIsAuthor === true) return false;
    if (!scope.categoryId) return false;
    return true;
  }

  return true;
}
