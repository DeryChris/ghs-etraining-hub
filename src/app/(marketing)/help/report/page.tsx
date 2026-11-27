import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock, Lock } from "lucide-react";
import { ComplaintForm } from "@/components/help/complaint-form";
import { COMPLAINT_ISSUES, type ComplaintIssue } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Lodge a complaint",
  description: "Tell us what is wrong with your account, your course or your details — no sign-in needed.",
};

/**
 * The form can be opened with a complaint already half-filled: a failed viewer
 * links here with the training and the issue it could not show, so the person
 * picks up where the broken file left off instead of starting from a blank page.
 */
export default async function ReportComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ issue?: string; training?: string; trainingTitle?: string }>;
}) {
  const params = await searchParams;
  const issue = COMPLAINT_ISSUES.find((entry) => entry === params.issue) as ComplaintIssue | undefined;

  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_20rem] lg:px-10">
      <div className="space-y-8">
        <div className="space-y-4">
          <Link
            href="/help"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Complaint Hub
          </Link>
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            Lodge a complaint
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            You do not need to be signed in. The more precisely you describe the problem, the fewer questions come back
            — but do not hold it back until you have every detail.
          </p>
        </div>

        <div className="rounded-card border border-hairline bg-surface p-6 shadow-panel sm:p-8">
          <ComplaintForm
            initial={{
              issue,
              trainingId: params.training ?? null,
              trainingTitle: params.trainingTitle ?? null,
            }}
          />
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-card border border-hairline bg-surface-2/60 p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Lock className="h-4 w-4 text-primary" aria-hidden />
            What we ask for, and why
          </h2>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-muted">
            <li>
              <span className="font-semibold text-ink">Staff ID</span> finds your record, so nobody has to guess who you
              are.
            </li>
            <li>
              <span className="font-semibold text-ink">Email</span> is how the person handling it replies if they need
              more.
            </li>
            <li>
              <span className="font-semibold text-ink">Never your password.</span> Nobody at GHS will ask you for it, and
              we will never ask you to type it here.
            </li>
          </ul>
        </div>
        <div className="rounded-card border border-hairline bg-canvas p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Clock className="h-4 w-4 text-primary" aria-hidden />
            How long it takes
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            Access complaints are answered the same working day where staff are on duty. Course and content complaints
            go to the facilitator for that programme field, so allow a little longer. The status page always shows where
            yours has reached.
          </p>
        </div>
      </aside>
    </section>
  );
}
