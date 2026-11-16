import Link from "next/link";
import { notFound } from "next/navigation";
import { CertificateSeal } from "@/components/brand/illustrations";
import { PrintButton } from "@/components/materials/print-button";
import { buttonClass } from "@/components/ui/button";
import { isCertificateCode } from "@/lib/certificate-code";
import { formatCredits, formatDate } from "@/lib/format";
import { isStaffRole } from "@/lib/viewer";
import { getCertificateAward } from "@/lib/server/learning-queries";
import { requireSession } from "@/lib/server/rbac";
import { displayOrigin } from "@/lib/app-url";

export const dynamic = "force-dynamic";

/**
 * The printable award. A certificate is proof of CPD, so the holder must be able
 * to produce it — the public `/verify` page only ever shows a masked name, which
 * is not enough to print. Holder and staff only.
 */
export default async function CertificateAwardPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await requireSession();
  const { code } = await params;
  const serial = decodeURIComponent(code).trim().toUpperCase();
  if (!isCertificateCode(serial)) notFound();

  const award = await getCertificateAward(serial);
  if (!award) notFound();
  if (award.userId !== session.sub && !isStaffRole(session.role)) notFound();

  const origin = displayOrigin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/analytics" className={buttonClass({ variant: "ghost" })}>
          Back to my CPD
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/verify?code=${serial}`} className={buttonClass({ variant: "secondary" })}>
            Verify this serial
          </Link>
          <PrintButton />
        </div>
      </div>

      <article
        aria-labelledby="award-title"
        className="relative space-y-8 rounded-card border border-hairline bg-surface p-8 shadow-panel sm:p-12 print:border-0 print:shadow-none"
      >
        <header className="flex flex-col items-center gap-3 text-center">
          <CertificateSeal className="h-20 w-auto text-primary" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
            Ghana Health Service · Human Resource Directorate
          </p>
          <h1 id="award-title" className="text-3xl font-extrabold tracking-tight text-ink">
            Certificate of Completion
          </h1>
          <p className="text-sm text-ink-muted">Continuing Professional Development</p>
        </header>

        <div className="space-y-2 text-center">
          <p className="text-sm text-ink-muted">This certifies that</p>
          <p className="text-2xl font-bold text-ink">{award.holderName}</p>
          <p className="text-sm text-ink-muted">
            Staff ID <span className="font-mono text-ink">{award.staffId}</span>
          </p>
        </div>

        <div className="space-y-2 text-center">
          <p className="text-sm text-ink-muted">has completed</p>
          <p className="text-xl font-semibold text-ink">{award.title}</p>
          <p className="text-sm text-ink-muted">
            {award.spaceTitle} · {award.categoryName}
          </p>
        </div>

        <dl className="grid gap-4 border-t border-hairline pt-6 text-sm sm:grid-cols-3">
          <div className="text-center sm:text-left">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">CPD points</dt>
            <dd className="mt-1 font-semibold text-ink">{formatCredits(award.creditsX10)}</dd>
          </div>
          <div className="text-center sm:text-left">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Issued</dt>
            <dd className="mt-1 font-semibold text-ink">{formatDate(award.issuedAt)}</dd>
          </div>
          <div className="text-center sm:text-left">
            <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Recertification</dt>
            <dd className="mt-1 font-semibold text-ink">{award.expiresAt ? formatDate(award.expiresAt) : "Does not expire"}</dd>
          </div>
        </dl>

        {award.expired && (
          <p role="alert" className="rounded-control border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
            This certificate expired on {formatDate(award.expiresAt)}. Complete the material again to renew it.
          </p>
        )}

        <footer className="space-y-2 border-t border-hairline pt-6 text-center">
          <p className="font-mono text-lg tracking-[0.15em] text-ink">{award.code}</p>
          <p className="text-xs text-ink-muted">
            Certificate serial. Anyone can confirm this award at{" "}
            <span className="font-mono text-ink">
              {origin}/verify?code={award.code}
            </span>
          </p>
        </footer>
      </article>

      <p className="text-center text-xs leading-relaxed text-ink-muted print:hidden">
        Use your browser&apos;s print dialogue to save this page as a PDF or print it on A4. The reference on your
        transport and proposals should quote the serial above, not a screenshot.
      </p>
    </div>
  );
}
