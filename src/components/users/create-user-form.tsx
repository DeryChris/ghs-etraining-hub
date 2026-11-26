"use client";

import { useActionState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createUserAction, type UserActionState } from "@/lib/server/actions/users";
import { STAFF_ROLE_HINTS, STAFF_ROLE_LABELS } from "@/lib/labels";
import { STAFF_ROLE_VALUES } from "@/lib/rbac/capabilities";

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

/**
 * Adding a person to the directory.
 *
 * The form is an overlay rather than a panel that unfolds above the table: the
 * common task on this page is finding somebody, and expanding a nine-field form
 * pushed the list the administrator was reading off the screen. Closing the
 * overlay leaves the directory exactly as it was.
 *
 * The employee number is asked for as the payroll list prints it — plain digits.
 */
export function CreateUserForm() {
  const [state, formAction] = useActionState(createUserAction, INITIAL);

  return (
    <Dialog
      size="lg"
      title="Add a staff member"
      description="This record is what grants authority: the role here decides what the person may open, file and sign off."
      trigger={({ open }) => (
        <Button type="button" onClick={open} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4" aria-hidden />
          Add a staff member
        </Button>
      )}
    >
      {({ close }) => (
        <div className="space-y-5">
          {state.ok ? (
            <div className="space-y-4">
              <p role="status" className="flex items-start gap-2 rounded-control border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {state.message}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={close}>
                  Back to the directory
                </Button>
              </div>
            </div>
          ) : (
            <form action={formAction} className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="new-staffId" className={labelClass}>
                  Employee number
                </label>
                <input
                  id="new-staffId"
                  name="staffId"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="2681763"
                  pattern="[0-9]*"
                  className={inputClass}
                />
                <p className={hintClass}>Digits as printed on the payroll list — no letters or dashes.</p>
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
                  {STAFF_ROLE_VALUES.map((role) => (
                    <option key={role} value={role}>
                      {STAFF_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <p className={hintClass}>{STAFF_ROLE_HINTS.LEARNER}</p>
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

              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <SubmitButton pendingLabel="Adding…">Add to the directory</SubmitButton>
                <Button type="button" variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Badge variant="outline">Authority comes from this record</Badge>
              </div>

              {state.message && (
                <p
                  role="alert"
                  className="rounded-control border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-medium text-danger md:col-span-2"
                >
                  {state.message}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </Dialog>
  );
}
