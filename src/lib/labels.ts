/**
 * Display vocabulary and closed sets shared by server and client code.
 * Pure module: no database or server-only imports.
 */
import type { Role } from "@/lib/rbac/capabilities";

export const MATERIAL_TYPES = ["DOCUMENT", "VIDEO", "LAB", "ASSESSMENT_LINK"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const FACILITY_TYPES = [
  "REGIONAL_HOSPITAL",
  "MUNICIPAL_HOSPITAL",
  "DISTRICT_HOSPITAL",
  "POLYCLINIC",
  "HEALTH_CENTRE",
  "CLINIC",
  "DIRECTORATE",
  "OTHER",
] as const;
export type FacilityType = (typeof FACILITY_TYPES)[number];

export const FACILITY_TYPE_LABELS: Record<FacilityType, string> = {
  REGIONAL_HOSPITAL: "Regional hospital",
  MUNICIPAL_HOSPITAL: "Municipal hospital",
  DISTRICT_HOSPITAL: "District hospital",
  POLYCLINIC: "Polyclinic",
  HEALTH_CENTRE: "Health centre",
  CLINIC: "Clinic",
  DIRECTORATE: "Directorate",
  OTHER: "Other",
};

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const PRIORITY_RANK: Record<PriorityLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

export type ProgressStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: "System administrator",
  FACILITATOR: "Facilitator",
  LEARNER: "Learner",
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

export const PROGRESS_LABELS: Record<ProgressStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  SYSTEM_MAINTENANCE: "System maintenance",
  MATERIAL_UPDATE: "Protocol update",
  SPACE_ANNOUNCEMENT: "Announcement",
  COMMENT_REPLY: "Discussion reply",
  DIRECT_MESSAGE: "Message",
  ASSIGNMENT_DUE: "Assignment due",
  CERTIFICATE_ISSUED: "Certificate issued",
  RECERTIFICATION_DUE: "Recertification due",
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
