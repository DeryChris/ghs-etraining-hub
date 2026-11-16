import "server-only";
import { asc, desc, sql } from "drizzle-orm";
import { db } from "@/db/index";
import { auditLogs } from "@/db/schema";
import { computeAuditHash, redactMetadata } from "@/lib/audit-hash";
import { requestContext } from "@/lib/server/request-context";

export interface AuditActor {
  sub: string;
  role: string;
  name: string;
  staffId: string;
}

export interface AuditInput {
  actor: AuditActor;
  action: string; // SCREAMING_SNAKE, past tense: "MATERIAL_COMPLETED"
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/** A database handle or an open transaction. */
export type AuditExecutor = Pick<typeof db, "execute" | "insert" | "select">;

/** Constant key for pg_advisory_xact_lock: one writer extends the chain at a time. */
const CHAIN_LOCK_KEY = 74201;

async function appendEntry(exec: AuditExecutor, input: AuditInput): Promise<void> {
  // Serialise writers, then read the *newest* entry (the previous version read the oldest).
  await exec.execute(sql`select pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`);
  const [latest] = await exec
    .select({ hash: auditLogs.hash, createdAt: auditLogs.createdAt })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);

  // Strictly increasing timestamps keep "latest" unambiguous within one millisecond.
  const now = Date.now();
  const createdAtMs = latest && latest.createdAt.getTime() >= now ? latest.createdAt.getTime() + 1 : now;
  const createdAt = new Date(createdAtMs);

  const prevHash = latest?.hash ?? null;
  const metadata = input.metadata ? redactMetadata(input.metadata) : null;
  const hash = computeAuditHash({
    prevHash,
    actorId: input.actor.sub,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    metadata,
    createdAt: createdAt.toISOString(),
  });

  const context = await requestContext();
  await exec.insert(auditLogs).values({
    userId: input.actor.sub,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    metadata,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    prevHash,
    hash,
    createdAt,
  });
}

/**
 * Appends one tamper-evident entry. Pass the caller's transaction as `tx` so the
 * audit row commits or rolls back together with the change it describes.
 */
export async function logAudit(input: AuditInput, tx?: AuditExecutor): Promise<void> {
  if (tx) {
    await appendEntry(tx, input);
    return;
  }
  await db.transaction((t) => appendEntry(t, input));
}

/** Recomputes the whole chain. Any mismatch means a row was edited or removed. */
export async function verifyAuditChain(): Promise<{ valid: boolean; checked: number; breaks: number }> {
  const rows = await db.select().from(auditLogs).orderBy(asc(auditLogs.createdAt));
  let prevHash: string | null = null;
  let breaks = 0;

  for (const row of rows) {
    const expected = computeAuditHash({
      prevHash,
      actorId: row.userId ?? "SYSTEM",
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt.toISOString(),
    });
    if (row.hash !== expected || row.prevHash !== prevHash) breaks++;
    prevHash = row.hash;
  }

  return { valid: breaks === 0, checked: rows.length, breaks };
}
