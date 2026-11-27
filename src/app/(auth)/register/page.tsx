import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthCard } from "../auth-card";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Create an account" };
export const dynamic = "force-dynamic";

/**
 * Claim an account for a staff-directory record that already exists.
 *
 * The employee number is checked first; directory facts are shown read-only,
 * followed by the contact details and password the person supplies. The card is
 * wider than the sign-in panel because the directory details use two columns.
 */
export default function RegisterPage() {
  return (
    <AuthCard width="wide">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <BrandMark size={40} />
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink-muted">{SITE.fullName}</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">Create an account</h1>
            <p className="mx-auto max-w-md text-[13px] leading-relaxed text-ink-muted">
              Enter your GHS Staff ID and we check it against the existing staff directory. If the record can be
              claimed, your directory details are shown and you choose a password and contact information.
            </p>
          </div>
        </div>

        <RegisterForm />

        <p className="border-t border-hairline pt-4 text-center text-[12px] leading-relaxed text-ink-muted">
          Staff ID not recognised, or a directory detail is wrong?{" "}
          <Link href="/help/report" className="font-semibold text-primary underline underline-offset-4">
            Lodge a complaint
          </Link>{" "}
          to request a correction.
        </p>
      </div>
    </AuthCard>
  );
}
