import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "link-expired": "That link has expired or was already used. Request a new one.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const initialError = params.error ? (ERRORS[params.error] ?? null) : null;

  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Staff sign in</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Welcome back</h1>
        <p className="text-sm leading-relaxed text-ink-muted">Sign in with your GHS staff email and password.</p>
      </div>

      <div className="surface-card p-7 sm:p-8">
        <LoginForm next={next} initialError={initialError} />
      </div>

      <p className="text-center text-xs leading-relaxed text-ink-muted">
        Need access? Ask your facility administrator to add you to the staff directory.
      </p>
    </>
  );
}
