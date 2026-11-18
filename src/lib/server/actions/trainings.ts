"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { districts, facilities, programmeAreas, subDistricts, trainingSessions } from "@/db/schema";
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
  const guard = await checkCapability("training.manage");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const parsed = trainingInput.safeParse(readForm(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }

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
  redirect(`/trainings/${createdId}?notice=${encodeURIComponent(`“${parsed.data.title}” is on the register.`)}`);
}

export async function updateTrainingAction(
  _previous: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const guard = await checkCapability("training.manage");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const parsed = trainingUpdateInput.safeParse({ ...readForm(formData), trainingId: field(formData, "trainingId") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  }

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
  redirect(`/trainings/${parsed.data.trainingId}?notice=${encodeURIComponent("Changes saved.")}`);
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
