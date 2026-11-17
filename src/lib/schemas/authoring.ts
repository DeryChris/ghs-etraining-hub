import { z } from "zod";
import { MATERIAL_TYPES, PRIORITY_LEVELS } from "@/lib/labels";

/**
 * Input shapes for the authoring actions. Kept next to each other (and out of
 * the action module) so the rules can be unit-tested without a database.
 */

const uuid = z.string().uuid();

/** `materials/<materialId>/<uuid>.<ext>` — the only shape a signed upload may use. */
export const storageKeyPattern = /^materials\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/;

export const draftInput = z
  .object({
    spaceId: uuid,
    title: z.string().trim().min(3, "Give the material a title of at least 3 characters.").max(160),
    summary: z.string().trim().max(600).optional(),
    type: z.enum(MATERIAL_TYPES),
    priority: z.enum(PRIORITY_LEVELS).default("MEDIUM"),
  })
  .strict();

export const uploadRequestInput = z
  .object({
    materialId: uuid,
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(3).max(120),
    sizeBytes: z.number().int().positive().max(500 * 1024 * 1024),
  })
  .strict();

export const finaliseInput = z
  .object({
    materialId: uuid,
    versionId: uuid,
    storageKey: z.string().regex(storageKeyPattern, "That upload path is not valid."),
    checksumSha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "The file checksum could not be read. Upload the file again."),
    changeNote: z.string().trim().max(500).optional(),
  })
  .strict();

export const submitReviewInput = z
  .object({
    materialId: uuid,
    versionId: uuid,
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const reviewDecisionInput = z
  .object({
    materialId: uuid,
    versionId: uuid,
    decision: z.enum(["APPROVED", "REJECTED"]),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();

export const publishInput = z
  .object({
    materialId: uuid,
    versionId: uuid,
    overrideReason: z.string().trim().max(500).optional(),
  })
  .strict();

export const archiveInput = z
  .object({
    materialId: uuid,
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

export function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}
