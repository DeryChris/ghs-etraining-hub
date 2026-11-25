"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { count, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { districts, facilities, regions, subDistricts } from "@/db/schema";
import { field } from "@/lib/schemas/authoring";
import { codeFrom, districtInput, facilityInput, regionInput, subDistrictInput } from "@/lib/schemas/reference";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";
import { backTo, failureMessage } from "./managed-form";

/*
 * Regions → districts → sub-districts → facilities, for /geography.
 *
 * This is the list every training location is drawn from, so the rules are
 * about not orphaning a record: a region with districts cannot be deleted, a
 * district with sub-districts or facilities cannot be deleted, and a facility
 * is never filed under a sub-district in another district. Deletes Postgres
 * would cascade (a facility, a sub-district) are allowed; the trainings that
 * pointed at them keep their dates and lose only the place, which is why
 * training_sessions.facility_id is ON DELETE SET NULL.
 *
 * Every action goes through `manage`, which keeps the four things that must
 * never diverge in one place: the capability check, the audit row, the
 * revalidation, and the fact that `redirect()` is thrown — so it can never
 * happen inside the `try` that catches a database error.
 */

const PATH = "/geography";

interface Actor {
  sub: string;
  role: string;
  name: string;
  staffId: string;
}

type Work = (actor: Actor) => Promise<string | void>;

async function manage(event: string, back: string, notice: string, work: Work): Promise<void> {
  const check = await checkCapability("geography.manage");
  if (!check.ok) return backTo(back, { error: check.message });
  const actor: Actor = {
    sub: check.session.sub,
    role: check.session.role,
    name: check.session.name,
    staffId: check.session.staffId,
  };

  let failure: string | null = null;
  try {
    const refusal = await work(actor);
    if (refusal) failure = refusal;
  } catch (error) {
    log.error({ event: `${event}_failed`, err: String(error) });
    failure = failureMessage(error, "The change was not saved. Try again.");
  }

  if (failure) return backTo(back, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  revalidateTag("geography", "max");
  return backTo(back, { notice });
}

/** Region codes are two letters in the reference data; keep them that way. */
async function availableRegionCode(name: string, supplied: string | undefined): Promise<string> {
  const base = (supplied ?? codeFrom(name)).slice(0, 6);
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = (attempt === 0 ? base : `${base}-${attempt + 1}`).slice(0, 8);
    const [taken] = await db
      .select({ id: regions.id })
      .from(regions)
      .where(eq(regions.code, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base.slice(0, 4)}-${Date.now().toString(36).toUpperCase().slice(-3)}`.slice(0, 8);
}

/* ── Regions ────────────────────────────────────────────────────────────── */

export async function createRegionAction(formData: FormData): Promise<void> {
  const parsed = regionInput.safeParse({ name: field(formData, "name"), code: field(formData, "code") });
  if (!parsed.success) return backTo(PATH, { error: parsed.error.issues[0]?.message ?? "Check the details." });

  return manage("region.create", PATH, `Added the ${parsed.data.name} Region.`, async (actor) => {
    const code = await availableRegionCode(parsed.data.name, parsed.data.code);
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(regions)
        .values({ code, name: parsed.data.name })
        .returning({ id: regions.id });
      await logAudit(
        {
          actor,
          action: "REGION_CREATED",
          entity: "region",
          entityId: created.id,
          metadata: { name: parsed.data.name, code },
        },
        tx,
      );
    });
  });
}

export async function updateRegionAction(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  const parsed = regionInput.safeParse({ name: field(formData, "name"), code: field(formData, "code") });
  if (!id) return backTo(PATH, { error: "That region could not be found." });
  if (!parsed.success) return backTo(PATH, { error: parsed.error.issues[0]?.message ?? "Check the details." });

  return manage("region.update", `${PATH}?region=${id}`, `Saved the ${parsed.data.name} Region.`, async (actor) => {
    await db.transaction(async (tx) => {
      await tx
        .update(regions)
        .set({ name: parsed.data.name, ...(parsed.data.code ? { code: parsed.data.code } : {}) })
        .where(eq(regions.id, id));
      await logAudit(
        { actor, action: "REGION_UPDATED", entity: "region", entityId: id, metadata: { name: parsed.data.name } },
        tx,
      );
    });
  });
}

export async function deleteRegionAction(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  if (!id) return backTo(PATH, { error: "That region could not be found." });

  return manage("region.delete", PATH, "Region deleted.", async (actor) => {
    const [children] = await db.select({ n: count() }).from(districts).where(eq(districts.regionId, id));
    if ((children?.n ?? 0) > 0) {
      return `${children?.n} district(s) still belong to this region. Remove them first.`;
    }
    await db.transaction(async (tx) => {
      await tx.delete(regions).where(eq(regions.id, id));
      await logAudit({ actor, action: "REGION_DELETED", entity: "region", entityId: id }, tx);
    });
  });
}

/* ── Districts ──────────────────────────────────────────────────────────── */

export async function createDistrictAction(formData: FormData): Promise<void> {
  const parsed = districtInput.safeParse({
    regionId: field(formData, "regionId"),
    name: field(formData, "name"),
    kind: field(formData, "kind") ?? "DISTRICT",
    capital: field(formData, "capital"),
  });
  if (!parsed.success) return backTo(PATH, { error: parsed.error.issues[0]?.message ?? "Check the details." });

  const regionId = parsed.data.regionId;
  return manage("district.create", `${PATH}?region=${regionId}`, `Added ${parsed.data.name}.`, async (actor) => {
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(districts)
        .values({
          regionId,
          name: parsed.data.name,
          kind: parsed.data.kind,
          capital: parsed.data.capital ?? null,
        })
        .returning({ id: districts.id });
      await logAudit(
        {
          actor,
          action: "DISTRICT_CREATED",
          entity: "district",
          entityId: created.id,
          metadata: { name: parsed.data.name, regionId, kind: parsed.data.kind },
        },
        tx,
      );
    });
  });
}

export async function updateDistrictAction(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  const parsed = districtInput.safeParse({
    regionId: field(formData, "regionId"),
    name: field(formData, "name"),
    kind: field(formData, "kind") ?? "DISTRICT",
    capital: field(formData, "capital"),
  });
  if (!id) return backTo(PATH, { error: "That district could not be found." });
  if (!parsed.success) return backTo(PATH, { error: parsed.error.issues[0]?.message ?? "Check the details." });

  const regionId = parsed.data.regionId;
  return manage(
    "district.update",
    `${PATH}?region=${regionId}&district=${id}`,
    `Saved ${parsed.data.name}.`,
    async (actor) => {
      await db.transaction(async (tx) => {
        await tx
          .update(districts)
          .set({ name: parsed.data.name, kind: parsed.data.kind, capital: parsed.data.capital ?? null })
          .where(eq(districts.id, id));
        await logAudit(
          { actor, action: "DISTRICT_UPDATED", entity: "district", entityId: id, metadata: { name: parsed.data.name } },
          tx,
        );
      });
    },
  );
}

export async function deleteDistrictAction(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  const regionId = field(formData, "regionId");
  if (!id) return backTo(PATH, { error: "That district could not be found." });
  const back = regionId ? `${PATH}?region=${regionId}` : PATH;

  return manage("district.delete", back, "District deleted.", async (actor) => {
    const [[sub], [fac]] = await Promise.all([
      db.select({ n: count() }).from(subDistricts).where(eq(subDistricts.districtId, id)),
      db.select({ n: count() }).from(facilities).where(eq(facilities.districtId, id)),
    ]);
    if ((sub?.n ?? 0) + (fac?.n ?? 0) > 0) {
      return `This district still holds ${sub?.n ?? 0} sub-district(s) and ${fac?.n ?? 0} facilit(ies). Remove them first.`;
    }
    await db.transaction(async (tx) => {
      await tx.delete(districts).where(eq(districts.id, id));
      await logAudit({ actor, action: "DISTRICT_DELETED", entity: "district", entityId: id }, tx);
    });
  });
}

/* ── Sub-districts ──────────────────────────────────────────────────────── */

export async function createSubDistrictAction(formData: FormData): Promise<void> {
  const parsed = subDistrictInput.safeParse({
    districtId: field(formData, "districtId"),
    name: field(formData, "name"),
  });
  if (!parsed.success) return backTo(PATH, { error: parsed.error.issues[0]?.message ?? "Check the details." });

  const regionId = field(formData, "regionId");
  const back = regionId ? `${PATH}?region=${regionId}&district=${parsed.data.districtId}` : PATH;

  return manage("sub_district.create", back, `Added ${parsed.data.name}.`, async (actor) => {
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(subDistricts)
        .values({ districtId: parsed.data.districtId, name: parsed.data.name })
        .returning({ id: subDistricts.id });
      await logAudit(
        {
          actor,
          action: "SUB_DISTRICT_CREATED",
          entity: "sub_district",
          entityId: created.id,
          metadata: { name: parsed.data.name, districtId: parsed.data.districtId },
        },
        tx,
      );
    });
  });
}

export async function deleteSubDistrictAction(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  const regionId = field(formData, "regionId");
  const districtId = field(formData, "districtId");
  if (!id) return backTo(PATH, { error: "That sub-district could not be found." });
  const back = regionId && districtId ? `${PATH}?region=${regionId}&district=${districtId}` : PATH;

  return manage(
    "sub_district.delete",
    back,
    "Sub-district deleted. Facilities and trainings that used it are unchanged.",
    async (actor) => {
      await db.transaction(async (tx) => {
        await tx.delete(subDistricts).where(eq(subDistricts.id, id));
        await logAudit({ actor, action: "SUB_DISTRICT_DELETED", entity: "sub_district", entityId: id }, tx);
      });
    },
  );
}

/* ── Facilities ─────────────────────────────────────────────────────────── */

function facilityForm(formData: FormData) {
  return facilityInput.safeParse({
    districtId: field(formData, "districtId"),
    subDistrictId: field(formData, "subDistrictId"),
    name: field(formData, "name"),
    type: field(formData, "type") ?? "HEALTH_CENTRE",
    ownership: field(formData, "ownership") ?? "GHS",
    isActive: field(formData, "isActive") ?? "true",
  });
}

/** A facility may only sit in a sub-district that belongs to its own district. */
async function subDistrictMatches(subDistrictId: string | undefined, districtId: string): Promise<boolean> {
  if (!subDistrictId) return true;
  const [row] = await db
    .select({ districtId: subDistricts.districtId })
    .from(subDistricts)
    .where(eq(subDistricts.id, subDistrictId))
    .limit(1);
  return Boolean(row) && row.districtId === districtId;
}

export async function createFacilityAction(formData: FormData): Promise<void> {
  const parsed = facilityForm(formData);
  if (!parsed.success) return backTo(PATH, { error: parsed.error.issues[0]?.message ?? "Check the details." });

  const input = parsed.data;
  const regionId = field(formData, "regionId");
  const back = regionId ? `${PATH}?region=${regionId}&district=${input.districtId}` : PATH;

  return manage("facility.create", back, `Added ${input.name}.`, async (actor) => {
    if (!(await subDistrictMatches(input.subDistrictId, input.districtId))) {
      return "That sub-district is in a different district.";
    }
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(facilities)
        .values({
          districtId: input.districtId,
          subDistrictId: input.subDistrictId ?? null,
          name: input.name,
          type: input.type,
          ownership: input.ownership,
          isActive: input.isActive,
        })
        .returning({ id: facilities.id });
      await logAudit(
        {
          actor,
          action: "FACILITY_CREATED",
          entity: "facility",
          entityId: created.id,
          metadata: { name: input.name, districtId: input.districtId, type: input.type },
        },
        tx,
      );
    });
  });
}

export async function updateFacilityAction(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  const parsed = facilityForm(formData);
  if (!id) return backTo(PATH, { error: "That facility could not be found." });
  if (!parsed.success) return backTo(PATH, { error: parsed.error.issues[0]?.message ?? "Check the details." });

  const input = parsed.data;
  const regionId = field(formData, "regionId");
  const back = regionId ? `${PATH}?region=${regionId}&district=${input.districtId}` : PATH;

  return manage("facility.update", back, `Saved ${input.name}.`, async (actor) => {
    if (!(await subDistrictMatches(input.subDistrictId, input.districtId))) {
      return "That sub-district is in a different district.";
    }
    await db.transaction(async (tx) => {
      await tx
        .update(facilities)
        .set({
          subDistrictId: input.subDistrictId ?? null,
          name: input.name,
          type: input.type,
          ownership: input.ownership,
          isActive: input.isActive,
        })
        .where(eq(facilities.id, id));
      await logAudit(
        { actor, action: "FACILITY_UPDATED", entity: "facility", entityId: id, metadata: { name: input.name } },
        tx,
      );
    });
  });
}

export async function deleteFacilityAction(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  const regionId = field(formData, "regionId");
  const districtId = field(formData, "districtId");
  if (!id) return backTo(PATH, { error: "That facility could not be found." });
  const back = regionId && districtId ? `${PATH}?region=${regionId}&district=${districtId}` : PATH;

  return manage(
    "facility.delete",
    back,
    "Facility deleted. Trainings held there keep their dates and lose the venue.",
    async (actor) => {
      await db.transaction(async (tx) => {
        await tx.delete(facilities).where(eq(facilities.id, id));
        await logAudit({ actor, action: "FACILITY_DELETED", entity: "facility", entityId: id }, tx);
      });
    },
  );
}

/** The "active" switch: a closed facility stops being offered on new plans. */
export async function setFacilityActiveAction(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  const active = field(formData, "isActive") === "true";
  const regionId = field(formData, "regionId");
  const districtId = field(formData, "districtId");
  if (!id) return backTo(PATH, { error: "That facility could not be found." });
  const back = regionId && districtId ? `${PATH}?region=${regionId}&district=${districtId}` : PATH;

  return manage(
    active ? "facility.reactivate" : "facility.deactivate",
    back,
    active ? "Facility is active again." : "Facility marked inactive.",
    async (actor) => {
      await db.transaction(async (tx) => {
        await tx.update(facilities).set({ isActive: active }).where(eq(facilities.id, id));
        await logAudit(
          {
            actor,
            action: active ? "FACILITY_REACTIVATED" : "FACILITY_DEACTIVATED",
            entity: "facility",
            entityId: id,
          },
          tx,
        );
      });
    },
  );
}
