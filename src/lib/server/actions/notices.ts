"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { notifications, programmeAreas, programmeFields } from "@/db/schema";
import { notificationTypeLabel } from "@/lib/labels";
import { areaHref } from "@/lib/links";
import { compactAudience } from "@/lib/notification-audience";
import { field } from "@/lib/schemas/authoring";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";

// What a person can choose when writing a notice. The first three are the events
// this service produces; "material update" and "system maintenance" are the
// manual ones an administrator sends when something changes by hand.
const NOTICE_TYPES = ["TRAINING_PUBLISHED", "MATERIAL_UPDATE", "SYSTEM_MAINTENANCE"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export interface NoticeActionState {
  ok: boolean;
  message: string | null;
}

const noticeInput = z
  .object({
    scope: z.enum(["AREA", "ALL"]),
    areaId: z.string().uuid().optional(),
    title: z.string().trim().min(5, "Give the notice a title of at least 5 characters.").max(160),
    body: z.string().trim().min(10, "Write at least a sentence so people know what to do.").max(2000),
    type: z.enum(NOTICE_TYPES),
    priority: z.enum(PRIORITIES).default("MEDIUM"),
    expiresInDays: z.number().int().min(0).max(365).optional(),
  })
  .strict();

/**
 * Publishes an official notice. An area announcement reaches the cohort that can
 * see that programme field (its `audience_*` columns become the notice's
 * `audience_filter`); only a SYSTEM_ADMIN may address everyone. Both paths are
 * capability-checked and audited — a notice is an instruction to staff, so the
 * record of who sent it matters.
 */
export async function broadcastNoticeAction(
  _previous: NoticeActionState,
  formData: FormData,
): Promise<NoticeActionState> {
  const expiresRaw = field(formData, "expiresInDays");
  const parsed = noticeInput.safeParse({
    scope: field(formData, "scope") ?? "AREA",
    areaId: field(formData, "areaId") || undefined,
    title: field(formData, "title"),
    body: field(formData, "body"),
    type: field(formData, "type") ?? "SYSTEM_MAINTENANCE",
    priority: field(formData, "priority") ?? "MEDIUM",
    expiresInDays: expiresRaw ? Number.parseInt(expiresRaw, 10) : undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the notice and try again." };

  const { scope, areaId, title, body, type, priority, expiresInDays } = parsed.data;

  let areaIdForScope: string | undefined;
  let audienceFilter: ReturnType<typeof compactAudience> = null;
  let linkUrl: string | null = null;

  if (scope === "AREA") {
    if (!areaId) return { ok: false, message: "Choose the programme field the notice belongs to." };

    const [area] = await db
      .select({
        id: programmeAreas.id,
        code: programmeAreas.code,
        name: programmeAreas.name,
        fieldId: programmeAreas.fieldId,
        audienceRegion: programmeAreas.audienceRegion,
        audienceDirectorate: programmeAreas.audienceDirectorate,
        audienceGrade: programmeAreas.audienceGrade,
        fieldCode: programmeFields.code,
      })
      .from(programmeAreas)
      .innerJoin(programmeFields, eq(programmeFields.id, programmeAreas.fieldId))
      .where(eq(programmeAreas.id, areaId))
      .limit(1);
    if (!area) return { ok: false, message: "That programme field no longer exists." };

    areaIdForScope = area.id;
    audienceFilter = compactAudience({
      region: area.audienceRegion,
      directorate: area.audienceDirectorate,
      grade: area.audienceGrade,
    });
    linkUrl = areaHref(area.fieldCode, area.code);
  }

  const guard = await checkCapability("notification.broadcast", { areaId: areaIdForScope });
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  if (scope === "ALL" && session.role !== "SYSTEM_ADMIN") {
    return { ok: false, message: "Only a system administrator can send a notice to everyone." };
  }

  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null;

  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(notifications)
        .values({
          title,
          body,
          type,
          priority,
          audience: "ALL",
          audienceFilter,
          linkUrl,
          expiresAt,
        })
        .returning({ id: notifications.id });

      await logAudit(
        {
          actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
          action: "NOTIFICATION_BROADCAST",
          entity: "notification",
          entityId: row.id,
          metadata: { scope, areaId: areaIdForScope ?? null, audienceFilter, type },
        },
        tx,
      );
    });
  } catch (error) {
    log.error({ event: "notice.broadcast_failed", err: String(error) });
    return { ok: false, message: "The notice was not sent. Try again in a moment." };
  }

  log.info({ event: "notice.broadcast", userId: session.sub, role: session.role, scope, type });
  revalidatePath("/", "layout");
  revalidatePath("/notifications");
  revalidatePath("/notices");

  return {
    ok: true,
    message: `Sent as “${notificationTypeLabel(type)}”. ${scope === "ALL" ? "Everyone will see it." : "That training's cohort will see it."}`,
  };
}
