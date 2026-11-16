/**
 * The clinical publishing rules, as pure data and pure functions.
 *
 * This module is isomorphic (no database, no server-only imports) so the exact
 * rules that guard a publish — two-person review, no self-publishing, required
 * reviewer approval — are unit-tested rather than trusted to UI wiring.
 *
 * docs/qa.md §6 walks the same lifecycle by hand.
 */
import { formatBytes } from "@/lib/format";
import { MAX_UPLOAD_BYTES, MIME_ALLOWLIST } from "@/lib/ghs-constants";
import { extensionForMime } from "@/lib/file-name";
import type { Role } from "@/lib/rbac/capabilities";

export const MATERIAL_STATES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "SUPERSEDED", "ARCHIVED"] as const;
export type MaterialState = (typeof MATERIAL_STATES)[number];

export const MATERIAL_STATE_LABELS: Record<MaterialState, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  PUBLISHED: "Published",
  SUPERSEDED: "Superseded",
  ARCHIVED: "Archived",
};

/** Every legal move. Anything not listed here is refused by the actions. */
const TRANSITIONS: Record<MaterialState, readonly MaterialState[]> = {
  DRAFT: ["IN_REVIEW", "ARCHIVED"],
  IN_REVIEW: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["SUPERSEDED", "ARCHIVED"],
  SUPERSEDED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: MaterialState, to: MaterialState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextVersionNumber(existingVersions: readonly number[]): number {
  return existingVersions.reduce((highest, value) => (value > highest ? value : highest), 0) + 1;
}

/**
 * Storage keys are immutable and opaque: the material id plus a random uuid.
 * The version number lives in the database, so two people uploading at once can
 * never collide on a key.
 */
export function materialStorageKey(materialId: string, extension: string, uuid: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(materialId)) {
    throw new Error("materialStorageKey requires a material uuid");
  }
  if (!/^[a-z0-9]{1,8}$/.test(extension)) throw new Error("materialStorageKey requires a safe extension");
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) throw new Error("materialStorageKey requires a uuid");
  return `materials/${materialId}/${uuid}.${extension}`;
}

function uploadLimit(mimeType: string): number {
  if (mimeType === "application/pdf") return MAX_UPLOAD_BYTES.pdf;
  if (mimeType.startsWith("video/")) return MAX_UPLOAD_BYTES.video;
  if (mimeType.startsWith("image/")) return MAX_UPLOAD_BYTES.image;
  if (mimeType === "text/markdown") return MAX_UPLOAD_BYTES.markdown;
  return MAX_UPLOAD_BYTES.json;
}

export type UploadCheck = { ok: true; extension: string } | { ok: false; message: string };

/** Validated in the browser for a fast answer and again on the server for truth. */
export function checkUpload(mimeType: string, sizeBytes: number): UploadCheck {
  const normalised = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!(MIME_ALLOWLIST as readonly string[]).includes(normalised)) {
    return { ok: false, message: "That file type is not accepted. Upload a PDF, video, image, Markdown or JSON file." };
  }
  const extension = extensionForMime(normalised);
  if (!extension) {
    return { ok: false, message: "That file type is not accepted. Upload a PDF, video, image, Markdown or JSON file." };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, message: "That file appears to be empty." };
  }
  const limit = uploadLimit(normalised);
  if (sizeBytes > limit) {
    return { ok: false, message: `That file is ${formatBytes(sizeBytes)}. The limit for this type is ${formatBytes(limit)}.` };
  }
  return { ok: true, extension };
}

export type ReviewDecision = "APPROVED" | "REJECTED";
export interface Approval {
  reviewerId: string;
  decision: ReviewDecision;
}

export interface PublishContext {
  versionState: MaterialState;
  uploadedById: string;
  publisherId: string;
  publisherRole: Role;
  approvals: readonly Approval[];
  /** Present only when a SYSTEM_ADMIN is deliberately overriding the two-person rule. */
  overrideReason?: string | null;
}

export const OVERRIDE_REASON_MIN_LENGTH = 10;

function hasValidOverride(context: PublishContext): boolean {
  return (
    context.publisherRole === "SYSTEM_ADMIN" &&
    typeof context.overrideReason === "string" &&
    context.overrideReason.trim().length >= OVERRIDE_REASON_MIN_LENGTH
  );
}

/**
 * Empty array = publishable. Each message is written for the person reading it,
 * and names the person whose action is outstanding.
 */
export function publishBlockers(context: PublishContext): string[] {
  const blockers: string[] = [];
  const overriding = hasValidOverride(context);

  if (!canTransition(context.versionState, "PUBLISHED")) {
    blockers.push("Only a version that is in review can be published.");
  }
  if (context.publisherId === context.uploadedById && !overriding) {
    blockers.push("You uploaded this version. A colleague must publish it — the two-person rule protects clinical content.");
  }

  const approvals = context.approvals.filter(
    (approval) => approval.decision === "APPROVED" && approval.reviewerId !== context.uploadedById,
  );
  if (approvals.length === 0 && !overriding) {
    blockers.push("A colleague who did not upload this version must review and approve it first.");
  }

  return blockers;
}

export function canPublish(context: PublishContext): boolean {
  return publishBlockers(context).length === 0;
}
