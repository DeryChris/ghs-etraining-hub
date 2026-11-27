"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { count, eq } from "drizzle-orm";
import { db } from "@/db/index";
import {
  areaFacilitators,
  programmeAreas,
  programmeFields,
  trainingSessions,
  users,
} from "@/db/schema";
import { field } from "@/lib/schemas/authoring";
import {
  codeFrom,
  programmeAreaInput,
  programmeFieldInput,
} from "@/lib/schemas/reference";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";
import { backTo, failureMessage } from "./managed-form";

/*
 * The database keeps legacy names: `programme_fields` is the parent Programme
 * Area table, and `programme_areas` is the child Programme Field table. The
 * actions below use the public vocabulary in their messages. Administrators
 * only (`taxonomy.manage`), and every change is audited in the same transaction
 * as the write: renaming a node rewrites what past plans say they covered.
 *
 * Codes are generated when the administrator does not supply one, and never
 * change afterwards: they appear in exports and in the seeder's natural keys.
 *
 * Flow rule, applied in every action here: no redirect inside a `try`.
 * `redirect()` works by throwing, so a `catch` around it would swallow the
 * navigation and report a failure for a change that actually succeeded. The
 * work happens in the `try`, the sentence is assembled after it, and `backTo`
 * is the last thing the action does — outside the `catch`.
 */

const PATH = "/programme-fields";

interface Actor {
  sub: string;
  role: string;
  name: string;
  staffId: string;
}

async function adminGuard(): Promise<
  { ok: true; actor: Actor } | { ok: false; message: string }
> {
  const check = await checkCapability("taxonomy.manage");
  return check.ok
    ? {
        ok: true,
        actor: {
          sub: check.session.sub,
          role: check.session.role,
          name: check.session.name,
          staffId: check.session.staffId,
        },
      }
    : { ok: false, message: check.message };
}

async function availableFieldCode(
  name: string,
  supplied: string | undefined,
): Promise<string> {
  const base = supplied ?? `PF-${codeFrom(name)}`;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [taken] = await db
      .select({ id: programmeFields.id })
      .from(programmeFields)
      .where(eq(programmeFields.code, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

async function availableAreaCode(
  fieldId: string,
  name: string,
  supplied: string | undefined,
): Promise<string> {
  const [parent] = await db
    .select({ code: programmeFields.code })
    .from(programmeFields)
    .where(eq(programmeFields.id, fieldId))
    .limit(1);
  const prefix = `${parent?.code ?? "PF"}-`;
  const base = supplied ?? `${prefix}${codeFrom(name)}`;

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const [taken] = await db
      .select({ id: programmeAreas.id })
      .from(programmeAreas)
      .where(eq(programmeAreas.code, candidate))
      .limit(1);
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

/* ── Programme Areas (database table: programme_fields) ─────────────────── */

export async function createProgrammeFieldAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const parsed = programmeFieldInput.safeParse({
    name: field(formData, "name"),
    code: field(formData, "code"),
    description: field(formData, "description"),
  });
  if (!parsed.success)
    return backTo(PATH, {
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    });

  const input = parsed.data;
  let failure: string | null = null;
  try {
    const code = await availableFieldCode(input.name, input.code);
    const [existing] = await db.select({ n: count() }).from(programmeFields);
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(programmeFields)
        .values({
          code,
          name: input.name,
          description: input.description ?? null,
          sortOrder: (existing?.n ?? 0) * 10,
        })
        .returning({ id: programmeFields.id });
      await logAudit(
        {
          actor: auth.actor,
          action: "PROGRAMME_FIELD_CREATED",
          entity: "programme_field",
          entityId: created.id,
          metadata: { name: input.name, code },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "programme_field.create_failed", err: String(error) });
    failure = failureMessage(
      error,
      "The programme area was not created. Try again.",
    );
  }

  if (failure) return backTo(PATH, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  return backTo(PATH, { notice: `Added “${input.name}”.` });
}

export async function updateProgrammeFieldAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const id = field(formData, "id");
  const parsed = programmeFieldInput.safeParse({
    name: field(formData, "name"),
    code: "",
    description: field(formData, "description"),
  });
  if (!id)
    return backTo(PATH, { error: "That programme area could not be found." });
  if (!parsed.success)
    return backTo(PATH, {
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    });

  let failure: string | null = null;
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(programmeFields)
        .set({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          updatedAt: new Date(),
        })
        .where(eq(programmeFields.id, id));
      await logAudit(
        {
          actor: auth.actor,
          action: "PROGRAMME_FIELD_UPDATED",
          entity: "programme_field",
          entityId: id,
          metadata: { name: parsed.data.name },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "programme_field.update_failed", err: String(error) });
    failure = failureMessage(
      error,
      "The programme area was not saved. Try again.",
    );
  }

  if (failure) return backTo(PATH, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  return backTo(PATH, { notice: `Saved “${parsed.data.name}”.` });
}

export async function setProgrammeFieldArchivedAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const id = field(formData, "id");
  const archived = field(formData, "archived") === "true";
  if (!id)
    return backTo(PATH, { error: "That programme area could not be found." });

  let failure: string | null = null;
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(programmeFields)
        .set({ isArchived: archived, updatedAt: new Date() })
        .where(eq(programmeFields.id, id));
      await logAudit(
        {
          actor: auth.actor,
          action: archived
            ? "PROGRAMME_FIELD_ARCHIVED"
            : "PROGRAMME_FIELD_RESTORED",
          entity: "programme_field",
          entityId: id,
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "programme_field.archive_failed", err: String(error) });
    failure = failureMessage(
      error,
      "The programme area was not changed. Try again.",
    );
  }

  if (failure) return backTo(PATH, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  return backTo(PATH, {
    notice: archived
      ? "Archived. It stays on past trainings but is no longer offered on a new plan."
      : "Restored — it is offered on new plans again.",
  });
}

export async function deleteProgrammeFieldAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const id = field(formData, "id");
  if (!id)
    return backTo(PATH, { error: "That programme area could not be found." });

  let failure: string | null = null;
  try {
    const [areas] = await db
      .select({ n: count() })
      .from(programmeAreas)
      .where(eq(programmeAreas.fieldId, id));

    if ((areas?.n ?? 0) > 0) {
      failure = `This Programme Area still contains ${areas?.n} Programme Field${areas?.n === 1 ? "" : "s"}. Move or delete those first, or archive the Programme Area instead.`;
    } else {
      await db.transaction(async (tx) => {
        await tx.delete(programmeFields).where(eq(programmeFields.id, id));
        await logAudit(
          {
            actor: auth.actor,
            action: "PROGRAMME_FIELD_DELETED",
            entity: "programme_field",
            entityId: id,
          },
          tx,
        );
      });
    }
  } catch (error) {
    log.error({ event: "programme_field.delete_failed", err: String(error) });
    failure = failureMessage(
      error,
      "The programme area was not deleted. Try again.",
    );
  }

  if (failure) return backTo(PATH, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  return backTo(PATH, { notice: "Programme area deleted." });
}

/* ── Programme Fields (database table: programme_areas) ─────────────────── */

export async function createProgrammeAreaAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const parsed = programmeAreaInput.safeParse({
    fieldId: field(formData, "fieldId"),
    name: field(formData, "name"),
    code: field(formData, "code"),
    description: field(formData, "description"),
  });
  if (!parsed.success)
    return backTo(PATH, {
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    });

  const input = parsed.data;
  const anchor = `?field=${input.fieldId}`;
  let failure: string | null = null;
  try {
    const code = await availableAreaCode(input.fieldId, input.name, input.code);
    const [existing] = await db
      .select({ n: count() })
      .from(programmeAreas)
      .where(eq(programmeAreas.fieldId, input.fieldId));
    await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(programmeAreas)
        .values({
          fieldId: input.fieldId,
          code,
          name: input.name,
          description: input.description ?? null,
          sortOrder: (existing?.n ?? 0) * 10,
        })
        .returning({ id: programmeAreas.id });
      await logAudit(
        {
          actor: auth.actor,
          action: "PROGRAMME_AREA_CREATED",
          entity: "programme_area",
          entityId: created.id,
          metadata: { name: input.name, code, fieldId: input.fieldId },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "programme_area.create_failed", err: String(error) });
    failure = failureMessage(
      error,
      "The programme field was not created. Try again.",
    );
  }

  if (failure) return backTo(PATH + anchor, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  return backTo(PATH + anchor, { notice: `Added “${input.name}”.` });
}

export async function updateProgrammeAreaAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const id = field(formData, "id");
  const fieldId = field(formData, "fieldId");
  const parsed = programmeAreaInput.safeParse({
    fieldId: fieldId ?? "",
    name: field(formData, "name"),
    code: "",
    description: field(formData, "description"),
  });
  if (!id)
    return backTo(PATH, { error: "That programme field could not be found." });
  if (!parsed.success)
    return backTo(PATH, {
      error: parsed.error.issues[0]?.message ?? "Check the details.",
    });

  const anchor = fieldId ? `?field=${fieldId}` : "";
  let failure: string | null = null;
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(programmeAreas)
        .set({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          updatedAt: new Date(),
        })
        .where(eq(programmeAreas.id, id));
      await logAudit(
        {
          actor: auth.actor,
          action: "PROGRAMME_AREA_UPDATED",
          entity: "programme_area",
          entityId: id,
          metadata: { name: parsed.data.name },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "programme_area.update_failed", err: String(error) });
    failure = failureMessage(
      error,
      "The programme field was not saved. Try again.",
    );
  }

  if (failure) return backTo(PATH + anchor, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  return backTo(PATH + anchor, { notice: `Saved “${parsed.data.name}”.` });
}

export async function setProgrammeAreaArchivedAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const id = field(formData, "id");
  const fieldId = field(formData, "fieldId");
  const archived = field(formData, "archived") === "true";
  if (!id)
    return backTo(PATH, { error: "That programme field could not be found." });

  const anchor = fieldId ? `?field=${fieldId}` : "";
  let failure: string | null = null;
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(programmeAreas)
        .set({ isArchived: archived, updatedAt: new Date() })
        .where(eq(programmeAreas.id, id));
      await logAudit(
        {
          actor: auth.actor,
          action: archived
            ? "PROGRAMME_AREA_ARCHIVED"
            : "PROGRAMME_AREA_RESTORED",
          entity: "programme_area",
          entityId: id,
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "programme_area.archive_failed", err: String(error) });
    failure = failureMessage(
      error,
      "The programme field was not changed. Try again.",
    );
  }

  if (failure) return backTo(PATH + anchor, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  return backTo(PATH + anchor, {
    notice: archived
      ? "Archived. Existing trainings keep it; new plans no longer offer it."
      : "Restored.",
  });
}

export async function deleteProgrammeAreaAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const id = field(formData, "id");
  const fieldId = field(formData, "fieldId");
  if (!id)
    return backTo(PATH, { error: "That programme field could not be found." });

  const anchor = fieldId ? `?field=${fieldId}` : "";
  let failure: string | null = null;
  try {
    const [used] = await db
      .select({ n: count() })
      .from(trainingSessions)
      .where(eq(trainingSessions.programmeAreaId, id));

    if ((used?.n ?? 0) > 0) {
      failure = `${used?.n} training(s) are filed under this Programme Field. Archive it instead — deleting would orphan their records.`;
    } else {
      await db.transaction(async (tx) => {
        await tx.delete(programmeAreas).where(eq(programmeAreas.id, id));
        await logAudit(
          {
            actor: auth.actor,
            action: "PROGRAMME_AREA_DELETED",
            entity: "programme_area",
            entityId: id,
          },
          tx,
        );
      });
    }
  } catch (error) {
    log.error({ event: "programme_area.delete_failed", err: String(error) });
    failure = failureMessage(
      error,
      "The programme field was not deleted. Try again.",
    );
  }

  if (failure) return backTo(PATH + anchor, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/trainings");
  revalidateTag("taxonomy", "max");
  return backTo(PATH + anchor, { notice: "Programme field deleted." });
}

/* ── Who may author in an area ──────────────────────────────────────────── */

/**
 * Assigns a staff member to one child Programme Field (legacy
 * `programme_areas` row). A parent Programme Area grant can cover several
 * fields, but this action adds only the selected field to the facilitator's
 * scope.
 */
export async function assignAreaFacilitatorAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const areaId = field(formData, "areaId");
  const userId = field(formData, "userId");
  const fieldId = field(formData, "fieldId");
  if (!areaId || !userId)
    return backTo(PATH, { error: "Choose a person and a programme field." });
  const anchor = fieldId ? `?field=${fieldId}` : "";

  let failure: string | null = null;
  try {
    const [person] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!person) {
      failure = "That account no longer exists.";
    } else if (!person.isActive) {
      failure = `${person.fullName}'s account is inactive. Reactivate it before assigning work.`;
    } else if (person.role === "LEARNER") {
      failure =
        "Staff cannot author material. Change their role to facilitator first.";
    } else {
      await db.transaction(async (tx) => {
        await tx
          .insert(areaFacilitators)
          .values({ areaId, userId })
          .onConflictDoNothing({
            target: [areaFacilitators.areaId, areaFacilitators.userId],
          });
        await logAudit(
          {
            actor: auth.actor,
            action: "AREA_FACILITATOR_ASSIGNED",
            entity: "programme_area",
            entityId: areaId,
            metadata: { userId, fullName: person.fullName },
          },
          tx,
        );
      });
    }
  } catch (error) {
    log.error({ event: "area.assign_facilitator_failed", err: String(error) });
    failure = failureMessage(error, "The assignment was not saved. Try again.");
  }

  if (failure) return backTo(PATH + anchor, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/authoring");
  return backTo(PATH + anchor, {
    notice: "Assigned. They can author in this Programme Field now.",
  });
}

export async function unassignAreaFacilitatorAction(
  formData: FormData,
): Promise<void> {
  const auth = await adminGuard();
  if (!auth.ok) return backTo(PATH, { error: auth.message });

  const id = field(formData, "id");
  const fieldId = field(formData, "fieldId");
  if (!id)
    return backTo(PATH, { error: "That assignment could not be found." });
  const anchor = fieldId ? `?field=${fieldId}` : "";

  let failure: string | null = null;
  try {
    await db.transaction(async (tx) => {
      await tx.delete(areaFacilitators).where(eq(areaFacilitators.id, id));
      await logAudit(
        {
          actor: auth.actor,
          action: "AREA_FACILITATOR_REMOVED",
          entity: "programme_area",
          entityId: id,
        },
        tx,
      );
    });
  } catch (error) {
    log.error({
      event: "area.unassign_facilitator_failed",
      err: String(error),
    });
    failure = failureMessage(
      error,
      "The assignment was not removed. Try again.",
    );
  }

  if (failure) return backTo(PATH + anchor, { error: failure });
  revalidatePath(PATH);
  revalidatePath("/authoring");
  return backTo(PATH + anchor, {
    notice: "Assignment removed. Their existing material stays published.",
  });
}
