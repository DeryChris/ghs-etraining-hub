"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { enrollments, materialProgress, materials, spaces } from "@/db/schema";
import { formatCredits } from "@/lib/format";
import { logAudit } from "@/lib/server/audit";
import { checkCapability } from "@/lib/server/rbac";

export interface ProgressActionState {
  ok: boolean;
  message: string | null;
}

const progressInput = z
  .object({
    materialId: z.string().uuid(),
    intent: z.enum(["start", "acknowledge", "complete"]),
  })
  .strict();

function successMessage(intent: "start" | "acknowledge" | "complete", creditsX10: number): string {
  if (intent === "start") return "Started. Your progress is saved.";
  if (intent === "acknowledge") return "Acknowledged. Mark the material complete when you have finished it.";
  return `Completed. ${formatCredits(creditsX10)} added to your CPD transcript.`;
}

/**
 * One action covers the learner's journey: start → acknowledge (mandatory
 * protocols) → complete. Each step is written atomically with its audit row.
 */
export async function updateMaterialProgressAction(
  _previous: ProgressActionState,
  formData: FormData,
): Promise<ProgressActionState> {
  const guard = await checkCapability("enrollment.self");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const parsed = progressInput.safeParse({
    materialId: formData.get("materialId"),
    intent: formData.get("intent"),
  });
  if (!parsed.success) return { ok: false, message: "We could not save that step. Refresh the page and try again." };
  const { materialId, intent } = parsed.data;

  const [material] = await db
    .select({
      spaceId: materials.spaceId,
      spaceSlug: spaces.slug,
      title: materials.title,
      versionId: materials.currentVersionId,
      requiresAcknowledgement: materials.requiresAcknowledgement,
      cpdCreditsX10: materials.cpdCreditsX10,
    })
    .from(materials)
    .innerJoin(spaces, eq(spaces.id, materials.spaceId))
    .where(and(eq(materials.id, materialId), eq(materials.isPublished, true), eq(materials.state, "PUBLISHED")))
    .limit(1);

  if (!material || !material.versionId) {
    return { ok: false, message: "This material is no longer available." };
  }
  const versionId = material.versionId;
  const actor = { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId };

  const result: ProgressActionState = await db.transaction(async (tx) => {
    // Recording progress enrols the learner in the space (idempotent).
    await tx
      .insert(enrollments)
      .values({ userId: session.sub, spaceId: material.spaceId, source: "SELF" })
      .onConflictDoNothing();

    const [row] = await tx
      .select()
      .from(materialProgress)
      .where(and(eq(materialProgress.userId, session.sub), eq(materialProgress.materialId, materialId)))
      .limit(1)
      .for("update");
    const current = row ?? null;

    // A newer published version supersedes earlier acknowledgement and completion.
    const versionChanged = current !== null && current.materialVersionId !== versionId;
    if (current?.status === "COMPLETED" && !versionChanged) {
      return { ok: true, message: "This material is already completed and recorded." };
    }

    const acknowledgedBefore = current !== null && !versionChanged ? current.acknowledgedAt : null;
    if (intent === "complete" && material.requiresAcknowledgement && acknowledgedBefore === null) {
      return { ok: false, message: "Acknowledge this protocol before you mark it complete." };
    }

    const now = new Date();
    const status = intent === "complete" ? "COMPLETED" : "IN_PROGRESS";
    const acknowledgedAt = intent === "acknowledge" ? (acknowledgedBefore ?? now) : acknowledgedBefore;
    const watchedPercent = intent === "complete" ? 100 : current !== null && !versionChanged ? current.watchedPercent : 0;
    const completedAt = intent === "complete" ? now : null;

    await tx
      .insert(materialProgress)
      .values({
        userId: session.sub,
        materialId,
        materialVersionId: versionId,
        status,
        watchedPercent,
        acknowledgedAt,
        completedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [materialProgress.userId, materialProgress.materialId],
        set: {
          materialVersionId: versionId,
          status,
          watchedPercent,
          acknowledgedAt,
          completedAt,
          updatedAt: now,
        },
      });

    const action =
      intent === "complete" ? "MATERIAL_COMPLETED" : intent === "acknowledge" ? "MATERIAL_ACKNOWLEDGED" : "MATERIAL_STARTED";
    await logAudit(
      {
        actor,
        action,
        entity: "Material",
        entityId: materialId,
        metadata: {
          versionId,
          title: material.title,
          cpdCreditsX10: material.cpdCreditsX10,
          supersededVersion: versionChanged,
        },
      },
      tx,
    );

    return { ok: true, message: successMessage(intent, material.cpdCreditsX10) };
  });

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/library");
    revalidatePath("/analytics");
    revalidatePath(`/materials/${materialId}`);
    revalidatePath(`/spaces/${material.spaceSlug}`);
  }
  return result;
}
