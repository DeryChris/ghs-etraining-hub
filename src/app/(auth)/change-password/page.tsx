import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getSession } from "@/lib/server/session";
import { AuthCard } from "../auth-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choose your password" };

/**
 * The first thing a new account sees.
 *
 * Every staff member is created by ICT with a password derived from their
 * employee number — fine for a first sign-in, useless as a secret. The proxy
 * sends any session carrying `mustChange` straight here, so nothing else in the
 * workspace can be reached until this is done.
 */
export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AuthCard>
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          First sign-in
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {session.name.split(" ")[0]}, set your own password
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          You signed in as <span className="font-semibold text-ink">{session.staffId}</span>. The password you were
          given was created for you, so it has to be replaced before you can use the platform.
        </p>
      </div>

      <div>
        <ChangePasswordForm firstTime />
      </div>

      <details className="rounded-card border border-hairline bg-surface-2/70 p-4">
        <summary className="cursor-pointer text-sm font-bold text-ink">What makes a good password here?</summary>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-muted">
          <li>Three unrelated words are stronger than a word with a number stuck on the end.</li>
          <li>Do not reuse the password from your e-mail or your bank.</li>
          <li>Nobody at GHS will ever ask you for it — not ICT, not your unit head.</li>
        </ul>
      </details>
    </AuthCard>
  );
}
