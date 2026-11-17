import type { Metadata } from "next";
import { Search, ShieldCheck, ShieldX } from "lucide-react";
import { CertificateSeal } from "@/components/brand/illustrations";
import { Reveal } from "@/components/marketing/reveal";
import { buttonClass } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { isCertificateCode } from "@/lib/certificate-code";
import { formatDate, formatCredits } from "@/lib/format";
import { log } from "@/lib/server/logger";
import { verifyCertificate } from "@/lib/server/public-queries";
import { consumeRateLimit, rateLimitKey, retryAfterText } from "@/lib/server/rate-limit";
import { clientAddress } from "@/lib/server/request-context";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description: `Check a ${SITE.name} CPD certificate using its serial code.`,
};

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams;
  const submitted = (params.code ?? "").trim().toUpperCase().slice(0, 60);
  const code = isCertificateCode(submitted) ? submitted : "";

  // Public, unauthenticated lookup: bound how many serials one connection can try
  // so the page cannot be used to harvest holder names. A limiter outage must not
  // take the page down (fail open), and a lookup outage is reported, not thrown.
  const limit = code
    ? await consumeRateLimit(rateLimitKey("verify", await clientAddress()), 20, 5 * 60).catch((error: unknown) => {
        log.error({ event: "certificate.verify_limiter_unavailable", error });
        return null;
      })
    : null;
  const rateLimited = limit !== null && !limit.allowed;
  if (rateLimited) log.warn({ event: "certificate.verify_rate_limited" });

  let result: Awaited<ReturnType<typeof verifyCertificate>> = null;
  let unavailable = false;
  if (code && !rateLimited) {
    try {
      result = await verifyCertificate(code);
    } catch (error) {
      unavailable = true;
      log.error({ event: "certificate.verify_unavailable", error });
    }
  }

  return (
    <>
      <section className="hero-glow relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 sm:px-8 sm:pt-24 lg:px-10">
          <Reveal className="max-w-3xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Verify a certificate</p>
            <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Check that a CPD certificate is genuine.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-ink-muted">
              Enter the serial code exactly as it is printed on the certificate. We show only what is needed to confirm the holder and the
              award.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="verify-form-title" className="mx-auto max-w-7xl px-5 pb-28 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl space-y-8">
          <form action="/verify" method="get" role="search" className="surface-card space-y-5 p-7 sm:p-8">
            <h2 id="verify-form-title" className="text-lg font-bold text-ink">
              Certificate serial code
            </h2>
            <div>
              <label htmlFor="verify-code" className={labelClass}>
                Serial code
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="verify-code"
                  name="code"
                  type="text"
                  defaultValue={code}
                  placeholder="e.g. GHS-CPD-2026-7K3M9QP2X4"
                  autoComplete="off"
                  spellCheck={false}
                  className={`${inputClass} h-12 font-mono tracking-wide`}
                />
                <button type="submit" className={buttonClass({ className: "h-12 shrink-0 rounded-[var(--radius-pill)] px-6" })}>
                  <Search className="h-4 w-4" aria-hidden />
                  Verify
                </button>
              </div>
            </div>
          </form>

          {code && result && (
            <Reveal>
              <article aria-live="polite" className="surface-card overflow-hidden">
                <div className={`flex items-center gap-5 p-7 sm:p-8 ${result.valid ? "bg-primary/8" : "bg-danger/8"}`}>
                  {result.valid ? (
                    <CertificateSeal className="h-20 w-20 shrink-0" />
                  ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger">
                      <ShieldX className="h-8 w-8" aria-hidden />
                    </span>
                  )}
                  <div>
                    <p className={`inline-flex items-center gap-2 text-sm font-bold ${result.valid ? "text-primary" : "text-danger"}`}>
                      {result.valid ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <ShieldX className="h-4 w-4" aria-hidden />}
                      {result.valid ? "Valid certificate" : "Certificate expired or deactivated"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-ink-muted">{result.code}</p>
                  </div>
                </div>
                <dl className="grid gap-6 border-t border-hairline p-7 sm:grid-cols-2 sm:p-8">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Holder</dt>
                    <dd className="mt-1 font-semibold text-ink">{result.holderName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">CPD awarded</dt>
                    <dd className="mt-1 font-semibold text-ink">{formatCredits(result.cpdCreditsX10)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Material</dt>
                    <dd className="mt-1 font-semibold text-ink">{result.title}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Issued</dt>
                    <dd className="mt-1 text-ink">{formatDate(result.issuedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Expires</dt>
                    <dd className="mt-1 text-ink">{result.expiresAt ? formatDate(result.expiresAt) : "Does not expire"}</dd>
                  </div>
                </dl>
              </article>
            </Reveal>
          )}

          {rateLimited && (
            <div role="status" className="surface-card flex flex-col items-center gap-3 p-8 text-center">
              <ShieldX className="h-8 w-8 text-warn" aria-hidden />
              <p className="font-semibold text-ink">Too many checks from this connection.</p>
              <p className="max-w-md text-sm leading-relaxed text-ink-muted">
                To protect staff records, certificate checks are limited. Try again in {retryAfterText(limit?.retryAfterSeconds ?? 60)}.
              </p>
            </div>
          )}

          {unavailable && (
            <div role="alert" className="surface-card flex flex-col items-center gap-3 p-8 text-center">
              <ShieldX className="h-8 w-8 text-warn" aria-hidden />
              <p className="font-semibold text-ink">We could not check that code right now.</p>
              <p className="max-w-md text-sm leading-relaxed text-ink-muted">
                The verification service is temporarily unavailable. No certificate was confirmed or denied. Try again in a few
                minutes.
              </p>
            </div>
          )}

          {code && !result && !rateLimited && !unavailable && (
            <div role="status" className="surface-card flex flex-col items-center gap-3 p-8 text-center">
              <ShieldX className="h-8 w-8 text-danger" aria-hidden />
              <p className="font-semibold text-ink">No certificate matches that code.</p>
              <p className="max-w-md text-sm leading-relaxed text-ink-muted">
                Check the code exactly as printed, including the dashes. If it still does not match, ask the holder to confirm it from their
                transcript.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
