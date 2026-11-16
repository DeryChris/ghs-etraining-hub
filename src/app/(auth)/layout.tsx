import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark, Wordmark } from "@/components/brand/brand-mark";

/** Split screen: a brand panel with the flag stripe on desktop, the form beside it. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-[#04120d] lg:block">
        <Image
          src="/images/stock/doctor-portrait.jpg"
          alt=""
          fill
          sizes="50vw"
          priority
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04120d] via-[#04120d]/55 to-[#04120d]/15" aria-hidden />
        <div className="flag-stripe absolute inset-x-0 top-0 h-1.5" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
          <Link href="/" className="inline-flex items-center gap-3 rounded-control focus-visible:outline-2 focus-visible:outline-accent">
            <BrandMark size={44} />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-extrabold tracking-tight"></span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">eLearning Network</span>
            </span>
          </Link>
          <div className="max-w-md space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Ghana Health Service</p>
            <p className="text-3xl font-extrabold leading-tight xl:text-4xl">Clinical knowledge, current and verifiable, in one place.</p>
            <p className="text-sm leading-relaxed text-white/75">
              Protocols, practical training and CPD for every GHS facility, from the teaching hospital to the health centre.
            </p>
          </div>
          <p className="text-xs text-white/60">Internal platform. Access is monitored and recorded.</p>
        </div>
      </aside>

      <div className="flex flex-col justify-center bg-canvas px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="flex items-center justify-between lg:hidden">
            <Link href="/" className="rounded-control focus-visible:outline-2 focus-visible:outline-primary" aria-label="GHS-ELN home">
              <Wordmark size={36} />
            </Link>
          </div>
          {children}
          <p className="text-center text-xs text-ink-muted">
            <Link href="/" className="font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline">
              Back to the GHS-ELN home page
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
