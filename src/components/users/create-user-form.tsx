"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { FormSteps } from "@/components/ui/form-steps";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { createUserAction, type UserActionState } from "@/lib/server/actions/users";
import { STAFF_ROLE_HINTS, STAFF_ROLE_LABELS } from "@/lib/labels";
import { STAFF_ROLE_VALUES, type StaffRole } from "@/lib/rbac/capabilities";
import { GHS_REGIONS, isLiveRegion } from "@/lib/ghs-constants";

const INITIAL: UserActionState = { ok: false, message: null };

/**
 * Only the regions the platform actually serves are offered.
 *
 * The library serves the Upper West Region; listing the rest in a dropdown
 * invites people to file a person, a training or a facility against a region the
 * service does not cover. `LIVE_REGION.codes` is the single switch — the list is
 * filtered by it, so every form that uses this stays in step.
 */
const REGIONS: readonly string[] = GHS_REGIONS.filter((name) => isLiveRegion(null, name));

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
export function CreateUserForm({ roles = STAFF_ROLE_VALUES }: { roles?: readonly StaffRole[] } = {}) {
  const [state, formAction, pending] = useActionState(createUserAction, INITIAL);
  const [role, setRole] = useState<StaffRole>("LEARNER");

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
            <form action={formAction} noValidate className="space-y-4">
              <FormSteps
                steps={[
                  { title: "Who they are", blurb: "the three things the directory cannot do without." },
                  { title: "Posting and role", blurb: "where they work, and what they may do here." },
                ]}
                panels={[
                  <div key="identity" className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="new-fullName" className={labelClass}>
                        Full name <span className="text-danger">*</span>
                      </label>
                      <input
                        id="new-fullName"
                        name="fullName"
                        required
                        autoComplete="off"
                        placeholder="e.g. Ama Mensah"
                        className={inputClass}
                      />
                      <p className={hintClass}>As it appears on the payroll list — this is what colleagues will see.</p>
                    </div>
                    <div>
                      <label htmlFor="new-staffId" className={labelClass}>
                        Employee number <span className="text-danger">*</span>
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
                      <p className={hintClass}>Digits only, as printed on the payroll list. They sign in with these.</p>
                    </div>
                    <div>
                      <label htmlFor="new-phone" className={labelClass}>
                        Phone <span className="font-normal text-ink-muted">(optional)</span>
                      </label>
                      <input id="new-phone" name="phone" type="tel" placeholder="024 000 0000" className={inputClass} />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="new-email" className={labelClass}>
                        Work e-mail <span className="text-danger">*</span>
                      </label>
                      <input
                        id="new-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="off"
                        placeholder="ama.mensah@ghs.gov.gh"
                        className={inputClass}
                      />
                      <p className={hintClass}>Used for the password link. It must belong to this person alone.</p>
                    </div>
                  </div>,

                  <div key="posting" className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label htmlFor="new-role" className={labelClass}>
                        Role
                      </label>
                      <Select
                        id="new-role"
                        name="role"
                        value={role}
                        options={roles.map((option) => ({
                          value: option,
                          label: STAFF_ROLE_LABELS[option],
                          hint: STAFF_ROLE_HINTS[option],
                        }))}
                        onChange={(next) => setRole(next as StaffRole)}
                      />
                      <p className={hintClass}>{STAFF_ROLE_HINTS[role]}</p>
                    </div>
                    <div>
                      <label htmlFor="new-region" className={labelClass}>
                        Region
                      </label>
                      <Select
                        id="new-region"
                        name="region"
                        defaultValue=""
                        placeholder="Not recorded"
                        options={[
                          { value: "", label: "Not recorded" },
                          ...REGIONS.map((region) => ({ value: region, label: region })),
                        ]}
                      />
                      <p className={hintClass}>Only regions where the library is live are listed.</p>
                    </div>
                    <div>
                      <label htmlFor="new-directorate" className={labelClass}>
                        Directorate
                      </label>
                      <input id="new-directorate" name="directorate" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="new-grade" className={labelClass}>
                        Grade
                      </label>
                      <input id="new-grade" name="grade" placeholder="Nurse, Midwife, Pharmacist…" className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor="new-facility" className={labelClass}>
                        Facility
                      </label>
                      <input id="new-facility" name="facility" className={inputClass} />
                    </div>
                  </div>,
                ]}
                footer={
                  <div className="flex flex-wrap items-center gap-3">
                    <SubmitButton pendingLabel="Adding…">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      Add to the directory
                    </SubmitButton>
                    <Button type="button" variant="ghost" size="sm" onClick={close}>
                      Cancel
                    </Button>
                  </div>
                }
              />

              <FormFeedback
                state={state}
                pending={pending}
                pendingMessage="Adding them to the directory…"
              />
            </form>
          )}
        </div>
      )}
    </Dialog>
  );
}
