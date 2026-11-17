"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { notifications, spaces } from "@/db/schema";
import { notificationTypeLabel } from "@/lib/labels";
import { compactAudience } from "@/lib/notification-audience";
import { field } from "@/lib/schemas/authoring";
import { logAudit } from "@/lib/server/audit";
import { log } from "@/lib/server/logger";
import { checkCapability } from "@/lib/server/rbac";

const NOTICE_TYPES = [
  "SYSTEM_MAINTENANCE",
  "MATERIAL_UPDATE",
  "SPACE_ANNOUNCEMENT",
] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export interface NoticeActionState {
  ok: boolean;
  message: string | null;
}

const noticeInput = z
  .object({
    scope: z.enum(["SPACE", "ALL"]),
    spaceId: z.string().uuid().optional(),
    title: z.string().trim().min(5, "Give the notice a title of at least 5 characters.").max(160),
    body: z.string().trim().min(10, "Write at least a sentence so people know what to do.").max(2000),
    type: z.enum(NOTICE_TYPES),
    priority: z.enum(PRIORITIES).default("MEDIUM"),
    expiresInDays: z.number().int().min(0).max(365).optional(),
  })
  .strict();

/**
 * Publishes an official notice. A space announcement reaches the cohort that can
 * see that space (its `audience_*` columns become the notice's
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
    scope: field(formData, "scope") ?? "SPACE",
    spaceId: field(formData, "spaceId") || undefined,
    title: field(formData, "title"),
    body: field(formData, "body"),
    type: field(formData, "type") ?? "SPACE_ANNOUNCEMENT",
    priority: field(formData, "priority") ?? "MEDIUM",
    expiresInDays: expiresRaw ? Number.parseInt(expiresRaw, 10) : undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the notice and try again." };

  const { scope, spaceId, title, body, type, priority, expiresInDays } = parsed.data;

  let categoryId: string | undefined;
  let audienceFilter: ReturnType<typeof compactAudience> = null;
  let linkUrl: string | null = null;

  if (scope === "SPACE") {
    if (!spaceId) return { ok: false, message: "Choose the space the notice belongs to." };

    const [space] = await db
      .select({
        id: spaces.id,
        slug: spaces.slug,
        title: spaces.title,
        categoryId: spaces.categoryId,
        audienceRegion: spaces.audienceRegion,
        audienceDirectorate: spaces.audienceDirectorate,
        audienceCadre: spaces.audienceCadre,
      })
      .from(spaces)
      .where(eq(spaces.id, spaceId))
      .limit(1);
    if (!space) return { ok: false, message: "That space no longer exists." };

    categoryId = space.categoryId;
    audienceFilter = compactAudience({
      region: space.audienceRegion,
      directorate: space.audienceDirectorate,
      cadre: space.audienceCadre,
    });
    linkUrl = `/spaces/${space.slug}`;
  }

  const guard = await checkCapability("notification.broadcast", { categoryId });
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
          metadata: { scope, spaceId: spaceId ?? null, audienceFilter, type },
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
    message: `Sent as “${notificationTypeLabel(type)}”. ${scope === "ALL" ? "Everyone will see it." : "The space's cohort will see it."}`,
  };
}
