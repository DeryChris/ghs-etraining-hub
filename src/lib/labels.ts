/**
 * Display vocabulary and closed sets shared by server and client code.
 * Pure module: no database or server-only imports.
 */
import type { Role, StaffRole } from "@/lib/rbac/capabilities";

export const MATERIAL_TYPES = ["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const FACILITY_TYPES = [
  "REGIONAL_HOSPITAL",
  "MUNICIPAL_HOSPITAL",
  "DISTRICT_HOSPITAL",
  "POLYCLINIC",
  "HEALTH_CENTRE",
  "CHPS_COMPOUND",
  "CLINIC",
  "DIRECTORATE",
  "SERVICE_UNIT",
  "OTHER",
] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  REGIONAL_HOSPITAL: "Regional hospital",
  MUNICIPAL_HOSPITAL: "Municipal hospital",
  DISTRICT_HOSPITAL: "District hospital",
  POLYCLINIC: "Polyclinic",
  HEALTH_CENTRE: "Health centre",
  CHPS_COMPOUND: "CHPS compound",
  CLINIC: "Clinic",
  DIRECTORATE: "Directorate",
  SERVICE_UNIT: "Regional service unit",
  OTHER: "Other",
};

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const PRIORITY_RANK: Record<PriorityLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: "System administrator",
  FACILITATOR: "Facilitator",
  LEARNER: "Learner",
};

/** Includes the unit head, which is chosen like a role but stored as a duty. */
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ...ROLE_LABELS,
  UNIT_HEAD: "Unit head",
};

/** One line under each choice in a role field, in the same order. */
export const STAFF_ROLE_HINTS: Record<StaffRole, string> = {
  LEARNER: "Reads and downloads the material written for their audience.",
  FACILITATOR: "Files material and trains, inside the programme areas they are given.",
  UNIT_HEAD: "A facilitator who also signs off the review queue for their fields.",
  SYSTEM_ADMIN: "Runs the directory, the taxonomy and every programme area.",
};

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  DOCUMENT: "Document",
  VIDEO: "Video",
  LAB: "Practical lab",
  ASSESSMENT_LINK: "Assessment",
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  TRAINING_PUBLISHED: "New training",
  TRAINING_RETURNED: "Training review",
  MATERIAL_PUBLISHED: "New material",
  DIRECT_MESSAGE: "Message",
  COMPLAINT_UPDATE: "Complaint update",
  ACCOUNT: "Account",
  SYSTEM_MAINTENANCE: "System maintenance",
  MATERIAL_UPDATE: "Protocol update",
  COMMENT_REPLY: "Discussion reply",
  ASSIGNMENT_DUE: "Assignment due",
  REVIEW_REQUEST: "Waiting for you",
};

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? "Notice";
}

export function isMaterialType(value: string | null | undefined): value is MaterialType {
  return (MATERIAL_TYPES as readonly string[]).includes(value ?? "");
}

/* ── Trainings and the reference geography ───────────────────────────────────
 * The Trainings tab and the two administration surfaces read these. Kept here
 * so a status or a district kind is spelled the same way in a list, a filter
 * and an export.
 */

export const TRAINING_STATUSES = ["PLANNED", "COMPLETED", "CANCELLED"] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  PLANNED: "Planned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function isTrainingStatus(value: string | null | undefined): value is TrainingStatus {
  return value === "PLANNED" || value === "COMPLETED" || value === "CANCELLED";
}

export const DISTRICT_KINDS = ["METROPOLITAN", "MUNICIPAL", "DISTRICT"] as const;
export type DistrictKind = (typeof DISTRICT_KINDS)[number];

export const DISTRICT_KIND_LABELS: Record<DistrictKind, string> = {
  METROPOLITAN: "Metropolitan",
  MUNICIPAL: "Municipal",
  DISTRICT: "District",
};

export function isDistrictKind(value: string | null | undefined): value is DistrictKind {
  return value === "METROPOLITAN" || value === "MUNICIPAL" || value === "DISTRICT";
}

export const FACILITY_OWNERSHIPS = ["GHS", "CHAG", "PRIVATE", "OTHER"] as const;
export type FacilityOwnership = (typeof FACILITY_OWNERSHIPS)[number];

export const FACILITY_OWNERSHIP_LABELS: Record<FacilityOwnership, string> = {
  GHS: "GHS",
  CHAG: "CHAG",
  PRIVATE: "Private",
  OTHER: "Other",
};

export function isFacilityOwnership(value: string | null | undefined): value is FacilityOwnership {
  return value === "GHS" || value === "CHAG" || value === "PRIVATE" || value === "OTHER";
}

/* ── Complaints ───────────────────────────────────────────────────────────────
 * The four things staff actually ask for, in their words rather than the
 * database's: "Changing of personal details", "Login access". The list is
 * closed so a complaint can be counted and routed, and every label can be read
 * aloud on the phone.
 */

export const COMPLAINT_ISSUES = ["PERSONAL_DETAILS", "COURSE_RELATED", "LOGIN_ACCESS", "OTHERS"] as const;
export type ComplaintIssue = (typeof COMPLAINT_ISSUES)[number];

export const COMPLAINT_ISSUE_LABELS: Record<ComplaintIssue, string> = {
  PERSONAL_DETAILS: "Changing of personal details",
  COURSE_RELATED: "Course related",
  LOGIN_ACCESS: "Login access",
  OTHERS: "Others",
};

export const COMPLAINT_ISSUE_HELP: Record<ComplaintIssue, string> = {
  PERSONAL_DETAILS: "A wrong name, staff ID, facility or posting.",
  COURSE_RELATED: "A material that will not open, or a training you were not credited for.",
  LOGIN_ACCESS: "Forgotten password, no account yet, or a locked account.",
  OTHERS: "Anything that does not fit the three above.",
};

export const COMPLAINT_STATUSES = ["SUBMITTED", "IN_PROGRESS", "RESOLVED"] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  IN_PROGRESS: "Being handled",
  RESOLVED: "Resolved",
};
