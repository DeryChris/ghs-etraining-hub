import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthCard } from "../auth-card";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Create an account" };
export const dynamic = "force-dynamic";

/**
 * Claim an account the staff sheet already describes.
 *
 * One column, the way a form with a paper equivalent is: the employee number
 * first, then the facts HRIMS holds, then the three things only the person knows.
 * The card is wider than the sign-in panel because the HRIMS block is two columns
 * of read-only facts and squeezing them made the form look like a table.
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
              Enter your GHS Staff ID and we verify it against HRIMS. Your name, region, facility and grade are read
              from the sheet — you choose a password and confirm where we can reach you.
            </p>
          </div>
        </div>

        <RegisterForm />

        <p className="border-t border-hairline pt-4 text-center text-[12px] leading-relaxed text-ink-muted">
          Not on the staff sheet, or the number is wrong?{" "}
          <Link href="/help/report" className="font-semibold text-primary underline underline-offset-4">
            Lodge a complaint
          </Link>{" "}
          and it will be corrected.
        </p>
      </div>
    </AuthCard>
  );
}
