import "server-only";
import { and, asc, count, desc, eq, inArray, lt, ne, or } from "drizzle-orm";
import { db } from "@/db/index";
import { directMessages, users } from "@/db/schema";

export const MAX_CONVERSATIONS = 50;
export const THREAD_PAGE_SIZE = 50;

export interface ConversationSummary {
  counterpartId: string;
  counterpartName: string;
  counterpartRole: string;
  facility: string | null;
  lastBody: string;
  lastAt: Date;
  unread: number;
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const messages = await db
    .select({
      senderId: directMessages.senderId,
      recipientId: directMessages.recipientId,
      body: directMessages.body,
      isRead: directMessages.isRead,
      createdAt: directMessages.createdAt,
    })
    .from(directMessages)
    .where(or(eq(directMessages.senderId, userId), eq(directMessages.recipientId, userId)))
    .orderBy(desc(directMessages.createdAt))
    // The inbox is a recency list, not an archive: the newest 300 messages cover
    // far more threads than the 50 shown, and both sides of the thread are indexed.
    .limit(300);

  const counterpartIds = [...new Set(messages.map((m) => (m.senderId === userId ? m.recipientId : m.senderId)))];
  if (counterpartIds.length === 0) return [];

  const people = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, facility: users.facility })
    .from(users)
    .where(inArray(users.id, counterpartIds));
  const byId = new Map(people.map((p) => [p.id, p]));

  // Messages arrive newest-first, so insertion order is recency order.
  const summaries = new Map<string, ConversationSummary>();
  for (const m of messages) {
    const counterpartId = m.senderId === userId ? m.recipientId : m.senderId;
    const person = byId.get(counterpartId);
    if (!person) continue;
    const unreadHere = m.recipientId === userId && !m.isRead ? 1 : 0;
    const existing = summaries.get(counterpartId);
    if (existing) {
      existing.unread += unreadHere;
      continue;
    }
    summaries.set(counterpartId, {
      counterpartId,
      counterpartName: person.fullName,
      counterpartRole: person.role,
      facility: person.facility,
      lastBody: m.body,
      lastAt: m.createdAt,
      unread: unreadHere,
    });
  }
  return [...summaries.values()].slice(0, MAX_CONVERSATIONS);
}

/**
 * The newest page of a conversation. `before` walks backwards through history so
 * a long thread is never sent in one response; the page is rendered oldest-first.
 */
export async function getThread(userId: string, counterpartId: string, options: { before?: Date } = {}) {
  const [person] = await db
    .select({ id: users.id, fullName: users.fullName, role: users.role, facility: users.facility, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, counterpartId))
    .limit(1);
  if (!person) return null;

  const rows = await db
    .select({
      id: directMessages.id,
      senderId: directMessages.senderId,
      body: directMessages.body,
      isRead: directMessages.isRead,
      createdAt: directMessages.createdAt,
    })
    .from(directMessages)
    .where(
      and(
        or(
          and(eq(directMessages.senderId, userId), eq(directMessages.recipientId, counterpartId)),
          and(eq(directMessages.senderId, counterpartId), eq(directMessages.recipientId, userId)),
        ),
        options.before ? lt(directMessages.createdAt, options.before) : undefined,
      ),
    )
    .orderBy(desc(directMessages.createdAt))
    .limit(THREAD_PAGE_SIZE + 1);

  const hasMore = rows.length > THREAD_PAGE_SIZE;
  const messages = rows.slice(0, THREAD_PAGE_SIZE).reverse();
  return {
    counterpart: person,
    messages,
    hasMore,
    oldestAt: messages[0]?.createdAt ?? null,
  };
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(directMessages)
    .where(and(eq(directMessages.recipientId, userId), eq(directMessages.isRead, false)));
  return row?.n ?? 0;
}

/** Active colleagues the user may message (everyone except themselves). */
export async function listDirectory(excludeUserId: string) {
  return db
    .select({ id: users.id, fullName: users.fullName, role: users.role, facility: users.facility })
    .from(users)
    .where(and(eq(users.isActive, true), ne(users.id, excludeUserId)))
    .orderBy(asc(users.fullName))
    .limit(300);
}
