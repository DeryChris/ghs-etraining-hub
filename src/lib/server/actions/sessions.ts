"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { categories, districts, facilities, spaces, subDistricts, trainingSessions } from "@/db/schema";
import { field } from "@/lib/schemas/authoring";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";

/*
 * A session is a training that actually happened. Recording one is a staff
 * action scoped to the programmes the person facilitates, and it is audited:
 * the insights charts count these rows, and "how many trainings did this
 * programme run" should not be answerable by anyone who can type into a form.
 */

export interface SessionActionState {
  ok: boolean;
  message: string | null;
}

const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal("").transform(() => undefined));

const sessionInput = z
  .object({
    title: z.string().trim().min(4, "Give the session a title of at least 4 characters.").max(160),
    categoryId: z.string().uuid("Choose the programme."),
    spaceId: optionalUuid,
    organisedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date the session ran.")
      .refine((value) => value <= new Date().toISOString().slice(0, 10), "A session cannot be in the future."),
    districtId: optionalUuid,
    subDistrictId: optionalUuid,
    facilityId: optionalUuid,
    facilitatorName: z.string().trim().max(120).optional(),
    attendeeCount: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? Number.parseInt(value, 10) : undefined))
      .refine((value) => value === undefined || (Number.isInteger(value) && value >= 0 && value <= 5000), {
        message: "Enter the number of people who attended.",
      }),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict();

export async function createSessionAction(_previous: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const parsed = sessionInput.safeParse({
    title: field(formData, "title"),
    categoryId: field(formData, "categoryId"),
    spaceId: field(formData, "spaceId"),
    organisedOn: field(formData, "organisedOn"),
    districtId: field(formData, "districtId"),
    subDistrictId: field(formData, "subDistrictId"),
    facilityId: field(formData, "facilityId"),
    facilitatorName: field(formData, "facilitatorName"),
    attendeeCount: field(formData, "attendeeCount"),
    notes: field(formData, "notes"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the details and try again." };

  const input = parsed.data;
  const guard = await checkCapability("training.create", { categoryId: input.categoryId });
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  // Every optional reference is verified against what it claims to belong to, so
  // a session cannot be filed under another district's facility.
  const [programme] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.id, input.categoryId), eq(categories.isArchived, false)))
    .limit(1);
  if (!programme) return { ok: false, message: "That programme no longer exists." };

  if (input.spaceId) {
    const [space] = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(and(eq(spaces.id, input.spaceId), eq(spaces.categoryId, input.categoryId)))
      .limit(1);
    if (!space) return { ok: false, message: "That module does not belong to the chosen programme." };
  }

  let regionId: string | null = null;
  if (input.subDistrictId) {
    const [row] = await db
      .select({ id: subDistricts.id, districtId: subDistricts.districtId })
      .from(subDistricts)
      .where(eq(subDistricts.id, input.subDistrictId))
      .limit(1);
    if (!row) return { ok: false, message: "That sub-district no longer exists." };
    if (input.districtId && row.districtId !== input.districtId) {
      return { ok: false, message: "That sub-district belongs to a different district." };
    }
  }

  if (input.districtId) {
    const [district] = await db
      .select({ id: districts.id, regionId: districts.regionId })
      .from(districts)
      .where(eq(districts.id, input.districtId))
      .limit(1);
    if (!district) return { ok: false, message: "That district no longer exists." };
    regionId = district.regionId;
  }

  if (input.facilityId) {
    const [facility] = await db
      .select({ id: facilities.id, districtId: facilities.districtId })
      .from(facilities)
      .where(eq(facilities.id, input.facilityId))
      .limit(1);
    if (!facility) return { ok: false, message: "That facility no longer exists." };
    if (input.districtId && facility.districtId !== input.districtId) {
      return { ok: false, message: "That facility is in a different district." };
    }
    if (!input.districtId) {
      const [district] = await db
        .select({ regionId: districts.regionId })
        .from(districts)
        .where(eq(districts.id, facility.districtId))
        .limit(1);
      regionId = district?.regionId ?? null;
    }
  }

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(trainingSessions)
        .values({
          title: input.title,
          categoryId: input.categoryId,
          spaceId: input.spaceId ?? null,
          organisedOn: input.organisedOn,
          regionId,
          districtId: input.districtId ?? null,
          subDistrictId: input.subDistrictId ?? null,
          facilityId: input.facilityId ?? null,
          facilitatorName: input.facilitatorName ?? null,
          facilitatorId: session.sub,
          attendeeCount: input.attendeeCount ?? null,
          notes: input.notes ?? null,
          createdById: session.sub,
        })
        .returning({ id: trainingSessions.id });

      await logAudit(
        {
          actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
          action: "TRAINING_SESSION_RECORDED",
          entity: "training_session",
          entityId: row.id,
          metadata: {
            categoryId: input.categoryId,
            organisedOn: input.organisedOn,
            districtId: input.districtId ?? null,
            facilityId: input.facilityId ?? null,
          },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "session.create_failed", err: String(error) });
    return { ok: false, message: "The session was not recorded. Try again in a moment." };
  }

  revalidatePath("/sessions");
  revalidatePath("/insights");
  return { ok: true, message: `Recorded “${input.title}” under ${programme.name}.` };
}
