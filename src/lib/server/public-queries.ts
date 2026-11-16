import "server-only";
import { unstable_cache } from "next/cache";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db/index";
import { categories, certificates, materials, spaces, users } from "@/db/schema";

/** Aggregate counts only. No individual learner or content detail is exposed. */
export async function getPublicStats(): Promise<{ directorates: number; spaces: number; materials: number }> {
  const [directorateRows, spaceRows, materialRows] = await Promise.all([
    db.select({ n: count() }).from(categories).where(eq(categories.isArchived, false)),
    db.select({ n: count() }).from(spaces).where(eq(spaces.isArchived, false)),
    db
      .select({ n: count() })
      .from(materials)
      .where(and(eq(materials.isPublished, true), eq(materials.state, "PUBLISHED"))),
  ]);
  return {
    directorates: directorateRows[0]?.n ?? 0,
    spaces: spaceRows[0]?.n ?? 0,
    materials: materialRows[0]?.n ?? 0,
  };
}

/**
 * Public counters, cached for five minutes. The marketing site is the only
 * caller, and a stale-by-minutes count is preferable to three aggregates on
 * every visit from a metered mobile connection.
 */
export const getPublicStatsCached = unstable_cache(getPublicStats, ["public-stats"], {
  revalidate: 300,
  tags: ["taxonomy"],
});

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
export async function verifyCertificate(code: string): Promise<CertificateCheck | null> {
  const [row] = await db
    .select({
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
