import "server-only";
import { unstable_cache } from "next/cache";
import { and, count, eq, sql } from "drizzle-orm";
import { isCertificateCode } from "@/lib/certificate-code";
import { log } from "@/lib/server/logger";
import { db } from "@/db/index";
import { programmeFields, certificates, materials, programmeAreas, users } from "@/db/schema";

/** Aggregate counts only. No individual learner or content detail is exposed. */
export async function getPublicStats(): Promise<{ fields: number; areas: number; materials: number }> {
  const [fieldRows, areaRows, materialRows] = await Promise.all([
    db.select({ n: count() }).from(programmeFields).where(eq(programmeFields.isArchived, false)),
    db.select({ n: count() }).from(programmeAreas).where(eq(programmeAreas.isArchived, false)),
    db
      .select({ n: count() })
      .from(materials)
      .where(and(eq(materials.isPublished, true), eq(materials.state, "PUBLISHED"))),
  ]);
  return {
    fields: fieldRows[0]?.n ?? 0,
    areas: areaRows[0]?.n ?? 0,
    materials: materialRows[0]?.n ?? 0,
  };
}

/**
 * Public counters, cached for five minutes. The marketing site is the only
 * caller, and a stale-by-minutes count is preferable to three aggregates on
 * every visit from a metered mobile connection.
 */
export type PublicStats = { fields: number; areas: number; materials: number };

/**
 * Cached public counters, with a deliberate soft failure: if the database is
 * unreachable the marketing page renders without numbers instead of an error
 * page. The status is still visible to operators via /api/health and the log.
 */
export const getPublicStatsCached = unstable_cache(
  async (): Promise<PublicStats | null> => {
    try {
      return await getPublicStats();
    } catch (error) {
      log.error({ event: "public_stats.unavailable", error });
      return null;
    }
  },
  ["public-stats"],
  { revalidate: 300, tags: ["taxonomy"] },
);

/** "Ama Serwaa Mensah" → "Ama M." Public verification shows the minimum needed to confirm identity. */
function maskHolderName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "GHS staff";
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

export interface CertificateCheck {
  valid: boolean;
  holderName: string;
  title: string;
  cpdCreditsX10: number;
  issuedAt: Date;
  expiresAt: Date | null;
  code: string;
}

/** Looks up a certificate by its public serial. Returns null for unknown codes. */
export async function verifyCertificate(input: string): Promise<CertificateCheck | null> {
  const code = input.trim().toUpperCase();
  if (!isCertificateCode(code)) return null;

  const [row] = await db
    .select({
      id: certificates.id,
      code: certificates.code,
      issuedAt: certificates.issuedAt,
      expiresAt: certificates.expiresAt,
      cpdCreditsX10: certificates.cpdCreditsX10,
      holderName: users.fullName,
      isActive: users.isActive,
      title: materials.title,
    })
    .from(certificates)
    .innerJoin(users, eq(users.id, certificates.userId))
    .innerJoin(materials, eq(materials.id, certificates.materialId))
    .where(eq(certificates.code, code))
    .limit(1);

  if (!row) return null;

  // Verification is an auditable event in itself: record that someone checked.
  // A failure here must never hide a valid certificate, so it is best-effort.
  try {
    await db
      .update(certificates)
      .set({
        verificationCount: sql`${certificates.verificationCount} + 1`,
        lastVerifiedAt: new Date(),
      })
      .where(eq(certificates.id, row.id));
  } catch {
    // Counters are telemetry; the verification result stands either way.
  }

  const expired = row.expiresAt !== null && row.expiresAt.getTime() < Date.now();
  return {
    valid: !expired && row.isActive,
    holderName: maskHolderName(row.holderName),
    title: row.title,
    cpdCreditsX10: row.cpdCreditsX10,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    code: row.code,
  };
}
