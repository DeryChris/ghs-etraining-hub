import "server-only";
import { createHash } from "crypto";
import { db } from "@/db/index";
import { auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AuditInput {
  actor: { sub: string; role: string; name: string; staffId: string };
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}

const PII_KEYS = /pass|token|secret|otp|phone|email|staffid/i;

function redactMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (PII_KEYS.test(key)) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      redacted[key] = redactMetadata(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export async function computeHash(prevHash: string | null, input: {
  actor: string; action: string; entity: string; entityId: string; metadata?: string | null; createdAt: string; prevHash: string | null;
}): Promise<string> {
  const canonical = JSON.stringify({
    actor: input.actor,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    metadata: input.metadata,
    createdAt: input.createdAt,
    prevHash: input.prevHash,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function logAudit(input: AuditInput): Promise<void> {
  const last = await db
    .select({ hash: auditLogs.hash })
    .from(auditLogs)
    .orderBy(auditLogs.createdAt)
    .limit(1);

  const prevHash = last[0]?.hash ?? null;
  const createdAt = new Date().toISOString();

  const metadata = input.metadata ? redactMetadata(input.metadata) : undefined;

  const hash = await computeHash(prevHash, {
    actor: input.actor.staffId,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    createdAt,
    prevHash,
  });

  await db.insert(auditLogs).values({
    userId: input.actor.sub,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: input.ip,
    userAgent: input.userAgent,
    prevHash,
    hash,
    createdAt: new Date(createdAt),
  });
}

export async function verifyAuditChain(): Promise<{ valid: boolean; breaks: number }> {
  const rows = await db.select().from(auditLogs).orderBy(auditLogs.createdAt);
  let breaks = 0;
  let prevHash: string | null = null;

  for (const row of rows) {
    const expected = await computeHash(prevHash, {
      actor: row.userId ?? "SYSTEM",
      action: row.action,
      entity: row.entity,
      entityId: row.entityId,
      metadata: row.metadata ? JSON.stringify(row.metadata) : null,
      createdAt: row.createdAt.toISOString(),
      prevHash,
    });

    if (row.hash !== expected) breaks++;
    prevHash = row.hash;
  }

  return { valid: breaks === 0, breaks };
}
