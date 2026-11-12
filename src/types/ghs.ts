export type GhsUserRole = "LEARNER" | "FACILITATOR" | "SYSTEM_ADMIN";

export interface GhsUserProfile {
  staffId: string; // e.g., GHS-102938
  fullName: string;
  email: string;
  role: GhsUserRole;
  directorate?: string;
  region?: string;
  facility?: string;
  councilLicenseNo?: string; // e.g., NMC/RNR-2024-8849, MDC/PE-11029
  accumulatedCpdPoints: number;
  isActive: boolean;
  avatarUrl?: string;
}

export interface GhsCategory {
  id: string;
  code: string; // e.g., CAT-MNH-01
  name: string; // e.g., Maternal & Neonatal Health
  description?: string;
  isArchived: boolean;
  spaceCount: number;
}

export interface GhsSpace {
  id: string;
  slug: string;
  title: string;
  description?: string;
  cpdPointsValue: number;
  categoryId: string;
  createdById: string;
  materialCount: number;
  learnerCount: number;
}

export interface GhsMaterial {
  id: string;
  title: string;
  summary?: string;
  fileUrl?: string;
  mimeType?: string;
  formatType?: string; // PDF, VIDEO, TEXT_PROTOCOL, CASE_STUDY
  version: number;
  isPublished: boolean;
  spaceId: string;
  authorId: string;
  createdAt: Date;
}

export interface GhsComment {
  id: string;
  content: string;
  materialId: string;
  authorId: string;
  parentId?: string;
  createdAt: Date;
  authorName?: string;
  authorRole?: GhsUserRole;
  replies?: GhsComment[];
}

export interface GhsAuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  userName?: string;
}

export interface GhsBroadcast {
  id: string;
  title: string;
  body: string;
  severity: "CRITICAL_DIRECTIVE" | "PROTOCOL_UPDATE" | "MAINTENANCE";
  targetCadre: string;
  createdBy: string;
  createdAt: Date;
}

export interface GhsRegionalCompliance {
  region: string;
  compliantPercent: number;
  totalPersonnel: number;
}

export const GHS_REGIONS = [
  "Greater Accra",
  "Ashanti",
  "Western",
  "Northern",
  "Volta",
  "Central",
  "Eastern",
  "Upper East",
  "Upper West",
  "Bono",
  "Bono East",
  "Ahafo",
  "Oti",
  "Savannah",
  "North East",
  "Western North",
] as const;

export const GHS_FACILITIES = [
  "Korle Bu Teaching Hospital",
  "Komfo Anokye Teaching Hospital",
  "Greater Accra Regional Hospital (Ridge)",
  "Tamale Teaching Hospital",
  "Cape Coast Teaching Hospital",
  "Bolgatanga Regional Hospital",
] as const;
