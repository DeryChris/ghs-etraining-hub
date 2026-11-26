"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/index";
import { directMessages, users } from "@/db/schema";
import { logAudit } from "@/lib/server/audit";
import { notifyDirectMessage } from "@/lib/server/notify";
import { log } from "@/lib/server/logger";
import { consumeRateLimit, rateLimitKey, retryAfterText } from "@/lib/server/rate-limit";
import { checkCapability } from "@/lib/server/rbac";
import { getSession } from "@/lib/server/session";

export interface MessageActionState {
  ok: boolean;
  message: string | null;
}

const sendInput = z
  .object({
    recipientId: z.string().uuid("Choose a colleague to message."),
    body: z
      .string()
      .trim()
      .min(1, "Write a message before sending.")
      .max(4000, "Messages can be up to 4,000 characters."),
  })
  .strict();

export async function sendMessageAction(
  _previous: MessageActionState,
  formData: FormData,
): Promise<MessageActionState> {
  const guard = await checkCapability("message.send");
  if (!guard.ok) return { ok: false, message: guard.message };
  const { session } = guard;

  const parsed = sendInput.safeParse({ recipientId: formData.get("recipientId"), body: formData.get("body") });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the message and try again." };
  }
  const { recipientId, body } = parsed.data;

  if (recipientId === session.sub) return { ok: false, message: "You cannot send a message to yourself." };

  const limit = await consumeRateLimit(rateLimitKey("message", session.sub), 30, 5 * 60);
  if (!limit.allowed) {
    return { ok: false, message: `You are sending messages very quickly. Try again in ${retryAfterText(limit.retryAfterSeconds)}.` };
  }

  const [recipient] = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1);
  if (!recipient || !recipient.isActive) {
    return { ok: false, message: "That colleague is not available for messages." };
  }

  await db.transaction(async (tx) => {
    const [sent] = await tx
      .insert(directMessages)
      .values({ senderId: session.sub, recipientId, body })
      .returning({ id: directMessages.id });
    if (!sent) throw new Error("Message insert returned no row");

    // The body is never logged; the audit trail records who wrote to whom, and how much.
    await logAudit(
      {
        actor: { sub: session.sub, role: session.role, name: session.name, staffId: session.staffId },
        action: "DIRECT_MESSAGE_SENT",
        entity: "DirectMessage",
        entityId: sent.id,
        metadata: { recipientId, length: body.length },
      },
      tx,
    );
  });

  await notifyDirectMessage({
    recipientId,
    senderName: session.name,
    messageId: recipientId,
    actorId: session.sub,
  });

  log.info({ event: "message.sent", userId: session.sub, role: session.role, recipientId });
  revalidatePath("/messages");
  revalidatePath("/", "layout");
  return { ok: true, message: "Message sent." };
}

/** Marks a conversation read when it is opened. Read-state is not audited (see ADR-0002). */
export async function markThreadReadAction(counterpartId: string): Promise<void> {
  const session = await getSession();
  if (!session) return;
  const parsed = z.string().uuid().safeParse(counterpartId);
  if (!parsed.success) return;

  await db
    .update(directMessages)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(directMessages.senderId, parsed.data),
        eq(directMessages.recipientId, session.sub),
        eq(directMessages.isRead, false),
      ),
    );
  revalidatePath("/", "layout");
}
