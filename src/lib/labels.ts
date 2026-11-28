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
  /* An administrator whose authority stops at one district. */
  DISTRICT_HR: "District HR",
  FACILITATOR: "Facilitator",
  /*
   * The role key is still LEARNER in the database — renaming an enum value would
   * rewrite every grant, every audit row and every RLS rule for a word on a
   * screen. What people read is Staff, which is what they are.
   */
  LEARNER: "Staff",
};

/** Includes the unit head, which is chosen like a role but stored as a duty. */
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ...ROLE_LABELS,
  UNIT_HEAD: "Unit head",
};

/** One line under each choice in a role field, in the same order. */
export const STAFF_ROLE_HINTS: Record<StaffRole, string> = {
  LEARNER: "Reads published trainings and the files attached to them. No editing.",
  FACILITATOR: "Records trainings, attaches their files and comments, within the Programme Fields and Programme Areas assigned to them.",
  UNIT_HEAD: "A facilitator who also reviews Training Session records within their review scope.",
  DISTRICT_HR:
    "Administers one district: accounts, passwords, facilities, notices and complaints. Cannot change roles above facilitator, or touch another district.",
  SYSTEM_ADMIN: "Manages staff access and reference data, including Programme Areas, Programme Fields and geography.",
};

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  DOCUMENT: "Document",
  VIDEO: "Video",
  LAB: "Practical lab",
  ASSESSMENT_LINK: "Assessment link",
};

/** Stable resource-type colours, shared by the dashboard and Insights charts. */
export const MATERIAL_TYPE_COLORS: Record<MaterialType, string> = {
  DOCUMENT: "var(--chart-1)",
  VIDEO: "var(--chart-2)",
  LAB: "var(--chart-3)",
  ASSESSMENT_LINK: "var(--chart-6)",
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  TRAINING_PUBLISHED: "New Training Session record",
  TRAINING_RETURNED: "Training Session record review",
  MATERIAL_PUBLISHED: "New Training Material",
  DIRECT_MESSAGE: "Message",
  COMPLAINT_UPDATE: "Complaint update",
  ACCOUNT: "Account",
  SYSTEM_MAINTENANCE: "System maintenance",
  MATERIAL_UPDATE: "Material update",
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
  COMPLETED: "Held",
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

export const COMPLAINT_ISSUES = [
  "LOGIN_ACCESS",
  "WRONG_DOCUMENT",
  "DOC_INACCESSIBLE",
  "COURSE_RELATED",
  "PERSONAL_DETAILS",
  "OTHERS",
] as const;
export type ComplaintIssue = (typeof COMPLAINT_ISSUES)[number];

export const COMPLAINT_ISSUE_LABELS: Record<ComplaintIssue, string> = {
  PERSONAL_DETAILS: "Changing of personal details",
  COURSE_RELATED: "Course related",
  LOGIN_ACCESS: "Login access",
  WRONG_DOCUMENT: "Wrong document uploaded",
  DOC_INACCESSIBLE: "Document cannot be opened",
  OTHERS: "Something else",
};

export const COMPLAINT_ISSUE_HELP: Record<ComplaintIssue, string> = {
  PERSONAL_DETAILS: "A wrong name, staff ID, facility or posting.",
  COURSE_RELATED: "A Training Session record or event detail that needs checking.",
  LOGIN_ACCESS: "Forgotten password, no account yet, or a locked account.",
  WRONG_DOCUMENT: "The file attached to a training is not the one it should be — the wrong deck, an old version, somebody else's sheet.",
  DOC_INACCESSIBLE: "The file is there but will not open, will not download, or opens to an error.",
  OTHERS: "Anything that does not fit the list above.",
};

/**
 * The issues that are about a particular file. They ask which training, because
 * "the document will not open" is unanswerable without it, and asking later costs
 * a round trip through email.
 */
export const COMPLAINT_ISSUES_ABOUT_A_FILE: readonly ComplaintIssue[] = ["WRONG_DOCUMENT", "DOC_INACCESSIBLE"];

export function complaintIsAboutAFile(issue: string | null | undefined): boolean {
  return issue === "WRONG_DOCUMENT" || issue === "DOC_INACCESSIBLE";
}

export const COMPLAINT_STATUSES = ["SUBMITTED", "IN_PROGRESS", "RESOLVED"] as const;
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: "Submitted",
  IN_PROGRESS: "Being handled",
  RESOLVED: "Resolved",
};
