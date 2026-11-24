import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StatusLookup } from "@/components/help/status-lookup";

export const metadata: Metadata = {
  title: "Complaint status",
  description: "See whether your complaint is being handled and read the answer given.",
};

export default function ComplaintStatusPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-8 px-5 py-14 sm:px-8 lg:px-10">
      <div className="space-y-4">
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Complaint Hub
        </Link>
        <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
          Check my complaint
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Enter your Staff ID to see every complaint lodged under it — what you asked, where it has reached, and the
          answer that was given.
        </p>
      </div>
      <StatusLookup />
    </section>
  );
}
