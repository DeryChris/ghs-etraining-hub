"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { materialVersions, materials, reviewAssignments, programmeAreas } from "@/db/schema";
import { checkUpload, canTransition, materialStorageKey, nextVersionNumber, publishBlockers } from "@/lib/material-workflow";
import type { MaterialState, ReviewDecision } from "@/lib/material-workflow";
import type { Action, Role, Scope } from "@/lib/rbac/capabilities";
import { areaIdForMaterial } from "@/lib/server/authoring-queries";
import { compactAudience } from "@/lib/notification-audience";
import { logAudit } from "@/lib/server/audit";
import { notifyMaterialPublished } from "@/lib/server/notify";
import {
  createMaterialUploadTarget,
  inspectMaterialObject,
  removeMaterialObject,
  storageCeiling,
} from "@/lib/server/file-storage";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";
import { getSession } from "@/lib/server/session";
import {
  archiveInput,
  draftInput,
  field,
  finaliseInput,
  publishInput,
  reviewDecisionInput,
  submitReviewInput,
  uploadRequestInput,
} from "@/lib/schemas/authoring";

/**
 * The authoring pipeline: draft → upload → review → publish → supersede → archive.
 * Every rule that can be decided without a database lives in
 * src/lib/material-workflow.ts (and is unit-tested); this module only adds the
 * session, the category scope, the audit chain and the transaction.
 */

/**
 * Storage that was never configured is a deployment problem, and the person
 * uploading cannot fix it. Say who can, instead of "try again" — the retry will
 * fail identically until the S3 variables exist.
 */
/**
 * Uploads no longer fail for want of a bucket: with no S3 settings the file is
 * stored in the database instead (`file-storage.ts`). What can still fail is the
 * platform's request body limit, and the message has to say which limit it is.
 */
function storageMessage(reason: string | undefined, fallback: string): string {
  if (reason && /SESSION_SECRET/i.test(reason)) {
    return "Uploads are disabled until the server secret is set. The ICT administrator needs to check SESSION_SECRET.";
  }
  return fallback;
}

export interface AuthoringActionState {
  ok: boolean;
  message: string | null;
  /** Set by createDraftAction so the form can navigate to the new material. */
  materialId?: string | null;
}

const GENERIC_FAILURE = "We could not save that. Refresh the page and try again.";

function revalidateAuthoring(materialId?: string): void {
  revalidatePath("/library");
  revalidatePath("/review");
  if (materialId) revalidatePath(`/authoring/${materialId}`);
}

type Guarded =
  | { ok: false; message: string }
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getSession>>> };

/** Session + area scope for a material, before the material row is trusted. */
async function guardForMaterial(action: Action, materialId: string): Promise<Guarded> {
  const areaId = await areaIdForMaterial(materialId);
  if (!areaId) return { ok: false, message: "That material no longer exists." };
  const scope: Scope = { areaId };
  return checkCapability(action, scope);
}

type LoadedVersion =
  | { ok: false; message: string }
  | {
      ok: true;
      material: typeof materials.$inferSelect;
      version: typeof materialVersions.$inferSelect;
      areaCode: string;
      areaName: string;
      areaRegion: string | null;
      areaDirectorate: string | null;
      areaCadre: string | null;
    };

async function loadVersion(materialId: string, versionId: string): Promise<LoadedVersion> {
  const [row] = await db
    .select({
      material: materials,
      version: materialVersions,
      areaCode: programmeAreas.code,
      areaName: programmeAreas.name,
      areaRegion: programmeAreas.audienceRegion,
      areaDirectorate: programmeAreas.audienceDirectorate,
      areaCadre: programmeAreas.audienceCadre,
    })
    .from(materialVersions)
    .innerJoin(materials, eq(materials.id, materialVersions.materialId))
    .innerJoin(programmeAreas, eq(programmeAreas.id, materials.programmeAreaId))
    .where(and(eq(materialVersions.id, versionId), eq(materialVersions.materialId, materialId)))
    .limit(1);
  if (!row) return { ok: false, message: "That version no longer exists." };
  return { ok: true, ...row };
}

/* -------------------------------------------------------------------------- */
/* 1. Draft                                                                    */
/* -------------------------------------------------------------------------- */

export async function createDraftAction(
  _previous: AuthoringActionState,
  formData: FormData,
): Promise<AuthoringActionState> {
  const parsed = draftInput.safeParse({
    programmeAreaId: field(formData, "programmeAreaId"),
    title: field(formData, "title"),
    summary: field(formData, "summary"),
    type: field(formData, "type"),
    priority: field(formData, "priority") ?? "MEDIUM",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? GENERIC_FAILURE };
  }

  const guard = await checkCapability("material.create", { areaId: parsed.data.programmeAreaId });
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  try {
    const materialId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(materials)
        .values({
          programmeAreaId: parsed.data.programmeAreaId,
          title: parsed.data.title,
          summary: parsed.data.summary ?? null,
          type: parsed.data.type,
          priority: parsed.data.priority,
          state: "DRAFT",
          isPublished: false,
          authorId: session.sub,
        })
        .returning({ id: materials.id });

      await logAudit(
        {
          actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
          action: "MATERIAL_DRAFT_CREATED",
          entity: "material",
          entityId: row.id,
          metadata: { title: parsed.data.title, programmeAreaId: parsed.data.programmeAreaId },
        },
        tx,
      );
      return row.id;
    });

    revalidateAuthoring(materialId);
    return { ok: true, message: "Draft created. Upload the file on the material page.", materialId };
  } catch (error) {
    const duplicate = error instanceof Error && /materials_space_title_key/.test(error.message);
    log.error({ event: "material.draft_create_failed", err: String(error) });
    return {
      ok: false,
      message: duplicate ? "A material with that title already exists in this space." : GENERIC_FAILURE,
    };
  }
}

/* -------------------------------------------------------------------------- */
/* 2. Upload (signed slot, then finalise)                                      */
/* -------------------------------------------------------------------------- */

export type UploadTargetResult =
  | { ok: true; uploadUrl: string; path: string; storageKey: string; versionId: string }
  | { ok: false; message: string };

/**
 * Returns a short-lived signed upload slot. The file never passes through the
 * Next.js server: clinical PDFs are 15 MB and videos 250 MB, far above the
 * serverless body limit (ADR-0008).
 */
export async function requestUploadAction(input: {
  materialId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<UploadTargetResult> {
  const parsed = uploadRequestInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: GENERIC_FAILURE };

  const guard = await guardForMaterial("material.upload_version", parsed.data.materialId);
  if (!guard.ok) return { ok: false, message: guard.message };

  const check = checkUpload(parsed.data.mimeType, parsed.data.sizeBytes);
  if (!check.ok) return { ok: false, message: check.message };

  const ceiling = storageCeiling();
  if (parsed.data.sizeBytes > ceiling.bytes) return { ok: false, message: ceiling.detail };

  const versionId = randomUUID();
  const storageKey = materialStorageKey(parsed.data.materialId, check.extension, versionId);

  const target = await createMaterialUploadTarget(storageKey);
  if (!target.ok) {
    log.error({ event: "material.upload_target_failed", storageKey, reason: target.reason });
    return { ok: false, message: storageMessage(target.reason, "Storage is not available right now. Try again in a moment.") };
  }

  return { ok: true, uploadUrl: target.target.signedUrl, path: target.target.path, storageKey, versionId };
}

export async function finaliseUploadAction(
  _previous: AuthoringActionState,
  formData: FormData,
): Promise<AuthoringActionState> {
  const parsed = finaliseInput.safeParse({
    materialId: field(formData, "materialId"),
    versionId: field(formData, "versionId"),
    storageKey: field(formData, "storageKey"),
    checksumSha256: field(formData, "checksumSha256"),
    changeNote: field(formData, "changeNote"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? GENERIC_FAILURE };
  const { materialId, versionId, storageKey, checksumSha256, changeNote } = parsed.data;

  const guard = await guardForMaterial("material.upload_version", materialId);
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  // The client hands back the key it was given; it must be this material's, and
  // it must carry the version id we issued, so one upload cannot be recorded twice.
  if (!storageKey.includes(`/${versionId}.`)) {
    return { ok: false, message: GENERIC_FAILURE };
  }

  const inspected = await inspectMaterialObject(storageKey);
  if (!inspected.ok || inspected.object.sizeBytes === null) {
    log.warn({ event: "material.upload_missing", materialId, storageKey, reason: inspected.ok ? "size unknown" : inspected.reason });
    return { ok: false, message: "The upload did not arrive. Try again — nothing has been saved yet." };
  }
  const object = { contentType: inspected.object.contentType, sizeBytes: inspected.object.sizeBytes };

  const check = checkUpload(object.contentType ?? "", object.sizeBytes);
  if (!check.ok) {
    // Rejected after the bytes landed in the bucket: remove the orphan.
    await removeMaterialObject(storageKey);
    return { ok: false, message: check.message };
  }

  const [existing] = await db
    .select({ id: materialVersions.id })
    .from(materialVersions)
    .where(eq(materialVersions.id, versionId))
    .limit(1);
  if (existing) return { ok: false, message: "That upload has already been saved." };

  try {
    await db.transaction(async (tx) => {
      const versionRows = await tx
        .select({ version: materialVersions.version })
        .from(materialVersions)
        .where(eq(materialVersions.materialId, materialId));
      const version = nextVersionNumber(versionRows.map((row) => row.version));

      await tx.insert(materialVersions).values({
        id: versionId,
        materialId,
        version,
        storageKey,
        mimeType: check.extension === "pdf" ? "application/pdf" : (object.contentType ?? "application/octet-stream"),
        sizeBytes: object.sizeBytes,
        checksumSha256,
        scanStatus: "PENDING",
        state: "DRAFT",
        changeNote: changeNote ?? null,
        uploadedById: session.sub,
      });

      await tx.update(materials).set({ updatedAt: new Date() }).where(eq(materials.id, materialId));

      await logAudit(
        {
          actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
          action: "MATERIAL_VERSION_UPLOADED",
          entity: "material_version",
          entityId: versionId,
          metadata: { materialId, version, storageKey, sizeBytes: object.sizeBytes },
        },
        tx,
      );
    });
  } catch (error) {
    const duplicate = error instanceof Error && /material_versions_material_version_key/.test(error.message);
    log.error({ event: "material.version_insert_failed", materialId, err: String(error) });
    return {
      ok: false,
      message: duplicate ? "Someone else uploaded a version at the same time. Reload and try again." : GENERIC_FAILURE,
    };
  }

  revalidateAuthoring(materialId);
  return { ok: true, message: "Version saved. It is a draft until a colleague reviews it." };
}

/* -------------------------------------------------------------------------- */
/* 3. Review                                                                   */
/* -------------------------------------------------------------------------- */

export async function submitForReviewAction(
  _previous: AuthoringActionState,
  formData: FormData,
): Promise<AuthoringActionState> {
  const parsed = submitReviewInput.safeParse({
    materialId: field(formData, "materialId"),
    versionId: field(formData, "versionId"),
    note: field(formData, "note"),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_FAILURE };

  const guard = await guardForMaterial("material.submit_review", parsed.data.materialId);
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const loaded = await loadVersion(parsed.data.materialId, parsed.data.versionId);
  if (!loaded.ok) return { ok: false, message: loaded.message };
  if (!canTransition(loaded.version.state, "IN_REVIEW")) {
    return { ok: false, message: "This version is already in review or has been published." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(materialVersions)
      .set({ state: "IN_REVIEW" })
      .where(and(eq(materialVersions.id, parsed.data.versionId), eq(materialVersions.state, loaded.version.state)));
    await tx.update(materials).set({ state: "IN_REVIEW", updatedAt: new Date() }).where(eq(materials.id, parsed.data.materialId));
    await logAudit(
      {
        actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
        action: "MATERIAL_SUBMITTED_FOR_REVIEW",
        entity: "material_version",
        entityId: parsed.data.versionId,
        metadata: { materialId: parsed.data.materialId, note: parsed.data.note ?? null },
      },
      tx,
    );
  });

  revalidateAuthoring(parsed.data.materialId);
  return { ok: true, message: "Sent for review. A colleague who did not upload it must approve it." };
}

export async function recordReviewDecisionAction(
  _previous: AuthoringActionState,
  formData: FormData,
): Promise<AuthoringActionState> {
  const parsed = reviewDecisionInput.safeParse({
    materialId: field(formData, "materialId"),
    versionId: field(formData, "versionId"),
    decision: field(formData, "decision"),
    comment: field(formData, "comment"),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_FAILURE };

  const guard = await guardForMaterial("material.review", parsed.data.materialId);
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const loaded = await loadVersion(parsed.data.materialId, parsed.data.versionId);
  if (!loaded.ok) return { ok: false, message: loaded.message };
  if (loaded.version.state !== "IN_REVIEW") {
    return { ok: false, message: "Only a version that is in review can be decided." };
  }
  if (loaded.version.uploadedById === session.sub) {
    return { ok: false, message: "You uploaded this version. A different reviewer must decide on it." };
  }
  if (parsed.data.decision === "REJECTED" && !parsed.data.comment) {
    return { ok: false, message: "Tell the author what needs to change before you reject it." };
  }

  const decision: ReviewDecision = parsed.data.decision;

  await db.transaction(async (tx) => {
    const [assigned] = await tx
      .select({ id: reviewAssignments.id })
      .from(reviewAssignments)
      .where(
        and(
          eq(reviewAssignments.materialVersionId, parsed.data.versionId),
          eq(reviewAssignments.reviewerId, session.sub),
        ),
      )
      .limit(1);

    if (assigned) {
      await tx
        .update(reviewAssignments)
        .set({ decision, comment: parsed.data.comment ?? null })
        .where(eq(reviewAssignments.id, assigned.id));
    } else {
      await tx.insert(reviewAssignments).values({
        materialVersionId: parsed.data.versionId,
        reviewerId: session.sub,
        decision,
        comment: parsed.data.comment ?? null,
      });
    }

    if (decision === "REJECTED") {
      await tx.update(materialVersions).set({ state: "DRAFT" }).where(eq(materialVersions.id, parsed.data.versionId));
      await tx.update(materials).set({ state: "DRAFT", updatedAt: new Date() }).where(eq(materials.id, parsed.data.materialId));
    } else {
      await tx.update(materialVersions).set({ reviewedById: session.sub }).where(eq(materialVersions.id, parsed.data.versionId));
    }

    await logAudit(
      {
        actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
        action: decision === "APPROVED" ? "MATERIAL_REVIEW_APPROVED" : "MATERIAL_REVIEW_REJECTED",
        entity: "material_version",
        entityId: parsed.data.versionId,
        metadata: { materialId: parsed.data.materialId, comment: parsed.data.comment ?? null },
      },
      tx,
    );
  });

  revalidateAuthoring(parsed.data.materialId);
  return {
    ok: true,
    message:
      decision === "APPROVED"
        ? "Approved. The author or another colleague can publish it now."
        : "Returned to the author with your comment.",
  };
}

/* -------------------------------------------------------------------------- */
/* 4. Publish / archive                                                        */
/* -------------------------------------------------------------------------- */

export async function publishVersionAction(
  _previous: AuthoringActionState,
  formData: FormData,
): Promise<AuthoringActionState> {
  const parsed = publishInput.safeParse({
    materialId: field(formData, "materialId"),
    versionId: field(formData, "versionId"),
    overrideReason: field(formData, "overrideReason"),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_FAILURE };

  const guard = await guardForMaterial("material.publish", parsed.data.materialId);
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const loaded = await loadVersion(parsed.data.materialId, parsed.data.versionId);
  if (!loaded.ok) return { ok: false, message: loaded.message };

  const approvals = await db
    .select({ reviewerId: reviewAssignments.reviewerId, decision: reviewAssignments.decision })
    .from(reviewAssignments)
    .where(eq(reviewAssignments.materialVersionId, parsed.data.versionId));

  const blockers = publishBlockers({
    versionState: loaded.version.state,
    uploadedById: loaded.version.uploadedById,
    publisherId: session.sub,
    publisherRole: session.role as Role,
    approvals: approvals
      .filter((row): row is { reviewerId: string; decision: ReviewDecision } => row.decision === "APPROVED" || row.decision === "REJECTED")
      .map((row) => ({ reviewerId: row.reviewerId, decision: row.decision })),
    overrideReason: parsed.data.overrideReason ?? null,
  });
  if (blockers.length) return { ok: false, message: blockers.join(" ") };

  await db.transaction(async (tx) => {
    const at = new Date();

    // Any older published version of this material is superseded by this one.
    const previousPublished = await tx
      .select({ id: materialVersions.id })
      .from(materialVersions)
      .where(and(eq(materialVersions.materialId, parsed.data.materialId), eq(materialVersions.state, "PUBLISHED")));

    for (const previous of previousPublished) {
      if (previous.id === parsed.data.versionId) continue;
      await tx
        .update(materialVersions)
        .set({ state: "SUPERSEDED", supersededByVersionId: parsed.data.versionId })
        .where(eq(materialVersions.id, previous.id));
    }

    await tx
      .update(materialVersions)
      .set({ state: "PUBLISHED", publishedAt: at })
      .where(eq(materialVersions.id, parsed.data.versionId));

    await tx
      .update(materials)
      .set({ state: "PUBLISHED", isPublished: true, currentVersionId: parsed.data.versionId, updatedAt: at })
      .where(eq(materials.id, parsed.data.materialId));

    await logAudit(
      {
        actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
        action: "MATERIAL_PUBLISHED",
        entity: "material_version",
        entityId: parsed.data.versionId,
        metadata: {
          materialId: parsed.data.materialId,
          superseded: previousPublished.filter((row) => row.id !== parsed.data.versionId).length,
          overrideReason: parsed.data.overrideReason ?? null,
        },
      },
      tx,
    );
  });

  revalidateAuthoring(parsed.data.materialId);
  revalidatePath(`/programmeAreas/${loaded.areaCode}`);

  // Only the cohort the material was targeted at hears about it. `materials`
  // carries its own audience columns, so a district-specific protocol does not
  // ring a bell in every region.
  await notifyMaterialPublished({
    materialId: parsed.data.materialId,
    title: loaded.material.title,
    areaName: loaded.areaName,
    actorId: session.sub,
    audienceFilter: compactAudience({
      region: loaded.areaRegion,
      directorate: loaded.areaDirectorate,
      cadre: loaded.areaCadre,
    }),
  });

  return { ok: true, message: "Published. Learners in the audience can see it now." };
}

export async function archiveMaterialAction(
  _previous: AuthoringActionState,
  formData: FormData,
): Promise<AuthoringActionState> {
  const parsed = archiveInput.safeParse({
    materialId: field(formData, "materialId"),
    reason: field(formData, "reason"),
  });
  if (!parsed.success) return { ok: false, message: GENERIC_FAILURE };

  const guard = await guardForMaterial("material.archive", parsed.data.materialId);
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const [material] = await db
    .select({ id: materials.id, state: materials.state, title: materials.title })
    .from(materials)
    .where(eq(materials.id, parsed.data.materialId))
    .limit(1);
  if (!material) return { ok: false, message: "That material no longer exists." };

  const target: MaterialState = "ARCHIVED";
  if (!canTransition(material.state, target)) {
    return { ok: false, message: "This material is already archived." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(materials)
      .set({ state: target, isPublished: false, updatedAt: new Date() })
      .where(eq(materials.id, material.id));
    await tx
      .update(materialVersions)
      .set({ state: sql`case when ${materialVersions.state} = 'PUBLISHED' then 'SUPERSEDED'::material_state else ${materialVersions.state} end` })
      .where(eq(materialVersions.materialId, material.id));

    await logAudit(
      {
        actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
        action: "MATERIAL_ARCHIVED",
        entity: "material",
        entityId: material.id,
        metadata: { from: material.state, title: material.title, reason: parsed.data.reason ?? null },
      },
      tx,
    );
  });

  revalidateAuthoring(material.id);
  return { ok: true, message: "Archived. It no longer appears to learners, and the audit trail keeps the history." };
}
