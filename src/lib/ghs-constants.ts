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

/**
 * The pilot. The library is live in one region and the other fifteen are coming
 * soon, so this constant — not copy scattered across pages — decides what the
 * map highlights, which region the geography admin lets you edit, and what the
 * marketing pages promise.
 */
export const LIVE_REGION = {
  code: "UW",
  name: "Upper West",
  capital: "Wa",
  /** Regions that are live today. Add a code here when a region goes live. */
  codes: ["UW"],
} as const;

export function isLiveRegion(code: string | null | undefined, name?: string | null): boolean {
  if (code && (LIVE_REGION.codes as readonly string[]).includes(code)) return true;
  return name === LIVE_REGION.name;
}

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

/**
 * What a facilitator may upload.
 *
 * The list is the set of formats a health directorate actually hands out: the
 * slide deck, the protocol PDF, the attendance workbook, the recording of the
 * session, the photograph of a wall chart. Each one either opens in the library or
 * downloads from it — an accepted format that can only be downloaded would be a
 * promise the viewer cannot keep, which is why `.doc`, `.ppt` and `.xls` are not
 * here: the older binary formats cannot be read in the browser, and every
 * directorate that produces them can save as the modern equivalent.
 */
export const MIME_ALLOWLIST = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4",
  "video/webm",
  "video/x-matroska",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "text/markdown",
  "text/plain",
  "text/csv",
  "application/json",
] as const;

/** Kept in step with the allowlist above: every accepted type has a limit. */
export const MAX_UPLOAD_BYTES = {
  pdf: 25 * 1024 * 1024, // 25 MB
  office: 25 * 1024 * 1024, // 25 MB — docx, pptx, xlsx
  video: 250 * 1024 * 1024, // 250 MB
  audio: 60 * 1024 * 1024, // 60 MB
  image: 10 * 1024 * 1024, // 10 MB
  text: 2 * 1024 * 1024, // 2 MB — markdown, plain text, csv
  json: 1024 * 1024, // 1 MB
} as const;

/** How the library will show a file, once it is stored. */
export type PreviewKind = "pdf" | "image" | "video" | "audio" | "docx" | "pptx" | "xlsx" | "text" | "none";

const PREVIEW_BY_MIME: Record<string, PreviewKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "video/mp4": "video",
  "video/webm": "video",
  "video/x-matroska": "video",
  "video/quicktime": "video",
  "audio/mpeg": "audio",
  "audio/mp4": "audio",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "text/markdown": "text",
  "text/plain": "text",
  "text/csv": "text",
  "application/json": "text",
};

export function previewKindFor(mimeType: string | null | undefined): PreviewKind {
  if (!mimeType) return "none";
  const normalised = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  return PREVIEW_BY_MIME[normalised] ?? "none";
}

export const TIMEZONE = "Africa/Accra";
export const LOCALE = "en-GH";

export const STAFF_PIN_REGEX = /^GHS-\d{6}$/;

export function maskStaffPin(pin: string): string {
  return pin.replace(/^GHS-(\d{2})\d{4}$/, "GHS-$1****");
}

