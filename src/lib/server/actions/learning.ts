"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { enrollments, materialProgress } from "@/db/schema";
import { logAudit } from "@/lib/server/audit";
import { getMaterialDetail } from "@/lib/server/learning-queries";
import { log } from "@/lib/server/logger";
import { consumeRateLimit, rateLimitKey, retryAfterText } from "@/lib/server/rate-limit";
import { checkCapability } from "@/lib/server/rbac";

export interface AcknowledgementActionState {
  ok: boolean;
  message: string | null;
}

export type ProgressActionState = AcknowledgementActionState;

const acknowledgementInput = z
  .object({
    materialId: z.string().uuid(),
  })
  .strict();

/**
 * Sign for the current version of a protocol.
 *
 * This is the only thing a reader records against a material. The library used
 * to track a learning path as well — start, in progress, watch percent, mark
 * complete — and every page turned that into a fraction. The fractions were
 * arithmetic about a course nobody had enrolled in, so they are gone. An
 * acknowledgement is different: it says a member of staff has read *this*
 * version, which is a fact a directorate can be asked about.
 *
 * The row is written atomically with its audit entry, so the record and the
 * reason for it can never disagree.
 */
export async function acknowledgeMaterialAction(
  _previous: AcknowledgementActionState,
  formData: FormData,
): Promise<AcknowledgementActionState> {
  const guard = await checkCapability("enrollment.self");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const parsed = acknowledgementInput.safeParse({ materialId: formData.get("materialId") });
  if (!parsed.success) return { ok: false, message: "We could not save that. Refresh the page and try again." };
  const { materialId } = parsed.data;

  // A learner can post this action directly, so the cohort rules are re-applied
  // here: restricted directorates and other cohorts' material are not reachable
  // by guessing a material id.
  const detail = await getMaterialDetail(materialId, session);
  if (!detail?.material.currentVersionId || !detail.version) {
    return { ok: false, message: "This material is no longer available." };
  }
  if (!detail.material.requiresAcknowledgement) {
    return { ok: false, message: "Nothing has to be signed for this material." };
  }

  const limit = await consumeRateLimit(rateLimitKey("acknowledge", session.sub), 60, 5 * 60);
  if (!limit.allowed) {
    log.warn({ event: "material.acknowledge_rate_limited", userId: session.sub, materialId });
    return { ok: false, message: `Too many updates in a short time. Try again in ${retryAfterText(limit.retryAfterSeconds)}.` };
  }

  const material = detail.material;
  const versionId = material.currentVersionId;
  if (versionId === null) return { ok: false, message: "This material is no longer available." };
  const actor = { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId };

  const result: AcknowledgementActionState = await db.transaction(async (tx) => {
    // Signing for an area is an enrolment in it (idempotent) — it is how the
    // service knows which programmes a person actually works in.
    await tx
      .insert(enrollments)
      .values({ userId: session.sub, programmeAreaId: material.programmeAreaId, source: "SELF" })
      .onConflictDoNothing();

    const [current] = await tx
      .select()
      .from(materialProgress)
      .where(and(eq(materialProgress.userId, session.sub), eq(materialProgress.materialId, materialId)))
      .limit(1)
      .for("update");

    // Already signed for this exact version: say so instead of rewriting the
    // timestamp, which would falsify when they signed.
    if (current && current.materialVersionId === versionId && current.acknowledgedAt !== null) {
      return { ok: true, message: "You have already acknowledged this version." };
    }

    const now = new Date();
    await tx
      .insert(materialProgress)
      .values({
        userId: session.sub,
        materialId,
        materialVersionId: versionId,
        acknowledgedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [materialProgress.userId, materialProgress.materialId],
        set: { materialVersionId: versionId, acknowledgedAt: now, updatedAt: now },
      });

    await logAudit(
      {
        actor,
        action: "MATERIAL_ACKNOWLEDGED",
        entity: "Material",
        entityId: materialId,
        metadata: {
          versionId,
          title: material.title,
          supersededVersion: current !== null && current.materialVersionId !== versionId,
        },
      },
      tx,
    );

    return { ok: true, message: "Acknowledged. The record shows when, and against which version." };
  });

  if (result.ok) {
    log.info({ event: "material.acknowledged", userId: session.sub, role: session.role, materialId, versionId });
    revalidatePath("/dashboard");
    revalidatePath("/catalogue");
    revalidatePath("/analytics");
    revalidatePath(`/materials/${materialId}`);
  }
  return result;
}
