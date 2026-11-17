import "server-only";
import { and, eq } from "drizzle-orm";
import { certificates } from "@/db/schema";
import { formatCertificateCode } from "@/lib/certificate-code";
import type { AuditExecutor } from "@/lib/server/audit";

export interface IssueCertificateInput {
  userId: string;
  materialId: string;
  materialVersionId: string;
  cpdCreditsX10: number;
  /** null = the certificate does not expire. */
  recertificationMonths: number | null;
}

export type IssueCertificateResult =
  | { issued: true; code: string }
  | { issued: false; existingCode: string }
  | { issued: false; existingCode: null };

/** Postgres unique-violation, without relying on a cast to a driver-specific type. */
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  return Reflect.get(error, "code") === "23505";
}

/**
 * Issues the CPD certificate for a completed material version — inside the
 * caller's transaction, so a learner never ends up with a completion and no
 * certificate (or the reverse).
 *
 * The serial is random (see src/lib/certificate-code.ts). The database also holds
 * a unique key on (user, material, version), so a repeated completion returns the
 * original serial instead of minting a second one.
 */
export async function issueCertificate(
  tx: AuditExecutor,
  input: IssueCertificateInput,
): Promise<IssueCertificateResult> {
  if (input.cpdCreditsX10 <= 0) return { issued: false, existingCode: null };

  const [existing] = await tx
    .select({ code: certificates.code })
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, input.userId),
        eq(certificates.materialId, input.materialId),
        eq(certificates.materialVersionId, input.materialVersionId),
      ),
    )
    .limit(1);
  if (existing) return { issued: false, existingCode: existing.code };

  const issuedAt = new Date();
  const expiresAt =
    input.recertificationMonths !== null
      ? new Date(Date.UTC(issuedAt.getUTCFullYear(), issuedAt.getUTCMonth() + input.recertificationMonths, issuedAt.getUTCDate()))
      : null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = formatCertificateCode(issuedAt.getUTCFullYear());
    try {
      await tx.insert(certificates).values({
        code,
        userId: input.userId,
        materialId: input.materialId,
        materialVersionId: input.materialVersionId,
        cpdCreditsX10: input.cpdCreditsX10,
        issuedAt,
        expiresAt,
      });
      return { issued: true, code };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Either another request just issued this certificate (the key includes the
      // version) or the random serial collided; re-check, then retry with a new one.
      const [again] = await tx
        .select({ code: certificates.code })
        .from(certificates)
        .where(
          and(
            eq(certificates.userId, input.userId),
            eq(certificates.materialId, input.materialId),
            eq(certificates.materialVersionId, input.materialVersionId),
          ),
        )
        .limit(1);
      if (again) return { issued: false, existingCode: again.code };
    }
  }

  throw new Error("Could not allocate a unique certificate serial after 3 attempts");
}
