"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import {
  districts,
  facilities,
  programmeAreas,
  programmeFields,
  subDistricts,
  trainingResources,
  trainingSessions,
} from "@/db/schema";
import { checkUpload } from "@/lib/material-workflow";
import { createMaterialUploadTarget, inspectMaterialObject, removeMaterialObject } from "@/lib/server/file-storage";
import { mayReviewField } from "@/lib/server/rbac";
import { notifyTrainingPublished, notifyTrainingReturned } from "@/lib/server/notify";
import { field } from "@/lib/schemas/authoring";
import { trainingInput, trainingUpdateInput } from "@/lib/schemas/training";
import { durationLabel, planYearOf } from "@/lib/training-dates";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";

/*
 * Creating and changing a training.
 *
 * The form already filters its selects (area follows field, facility follows
 * district), but the browser is not evidence: every reference is re-read here
 * and checked against its parent inside the same request. A training cannot end
 * up filed under another field's area, or at a facility in another district,
 * because somebody edited an option list.
 */

export interface TrainingActionState {
  ok: boolean;
  message: string | null;
}

interface References {
  year: number;
  programmeFieldId: string;
  programmeAreaId: string;
  regionId: string;
  districtId: string | null;
  subDistrictId: string | null;
  facilityId: string | null;
  durationText: string | null;
}

type Resolved = { ok: true; refs: References } | { ok: false; message: string };

async function resolveReferences(input: {
  year: number;
  programmeFieldId: string;
  programmeAreaId: string;
  regionId: string;
  districtId?: string;
  subDistrictId?: string;
  facilityId?: string;
  startsOn: string;
  endsOn?: string;
  durationText?: string;
}): Promise<Resolved> {
  // 1. The area must belong to the field that was chosen with it.
  const [area] = await db
    .select({ fieldId: programmeAreas.fieldId })
    .from(programmeAreas)
    .where(eq(programmeAreas.id, input.programmeAreaId))
    .limit(1);
  if (!area) return { ok: false, message: "That programme area no longer exists." };
  if (area.fieldId !== input.programmeFieldId) {
    return { ok: false, message: "That programme area belongs to a different programme field." };
  }

  // 2. The district must belong to the region.
  const regionId = input.regionId;
  if (input.districtId) {
    const [district] = await db
      .select({ regionId: districts.regionId })
      .from(districts)
      .where(eq(districts.id, input.districtId))
      .limit(1);
    if (!district) return { ok: false, message: "That district no longer exists." };
    if (district.regionId !== input.regionId) {
      return { ok: false, message: "That district is in a different region." };
    }
  } else if (input.subDistrictId || input.facilityId) {
    return { ok: false, message: "Choose the district before its sub-district or facility." };
  }

  // 3. The sub-district must belong to the district.
  if (input.subDistrictId) {
    const [sub] = await db
      .select({ districtId: subDistricts.districtId })
      .from(subDistricts)
      .where(eq(subDistricts.id, input.subDistrictId))
      .limit(1);
    if (!sub) return { ok: false, message: "That sub-district no longer exists." };
    if (sub.districtId !== input.districtId) {
      return { ok: false, message: "That sub-district is in a different district." };
    }
  }

  // 4. The facility must belong to the district, and agree with the sub-district.
  let subDistrictId = input.subDistrictId ?? null;
  if (input.facilityId) {
    const [facility] = await db
      .select({ districtId: facilities.districtId, subDistrictId: facilities.subDistrictId })
      .from(facilities)
      .where(and(eq(facilities.id, input.facilityId), eq(facilities.isActive, true)))
      .limit(1);
    if (!facility) return { ok: false, message: "That facility no longer exists or has been deactivated." };
    if (facility.districtId !== input.districtId) {
      return { ok: false, message: "That facility is in a different district." };
    }
    if (facility.subDistrictId) {
      if (subDistrictId && subDistrictId !== facility.subDistrictId) {
        return { ok: false, message: "That facility sits in a different sub-district." };
      }
      subDistrictId = facility.subDistrictId;
    }
  }

  // 5. The plan year follows the start date unless it was deliberately set.
  const yearFromDate = planYearOf(input.startsOn);
  const year = yearFromDate && Math.abs(yearFromDate - input.year) > 1 ? yearFromDate : input.year;

  return {
    ok: true,
    refs: {
      year,
      programmeFieldId: input.programmeFieldId,
      programmeAreaId: input.programmeAreaId,
      regionId,
      districtId: input.districtId ?? null,
      subDistrictId,
      facilityId: input.facilityId ?? null,
      durationText: input.durationText ?? (input.endsOn ? durationLabel(input.startsOn, input.endsOn) : null),
    },
  };
}

function readForm(formData: FormData) {
  return {
    title: field(formData, "title"),
    year: field(formData, "year"),
    programmeFieldId: field(formData, "programmeFieldId"),
    programmeAreaId: field(formData, "programmeAreaId"),
    targetGroup: field(formData, "targetGroup"),
    regionId: field(formData, "regionId"),
    districtId: field(formData, "districtId"),
    subDistrictId: field(formData, "subDistrictId"),
    facilityId: field(formData, "facilityId"),
    startsOn: field(formData, "startsOn"),
    endsOn: field(formData, "endsOn"),
    durationText: field(formData, "durationText"),
    venue: field(formData, "venue"),
    status: field(formData, "status"),
    attendeeCount: field(formData, "attendeeCount"),
    notes: field(formData, "notes"),
  };
}

function revalidateTrainings(id?: string) {
  revalidatePath("/trainings");
  revalidatePath("/insights");
  revalidatePath("/sessions");
  if (id) revalidatePath(`/trainings/${id}`);
}

export async function createTrainingAction(
  _previous: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const parsedInput = trainingInput.safeParse(readForm(formData));
  // The area is checked against the caller's grants, so a facilitator cannot
  // file a training under a field they do not hold by editing the option list.
  const guard = await checkCapability(
    "training.manage",
    parsedInput.success ? { areaId: parsedInput.data.programmeAreaId } : {},
  );
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const parsed = parsedInput;
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }

  // An administrator's entry is the record of something that happened, so it is
  // live. A facilitator's goes to the unit head who holds the field.
  const reviewState = session.role === "SYSTEM_ADMIN" ? "PUBLISHED" : "PENDING";

  const resolved = await resolveReferences(parsed.data);
  if (!resolved.ok) return { ok: false, message: resolved.message };

  let createdId: string | null = null;
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(trainingSessions)
        .values({
          title: parsed.data.title,
          year: resolved.refs.year,
          programmeFieldId: resolved.refs.programmeFieldId,
          programmeAreaId: resolved.refs.programmeAreaId,
          targetGroup: parsed.data.targetGroup ?? null,
          organisedOn: parsed.data.startsOn,
          endsOn: parsed.data.endsOn ?? null,
          durationText: resolved.refs.durationText,
          status: parsed.data.status,
          venue: parsed.data.venue ?? null,
          regionId: resolved.refs.regionId,
          districtId: resolved.refs.districtId,
          subDistrictId: resolved.refs.subDistrictId,
          facilityId: resolved.refs.facilityId,
          attendeeCount: parsed.data.attendeeCount ?? null,
          notes: parsed.data.notes ?? null,
          reviewState,
          createdById: session.sub,
        })
        .returning({ id: trainingSessions.id });
      createdId = row.id;

      await logAudit(
        {
          actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
          action: "TRAINING_CREATED",
          entity: "training",
          entityId: row.id,
          metadata: {
            title: parsed.data.title,
            year: resolved.refs.year,
            programmeAreaId: resolved.refs.programmeAreaId,
            startsOn: parsed.data.startsOn,
            status: parsed.data.status,
            reviewState,
          },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "training.create_failed", err: String(error) });
    return { ok: false, message: "The training was not saved. Try again in a moment." };
  }

  revalidateTrainings(createdId ?? undefined);
  const message =
    reviewState === "PENDING"
      ? `“${parsed.data.title}” was saved and sent to the unit head for review.`
      : `“${parsed.data.title}” is on the register.`;
  redirect(`/trainings/${createdId}?notice=${encodeURIComponent(message)}`);
}

export async function updateTrainingAction(
  _previous: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const parsedUpdate = trainingUpdateInput.safeParse({ ...readForm(formData), trainingId: field(formData, "trainingId") });
  const guard = await checkCapability(
    "training.manage",
    parsedUpdate.success ? { areaId: parsedUpdate.data.programmeAreaId } : {},
  );
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const parsed = parsedUpdate;
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }

  const [existing] = await db
    .select({ reviewState: trainingSessions.reviewState })
    .from(trainingSessions)
    .where(eq(trainingSessions.id, parsed.data.trainingId))
    .limit(1);
  // A rejected entry that is edited is a resubmission, not a silent edit: the
  // unit head sees it again rather than a changed record they already refused.
  const resubmit = existing?.reviewState === "REJECTED";

  const resolved = await resolveReferences(parsed.data);
  if (!resolved.ok) return { ok: false, message: resolved.message };

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(trainingSessions)
        .set({
          title: parsed.data.title,
          year: resolved.refs.year,
          programmeFieldId: resolved.refs.programmeFieldId,
          programmeAreaId: resolved.refs.programmeAreaId,
          targetGroup: parsed.data.targetGroup ?? null,
          organisedOn: parsed.data.startsOn,
          endsOn: parsed.data.endsOn ?? null,
          durationText: resolved.refs.durationText,
          status: parsed.data.status,
          venue: parsed.data.venue ?? null,
          regionId: resolved.refs.regionId,
          districtId: resolved.refs.districtId,
          subDistrictId: resolved.refs.subDistrictId,
          facilityId: resolved.refs.facilityId,
          attendeeCount: parsed.data.attendeeCount ?? null,
          notes: parsed.data.notes ?? null,
          ...(resubmit ? { reviewState: "PENDING" as const, reviewedById: null, reviewedAt: null, reviewNote: null } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(trainingSessions.id, parsed.data.trainingId), eq(trainingSessions.isArchived, false)));

      await logAudit(
        {
          actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
          action: "TRAINING_UPDATED",
          entity: "training",
          entityId: parsed.data.trainingId,
          metadata: { title: parsed.data.title, status: parsed.data.status, startsOn: parsed.data.startsOn },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "training.update_failed", err: String(error) });
    return { ok: false, message: "The changes were not saved. Try again in a moment." };
  }

  revalidateTrainings(parsed.data.trainingId);
  redirect(
    `/trainings/${parsed.data.trainingId}?notice=${encodeURIComponent(
      resubmit ? "Changes saved and sent back for review." : "Changes saved.",
    )}`,
  );
}

/** Withdraw a training from the register. The row stays: history is not deleted. */
export async function archiveTrainingAction(formData: FormData): Promise<void> {
  const guard = await checkCapability("training.manage");
  if (!guard.ok) redirect(`/trainings?error=${encodeURIComponent(guard.message)}`);
  const { session } = guard;

  const id = field(formData, "trainingId");
  if (!id) redirect(`/trainings?error=${encodeURIComponent("That training could not be found.")}`);

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(trainingSessions)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(trainingSessions.id, id));
      await logAudit(
        {
          actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
          action: "TRAINING_ARCHIVED",
          entity: "training",
          entityId: id,
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "training.archive_failed", err: String(error) });
    redirect(`/trainings/${id}?error=${encodeURIComponent("The training was not archived. Try again.")}`);
  }

  revalidateTrainings(id);
  redirect(`/trainings?notice=${encodeURIComponent("Training archived. It is out of the register; the row and its audit trail remain.")}`);
}

/* ── Review ───────────────────────────────────────────────────────────────────
 * A facilitator's training is visible to them and to the unit head of its field
 * until it is approved. Rejection keeps the row: the facilitator edits it, and
 * saving a rejected entry puts it back in the queue.
 */

export interface ReviewActionState {
  ok: boolean;
  message: string | null;
}

/**
 * Approve or reject one training. Authority is `mayReviewField`, which asks the
 * database whether this person is a unit head and holds that field — not the
 * role alone, and never the request payload.
 */
export async function reviewTrainingAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const trainingId = field(formData, "trainingId");
  const decision = field(formData, "decision");
  const note = field(formData, "note")?.trim() || null;

  if (!trainingId || (decision !== "approve" && decision !== "reject")) {
    return { ok: false, message: "That review could not be read. Reload the page." };
  }
  if (decision === "reject" && !note) {
    return { ok: false, message: "Say why it was sent back, so the facilitator knows what to change." };
  }

  const guard = await checkCapability("training.manage");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const [training] = await db
    .select({
      id: trainingSessions.id,
      title: trainingSessions.title,
      fieldId: trainingSessions.programmeFieldId,
      reviewState: trainingSessions.reviewState,
      createdById: trainingSessions.createdById,
      fieldName: programmeFields.name,
    })
    .from(trainingSessions)
    .leftJoin(programmeFields, eq(programmeFields.id, trainingSessions.programmeFieldId))
    .where(and(eq(trainingSessions.id, trainingId), eq(trainingSessions.isArchived, false)))
    .limit(1);
  if (!training) return { ok: false, message: "That training no longer exists." };

  if (!(await mayReviewField(session, training.fieldId))) {
    return { ok: false, message: "Only a unit head of that programme field can review it." };
  }
  if (training.reviewState !== "PENDING") {
    return { ok: false, message: "That training has already been reviewed." };
  }

  const nextState = decision === "approve" ? "PUBLISHED" : "REJECTED";
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(trainingSessions)
        .set({ reviewState: nextState, reviewedById: session.sub, reviewedAt: new Date(), reviewNote: note, updatedAt: new Date() })
        .where(eq(trainingSessions.id, trainingId));
      await logAudit(
        {
          actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
          action: decision === "approve" ? "TRAINING_PUBLISHED" : "TRAINING_REJECTED",
          entity: "training",
          entityId: trainingId,
          metadata: { title: training.title, note },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "training.review_failed", id: trainingId, err: String(error) });
    return { ok: false, message: "The review was not saved. Try again." };
  }

  revalidateTrainings(trainingId);

  // Telling people is part of the decision, not an afterthought: a published
  // training is only useful if the people it is for hear about it.
  if (decision === "approve") {
    await notifyTrainingPublished({
      trainingId,
      title: training.title,
      fieldName: training.fieldName ?? null,
      actorId: session.sub,
    });
  } else {
    await notifyTrainingReturned({
      trainingId,
      title: training.title,
      authorId: training.createdById,
      note: note ?? "Check the details and resubmit.",
      actorId: session.sub,
    });
  }

  return {
    ok: true,
    message:
      decision === "approve"
        ? `“${training.title}” is live, and the people it is for have been notified.`
        : `“${training.title}” was sent back to the facilitator, who has been notified.`,
  };
}

/* ── Resources ────────────────────────────────────────────────────────────────
 * The deck, the attendance sheet, the report. Files never pass through this
 * server: the browser PUTs to a presigned URL, then a second call records it.
 */

export interface ResourceTargetResult {
  ok: boolean;
  message: string | null;
  uploadUrl?: string;
  storageKey?: string;
  resourceId?: string;
}

export async function requestTrainingResourceAction(input: {
  trainingId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  title: string;
}): Promise<ResourceTargetResult> {
  const training = await loadReviewableTraining(input.trainingId);
  if (!training.ok) return { ok: false, message: training.message };

  const check = checkUpload(input.mimeType, input.sizeBytes);
  if (!check.ok) return { ok: false, message: check.message };

  const resourceId = randomUUID();
  const storageKey = `trainings/${input.trainingId}/${resourceId}.${check.extension}`;
  const target = await createMaterialUploadTarget(storageKey);
  if (!target.ok) {
    log.error({ event: "training.resource_target_failed", storageKey, reason: target.reason });
    return { ok: false, message: "Storage is not available right now. Try again in a moment." };
  }

  return { ok: true, message: null, uploadUrl: target.target.signedUrl, storageKey, resourceId };
}

export async function finaliseTrainingResourceAction(
  _previous: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const trainingId = field(formData, "trainingId");
  const storageKey = field(formData, "storageKey");
  const title = field(formData, "title")?.trim();
  const mimeType = field(formData, "mimeType") || null;
  if (!trainingId || !storageKey || !title) {
    return { ok: false, message: "That upload could not be read. Try again." };
  }
  // The key was issued for this training; refuse anything else.
  if (!storageKey.startsWith(`trainings/${trainingId}/`)) {
    return { ok: false, message: "That upload does not belong to this training." };
  }

  const training = await loadReviewableTraining(trainingId);
  if (!training.ok) return { ok: false, message: training.message };

  const inspected = await inspectMaterialObject(storageKey);
  if (!inspected.ok) {
    return { ok: false, message: "The file did not arrive. Nothing has been saved." };
  }

  try {
    await db.insert(trainingResources).values({
      trainingId,
      title,
      storageKey,
      mimeType: inspected.object.contentType ?? mimeType,
      sizeBytes: inspected.object.sizeBytes,
      uploadedById: training.sessionId,
    });
  } catch (error) {
    log.error({ event: "training.resource_record_failed", trainingId, err: String(error) });
    await removeMaterialObject(storageKey);
    return { ok: false, message: "The file was uploaded but not recorded. Try again." };
  }

  revalidateTrainings(trainingId);
  return { ok: true, message: `“${title}” is attached to this training.` };
}

export async function removeTrainingResourceAction(formData: FormData): Promise<void> {
  const trainingId = field(formData, "trainingId");
  const resourceId = field(formData, "resourceId");
  if (!trainingId || !resourceId) redirect("/trainings?error=That+attachment+could+not+be+found");

  const training = await loadReviewableTraining(trainingId);
  if (!training.ok) redirect(`/trainings/${trainingId}?error=${encodeURIComponent(training.message)}`);

  const [resource] = await db
    .select({ storageKey: trainingResources.storageKey, title: trainingResources.title })
    .from(trainingResources)
    .where(and(eq(trainingResources.id, resourceId), eq(trainingResources.trainingId, trainingId)))
    .limit(1);
  if (!resource) redirect(`/trainings/${trainingId}?error=That+attachment+no+longer+exists`);

  try {
    await db.delete(trainingResources).where(eq(trainingResources.id, resourceId));
    const removed = await removeMaterialObject(resource.storageKey);
    if (!removed.ok) log.warn({ event: "training.resource_object_orphaned", storageKey: resource.storageKey });
  } catch (error) {
    log.error({ event: "training.resource_remove_failed", id: resourceId, err: String(error) });
    redirect(`/trainings/${trainingId}?error=The+attachment+was+not+removed`);
  }

  revalidateTrainings(trainingId);
  redirect(`/trainings/${trainingId}?notice=${encodeURIComponent(`“${resource.title}” was removed.`)}`);
}

/**
 * Whoever may edit the training may attach to it: its creator, an administrator,
 * or a unit head of its field. Returns the session id for the uploader column.
 */
async function loadReviewableTraining(
  trainingId: string,
): Promise<{ ok: true; sessionId: string } | { ok: false; message: string }> {
  const guard = await checkCapability("training.manage");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const [training] = await db
    .select({ fieldId: trainingSessions.programmeFieldId, createdById: trainingSessions.createdById })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.id, trainingId), eq(trainingSessions.isArchived, false)))
    .limit(1);
  if (!training) return { ok: false, message: "That training no longer exists." };

  if (session.role === "SYSTEM_ADMIN") return { ok: true, sessionId: session.sub };
  if (training.createdById === session.sub) return { ok: true, sessionId: session.sub };
  if (await mayReviewField(session, training.fieldId)) return { ok: true, sessionId: session.sub };

  return { ok: false, message: "That training is not yours to change." };
}
