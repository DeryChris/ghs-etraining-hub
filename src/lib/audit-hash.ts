/**
 * Pure audit-chain primitives: no database, no server-only imports, so the
 * hashing rules can be unit-tested and reused by the chain verifier.
 *
 * Each entry's hash covers the previous entry's hash, so editing or deleting
 * any row breaks every hash after it. That is the tamper evidence.
 */
import { createHash } from "node:crypto";

const PII_KEY = /pass|token|secret|otp|phone|email|staffid/i;

function redactValue(key: string, value: unknown): unknown {
  if (PII_KEY.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redactValue("", item));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactValue(k, v)]));
  }
  return value;
}

/** Removes personal identifiers before metadata is stored or hashed. */
export function redactMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return redactValue("", metadata) as Record<string, unknown>;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(source).sort().map((k) => [k, sortKeys(source[k])]));
  }
  return value;
}

/** Key-sorted JSON, so the same logical object always produces the same hash. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

export interface AuditHashInput {
  prevHash: string | null;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string; // ISO-8601 with millisecond precision
}

export function computeAuditHash(input: AuditHashInput): string {
  const canonical = canonicalJson([
    input.prevHash,
    input.actorId,
    input.action,
    input.entity,
    input.entityId,
    input.metadata,
    input.createdAt,
  ]);
  return createHash("sha256").update(canonical).digest("hex");
}
