import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { verifyPasswordResetToken } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Choose a new password" };

/**
 * Where a one-time reset link lands. The token is checked on the server before
 * the form is drawn, so an expired or already-used link says so straight away
 * instead of accepting a password that will never be applied.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Three outcomes, three different sentences. "We could not check it" is not
  // the same news as "this link is dead": telling somebody their link expired
  // when the database was simply unreachable sends them to ask for a new one
  // that will not work either.
  let status: "ok" | "invalid" | "unavailable" = "invalid";
  if (token) {
    try {
      status = (await verifyPasswordResetToken(token)).ok ? "ok" : "invalid";
    } catch {
      status = "unavailable";
    }
  }

  if (status === "unavailable") {
    return (
      <>
        <div className="space-y-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warn/12 text-warn">
            <KeyRound className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">We cannot check this link</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            The server could not reach the staff directory just now, so your link was neither accepted nor used. Try
            again in a minute — the link itself is still valid for an hour from when it was issued.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
          <Link href="/help/report" className="font-semibold text-primary underline-offset-4 hover:underline">
            Lodge a complaint
          </Link>
        </div>
      </>
    );
  }

  if (status !== "ok") {
    return (
      <>
        <div className="space-y-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warn/12 text-warn">
            <KeyRound className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">This link has expired</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            Reset links work once and expire after an hour. Ask your administrator for a fresh one — nothing about your
            account has changed.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/forgot-password" className="font-semibold text-primary underline-offset-4 hover:underline">
            How to get a new link
          </Link>
          <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary">
          <KeyRound className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Choose a new password</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Use at least 10 characters. A short phrase you can remember works well.
        </p>
      </div>

      <ResetPasswordForm token={token ?? ""} />
    </>
  );
}
