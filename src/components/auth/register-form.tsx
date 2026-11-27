"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, Loader2, Lock, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import {
  registerAction,
  verifyStaffIdAction,
  type RegistrationState,
} from "@/lib/server/actions/registration";

const EMPTY: RegistrationState = { error: null };

/**
 * Create an account, in the two steps the sheet allows.
 *
 * Step one is a single field — the employee number — because that is the only
 * thing a person has to know that the system does not. Everything after it is
 * read back from HRIMS and shown as disabled inputs: the name, region, district,
 * facility and grade are facts, not questions, and a form that asks for them is a
 * form that gets them wrong.
 *
 * Step two is what the sheet cannot know: where to reach you, and a password of
 * your own. The employee number travels in a hidden field, but the server looks it
 * up again rather than trusting what the page sends back.
 */
export function RegisterForm() {
  const [verifyState, verifyStaffId, verifying] = useActionState(verifyStaffIdAction, EMPTY);
  const [registerState, register, registering] = useActionState(registerAction, EMPTY);
  /*
   * "Use a different staff ID" simply puts the verified state aside: holding the
   * dismissed object is enough, because a fresh verification arrives as a new
   * object. No effect and no second source of truth.
   */
  const [dismissed, setDismissed] = useState<RegistrationState | null>(null);
  const person = verifyState.person && verifyState !== dismissed ? verifyState.person : undefined;
  const error = person ? registerState.error : verifyState.error;

  if (person) {
    return (
      <form action={register} className="space-y-5">
        <input type="hidden" name="staffId" value={person.staffId} />

        {error && (
          <div role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3 rounded-control border border-primary/25 bg-primary/[0.06] px-4 py-3">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink">
            <span className="font-semibold">Verified.</span> {person.fullName}. These details come from HRIMS; if
            something is wrong, lodge a complaint and it is corrected on the sheet.
          </p>
        </div>

        <Field label="Full name (from HRIMS)">
          <input value={person.fullName} readOnly disabled className={`${inputClass} h-11 bg-surface-2`} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Region (from HRIMS)">
            <input value={person.region ?? "—"} readOnly disabled className={`${inputClass} h-11 bg-surface-2`} />
          </Field>
          <Field label="District (from HRIMS)">
            <input value={person.district ?? "—"} readOnly disabled className={`${inputClass} h-11 bg-surface-2`} />
          </Field>
          <Field label="Facility (from HRIMS)">
            <input value={person.facility ?? "—"} readOnly disabled className={`${inputClass} h-11 bg-surface-2`} />
          </Field>
          <Field label="Grade (from HRIMS)">
            <input value={person.grade ?? "—"} readOnly disabled className={`${inputClass} h-11 bg-surface-2`} />
          </Field>
        </div>

        <Field label="E-mail" required>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={registerState.email ?? ""}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" required>
            <input
              id="register-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="+233…"
              defaultValue={registerState.phone ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Alt. phone (optional)">
            <input
              id="register-alt-phone"
              name="altPhone"
              type="tel"
              inputMode="tel"
              placeholder="+233…"
              defaultValue={registerState.altPhone ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" required>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              aria-describedby="register-password-hint"
              className={inputClass}
            />
          </Field>
          <Field label="Confirm password" required>
            <input
              id="register-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              className={inputClass}
            />
          </Field>
        </div>
        <p id="register-password-hint" className="-mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          At least 10 characters. You will not be asked again.
        </p>

        <Button type="submit" className="h-12 w-full rounded-[var(--radius-pill)] text-[15px]" disabled={registering} aria-busy={registering}>
          {registering ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
          {registering ? "Creating your account…" : "Create account"}
        </Button>

        <div className="flex items-center justify-between gap-3 text-[13px]">
          <button
            type="button"
            onClick={() => setDismissed(verifyState)}
            className="inline-flex items-center gap-1.5 font-semibold text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Use a different staff ID
          </button>
          <Link href="/login" className="font-semibold text-primary underline underline-offset-4">
            Already have an account?
          </Link>
        </div>
      </form>
    );
  }

  return (
    <form action={verifyStaffId} className="space-y-5">
      {error && (
        <div role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-relaxed text-danger">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="register-staff-id" className={labelClass}>
          GHS Staff ID
        </label>
        <input
          id="register-staff-id"
          name="staffId"
          type="text"
          inputMode="numeric"
          autoComplete="username"
          required
          placeholder="e.g. 2681763"
          aria-describedby="register-staff-id-hint"
          className={`${inputClass} h-12`}
        />
        <p id="register-staff-id-hint" className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
          The digits on your GHS staff card or payslip. We check them against the staff sheet before anything else is
          asked.
        </p>
      </div>

      <Button type="submit" className="h-12 w-full rounded-[var(--radius-pill)] text-[15px]" disabled={verifying} aria-busy={verifying}>
        {verifying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <BadgeCheck className="h-4 w-4" aria-hidden />}
        {verifying ? "Checking the staff sheet…" : "Verify my staff ID"}
      </Button>

      <p className="text-center text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={labelClass}>
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
    </div>
  );
}
