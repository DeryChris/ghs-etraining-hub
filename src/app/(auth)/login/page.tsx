import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginWelcome } from "@/components/auth/login-welcome";
import { AuthSplit } from "../auth-split";
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
    <AuthSplit aside={<LoginWelcome />}>
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Staff access</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Welcome back.</h1>
          <p className="text-sm leading-relaxed text-ink-muted">
            Sign in with your GHS Staff ID or work email and password.
          </p>
        </div>

        <LoginForm next={next} initialError={initialError} />

        <div className="space-y-3 border-t border-hairline pt-4 text-center">
          <p className="text-sm text-ink-muted">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
          <Link
            href="/help"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-control px-3 text-sm font-semibold text-ink-muted underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CircleHelp className="h-4 w-4" aria-hidden />
            Help &amp; Complaint Hub
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </AuthSplit>
  );
}
