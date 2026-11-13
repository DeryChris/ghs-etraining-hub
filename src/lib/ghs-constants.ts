export const GHS_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
] as const;

export type GhsRegion = (typeof GHS_REGIONS)[number];

export const GHS_DIRECTORATES = [
  "Public Health Directorate",
  "Institutional Care Division",
  "Family Health Division",
  "Disease Control Department",
  "Health Promotion Division",
  "Pharmacy Council of Ghana",
  "Nursing and Midwifery Council of Ghana",
  "Medical and Dental Council of Ghana",
  "Ghana Health Service Headquarters",
] as const;

export const GHS_CADRES = [
  "nurse",
  "midwife",
  "medical officer",
  "pharmacy",
  "laboratory",
  "records",
  "administration",
] as const;

export const PRIORITY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const MIME_ALLOWLIST = [
  "application/pdf",
  "video/mp4",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/markdown",
  "application/json",
] as const;

export const MAX_UPLOAD_BYTES = {
  pdf: 15 * 1024 * 1024, // 15 MB
  video: 250 * 1024 * 1024, // 250 MB
  image: 5 * 1024 * 1024, // 5 MB
  markdown: 1024 * 1024, // 1 MB
  json: 1024 * 1024, // 1 MB
} as const;

export const CPD_CREDIT_TABLE: Record<string, number> = {
  "IPC Protocol": 5,
  "Cold Chain Management": 3,
  "Malaria Case Management": 4,
  "IDSR": 6,
  "Maternal & Newborn Care": 5,
  "AMR Stewardship": 4,
  "Mental Health": 3,
  "Health Records & DHIMS": 4,
  "Emergency Triage": 5,
  "HIV/STI": 4,
  "NTDs": 3,
  "Quality of Care": 4,
} as const;

export const TIMEZONE = "Africa/Accra";
export const LOCALE = "en-GH";

export const STAFF_PIN_REGEX = /^GHS-\d{6}$/;

export function maskStaffPin(pin: string): string {
  return pin.replace(/^GHS-(\d{2})\d{4}$/, "GHS-$1****");
}

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
