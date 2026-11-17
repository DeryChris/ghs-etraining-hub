"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createUserAction, type UserActionState } from "@/lib/server/actions/users";
import { ROLE_LABELS } from "@/lib/labels";

const INITIAL: UserActionState = { ok: false, message: null };

const REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
];

const ROLES = ["LEARNER", "FACILITATOR", "SYSTEM_ADMIN"] as const;

/**
 * Adding a person to the directory. The form is closed until asked for, because
 * the common task on this page is finding someone, not hiring them.
 */
export function CreateUserForm() {
  const [state, formAction] = useActionState(createUserAction, INITIAL);

  return (
    <details className="group rounded-card border border-hairline bg-surface p-5 shadow-panel">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-primary">
        <UserPlus className="h-4 w-4" aria-hidden />
        Add a staff member
        <span className="text-xs font-normal text-ink-muted group-open:hidden">(opens a form)</span>
      </summary>

      <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="new-staffId" className={labelClass}>
            Staff ID
          </label>
          <input id="new-staffId" name="staffId" required placeholder="GHS-000123" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-fullName" className={labelClass}>
            Full name
          </label>
          <input id="new-fullName" name="fullName" required autoComplete="off" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-email" className={labelClass}>
            Work e-mail
          </label>
          <input id="new-email" name="email" type="email" required autoComplete="off" className={inputClass} />
          <p className={hintClass}>The set-password link goes here.</p>
        </div>
        <div>
          <label htmlFor="new-role" className={labelClass}>
            Role
          </label>
          <select id="new-role" name="role" defaultValue="LEARNER" className={inputClass}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="new-region" className={labelClass}>
            Region
          </label>
          <select id="new-region" name="region" defaultValue="" className={inputClass}>
            <option value="">Not recorded</option>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="new-directorate" className={labelClass}>
            Directorate
          </label>
          <input id="new-directorate" name="directorate" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-cadre" className={labelClass}>
            Cadre
          </label>
          <input id="new-cadre" name="cadre" placeholder="Nurse, Midwife, Pharmacist…" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-facility" className={labelClass}>
            Facility
          </label>
          <input id="new-facility" name="facility" className={inputClass} />
        </div>
        <div>
          <label htmlFor="new-phone" className={labelClass}>
            Phone
          </label>
          <input id="new-phone" name="phone" type="tel" className={inputClass} />
        </div>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Adding…">Add to the directory</SubmitButton>
          <Badge variant="outline">Authority comes from this record</Badge>
        </div>

        {state.message && (
          <p
            role="status"
            className={`md:col-span-2 rounded-control border px-4 py-3 text-sm font-medium ${
              state.ok ? "border-primary/30 bg-primary/10 text-primary" : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {state.message}
          </p>
        )}
      </form>
    </details>
  );
}
