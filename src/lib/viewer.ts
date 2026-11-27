import type { Role } from "@/lib/rbac/capabilities";

/**
 * The part of the signed-in identity that content visibility depends on.
 *
 * Kept separate from Session so queries can be exercised with a plain object
 * (tests, scripts) and so a public/anonymous visitor can be expressed as the
 * same shape with no cohort attributes: it then matches only untargeted content.
 */
export interface Viewer {
  id: string;
  role: Role;
  region: string | null;
  directorate: string | null;
  grade: string | null;
  /** Facilitators who also decide the review queue for their programme fields. */
  unitHead?: boolean;
}

/**
 * Administrators and facilitators see everything published — including
 * restricted directorates and content targeted at other cohorts — because they
 * author, review and support it. Learners see their own cohort only.
 */
export function isStaffRole(role: Role): boolean {
  return role !== "LEARNER";
}
