"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Settings2, UserPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { hintClass, inputClass, labelClass } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { STAFF_ROLE_HINTS, STAFF_ROLE_LABELS } from "@/lib/labels";
import { staffRoleOf, STAFF_ROLE_VALUES, type Role } from "@/lib/rbac/capabilities";
import {
  changeUserRoleAction,
  resetUserPasswordAction,
  sendPasswordResetAction,
  setUserAccessAction,
  setUserActiveAction,
  updateUserDetailsAction,
  type CredentialState,
  type UserActionState,
} from "@/lib/server/actions/users";

const INITIAL: UserActionState = { ok: false, message: null };
const INITIAL_CREDENTIALS: CredentialState = { ok: false, message: null };

export interface FieldOption {
  id: string;
  name: string;
  areas: { id: string; name: string }[];
}

function Result({ state }: { state: UserActionState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={state.ok ? "text-sm font-medium text-primary" : "text-sm font-medium text-danger"}>
      {state.message}
    </p>
  );
}

/**
 * Everything an administrator may do to somebody else's account, in overlays
 * rather than on pages of their own. The row keeps its place in the table, so
 * a reset does not lose the administrator's context in a list of twelve people.
 *
 * The server refuses the same operations independently — `isSelf` only explains
 * why the buttons are absent.
 */
export function UserRowActions({
  userId,
  fullName,
  email,
  role,
  region,
  grade,
  facility,
  isActive,
  isUnitHead,
  isSelf,
  fields,
  grants,
}: {
  userId: string;
  fullName: string;
  email: string | null;
  role: Role;
  region: string | null;
  grade: string | null;
  facility: string | null;
  isActive: boolean;
  isUnitHead: boolean;
  isSelf: boolean;
  fields: FieldOption[];
  grants: { fieldIds: string[]; areaIds: string[] };
}) {
  if (isSelf) {
    return (
      <div className="space-y-1">
        <Badge variant="outline">This is you</Badge>
        <p className={hintClass}>Another administrator must change your role or close your account.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ResetPasswordDialog userId={userId} fullName={fullName} />

      {role !== "LEARNER" && <AccessDialog userId={userId} fullName={fullName} fields={fields} grants={grants} />}

      <DetailsDialog
        userId={userId}
        fullName={fullName}
        email={email ?? ""}
        role={role}
        isUnitHead={isUnitHead}
        region={region}
        grade={grade}
        facility={facility}
      />

      <ActiveToggle userId={userId} isActive={isActive} fullName={fullName} />
    </div>
  );
}

/* ── Password ──────────────────────────────────────────────────────────────── */

function ResetPasswordDialog({ userId, fullName }: { userId: string; fullName: string }) {
  const [state, formAction, pending] = useActionState<CredentialState, FormData>(resetUserPasswordAction, INITIAL_CREDENTIALS);
  const [resetState, resetAction] = useActionState<UserActionState, FormData>(sendPasswordResetAction, INITIAL);
  const [copied, setCopied] = useState(false);

  return (
    <Dialog
      size="sm"
      title="Reset password"
      description={`Set a temporary password for ${fullName}. Their open sessions are signed out.`}
      trigger={({ open }) => (
        <Button type="button" size="sm" variant="ghost" onClick={open} aria-label={`Reset password for ${fullName}`}>
          <KeyRound className="h-4 w-4" aria-hidden />
          Password
        </Button>
      )}
    >
      <div className="space-y-5">
        {!state.credentials ? (
          <form action={formAction} data-draft={`reset-password-${userId}`} className="space-y-3">
            <input type="hidden" name="userId" value={userId} />
            <p className="text-sm leading-relaxed text-ink-muted">
              Generates a random password and clears any lockout. You read it once, here, and hand it over — nothing is
              e-mailed and nothing is stored in readable form.
            </p>
            <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {pending ? "Resetting…" : "Set a temporary password"}
            </Button>
            {state.message && !state.ok && (
              <p role="alert" className="text-sm text-danger">
                {state.message}
              </p>
            )}
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-control border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">New credentials</p>
              <dl className="mt-2 space-y-1 font-mono text-sm text-ink">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-ink-muted">e-mail</dt>
                  <dd className="break-all">{state.credentials.email}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-ink-muted">password</dt>
                  <dd className="break-all font-semibold">{state.credentials.password}</dd>
                </div>
              </dl>
            </div>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={async () => {
                await navigator.clipboard?.writeText(
                  `GHS Training Library\n${state.credentials?.email}\nPassword: ${state.credentials?.password}`,
                );
                setCopied(true);
              }}
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? "Copied" : "Copy details"}
            </Button>
            <p className="text-xs text-ink-muted">
              This password is not shown again. If it is lost, reset it again — that is the recovery path.
            </p>
          </div>
        )}

        <details className="rounded-control border border-hairline bg-surface-2 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Or issue a one-time link instead</summary>
          <form action={resetAction} data-draft={`reset-link-${userId}`} className="mt-3 space-y-2">
            <input type="hidden" name="userId" value={userId} />
            <p className="text-xs leading-relaxed text-ink-muted">
              A link lets them choose their own password. It works once and expires in an hour.
            </p>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Creating…">
              Create reset link
            </SubmitButton>
            <Result state={resetState} />
          </form>
        </details>
      </div>
    </Dialog>
  );
}

/* ── Access ────────────────────────────────────────────────────────────────── */

function AccessDialog({
  userId,
  fullName,
  fields,
  grants,
}: {
  userId: string;
  fullName: string;
  fields: FieldOption[];
  grants: { fieldIds: string[]; areaIds: string[] };
}) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(setUserAccessAction, INITIAL);
  const [openField, setOpenField] = useState<string | null>(null);

  return (
    <Dialog
      size="lg"
      title="Programme access"
      description={`What ${fullName} may work on. A field covers every area inside it, including ones added later.`}
      trigger={({ open }) => (
        <Button type="button" size="sm" variant="ghost" onClick={open} aria-label={`Manage programme access for ${fullName}`}>
          <Settings2 className="h-4 w-4" aria-hidden />
          Access
        </Button>
      )}
    >
      <form action={formAction} data-draft={`access-${userId}`} className="space-y-4">
        <input type="hidden" name="userId" value={userId} />

        <div className="space-y-2">
          {fields.map((field) => {
            const holdsField = grants.fieldIds.includes(field.id);
            const expanded = openField === field.id || (!holdsField && openField === null && false);
            const areasHeld = field.areas.filter((area) => grants.areaIds.includes(area.id)).length;
            return (
              <div key={field.id} className="rounded-control border border-hairline bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-2.5 text-sm font-semibold text-ink">
                    <input
                      type="checkbox"
                      name="fieldId"
                      value={field.id}
                      defaultChecked={holdsField}
                      className="mt-0.5 h-4 w-4 rounded border-hairline text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />
                    <span>
                      {field.name}
                      <span className="block text-xs font-normal text-ink-muted">
                        Whole field · {field.areas.length} area{field.areas.length === 1 ? "" : "s"}
                        {areasHeld > 0 && !holdsField ? ` · ${areasHeld} selected individually` : ""}
                      </span>
                    </span>
                  </label>
                  {field.areas.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setOpenField(expanded ? null : field.id)}
                      aria-expanded={expanded}
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      {expanded ? "Hide areas" : "Choose areas"}
                    </button>
                  )}
                </div>

                {expanded && (
                  <ul className="mt-3 grid gap-1.5 border-t border-hairline pt-3 sm:grid-cols-2">
                    {field.areas.map((area) => (
                      <li key={area.id}>
                        <label className="flex items-start gap-2 text-xs text-ink">
                          <input
                            type="checkbox"
                            name="areaId"
                            value={area.id}
                            defaultChecked={grants.areaIds.includes(area.id)}
                            className="mt-0.5 h-3.5 w-3.5 rounded border-hairline text-primary"
                          />
                          {area.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-ink-muted">
          Ticking a whole field also covers its areas, so tick either the field or the individual areas — not both.
        </p>

        <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? "Saving…" : "Save access"}
        </Button>
        <Result state={state} />
      </form>
    </Dialog>
  );
}

/* ── Details ───────────────────────────────────────────────────────────────── */

function DetailsDialog({
  userId,
  fullName,
  email,
  role,
  isUnitHead,
  region,
  grade,
  facility,
}: {
  userId: string;
  fullName: string;
  email: string | null;
  role: Role;
  isUnitHead: boolean;
  region: string | null;
  grade: string | null;
  facility: string | null;
}) {
  const currentRole = staffRoleOf({ role, unitHead: isUnitHead });
  const [details, detailsAction, pendingDetails] = useActionState<UserActionState, FormData>(updateUserDetailsAction, INITIAL);
  const [roleState, roleAction] = useActionState(changeUserRoleAction, INITIAL);

  return (
    <Dialog
      size="md"
      title="Edit details"
      description="The directory row is the source of truth for who this person is; the role decides what they may do."
      trigger={({ open }) => (
        <Button type="button" size="sm" variant="ghost" onClick={open} aria-label={`Edit details for ${fullName}`}>
          <UserPen className="h-4 w-4" aria-hidden />
          Details
        </Button>
      )}
    >
      <div className="space-y-6">
        <form action={detailsAction} data-draft={`details-${userId}`} className="space-y-3">
          <input type="hidden" name="userId" value={userId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={`name-${userId}`} className={labelClass}>
                Full name
              </label>
              <input id={`name-${userId}`} name="fullName" defaultValue={fullName} required className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`email-${userId}`} className={labelClass}>
                Work e-mail <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <input
                id={`email-${userId}`}
                name="email"
                type="email"
                defaultValue={email ?? ""}
                placeholder="name@ghs.gov.gh"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`region-${userId}`} className={labelClass}>
                Region
              </label>
              <input id={`region-${userId}`} name="region" defaultValue={region ?? ""} className={inputClass} />
            </div>
            <div>
              <label htmlFor={`grade-${userId}`} className={labelClass}>
                Grade
              </label>
              <input id={`grade-${userId}`} name="grade" defaultValue={grade ?? ""} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={`facility-${userId}`} className={labelClass}>
                Facility
              </label>
              <input id={`facility-${userId}`} name="facility" defaultValue={facility ?? ""} className={inputClass} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={pendingDetails} aria-busy={pendingDetails}>
            {pendingDetails && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {pendingDetails ? "Saving…" : "Save details"}
          </Button>
          <Result state={details} />
        </form>

        <form action={roleAction} data-draft={`role-${userId}`} className="space-y-2 border-t border-hairline pt-5">
          <input type="hidden" name="userId" value={userId} />
          <label htmlFor={`role-${userId}`} className={labelClass}>
            Role
          </label>
          <div className="flex gap-2">
            <Select
              id={`role-${userId}`}
              name="role"
              defaultValue={currentRole}
              options={STAFF_ROLE_VALUES.map((value) => ({
                value,
                label: STAFF_ROLE_LABELS[value],
                hint: STAFF_ROLE_HINTS[value],
              }))}
            />
            <SubmitButton variant="secondary" pendingLabel="Saving…">
              Save role
            </SubmitButton>
          </div>
          <p className="text-xs text-ink-muted">{STAFF_ROLE_HINTS[currentRole]}</p>
          <p className="text-xs text-ink-muted">
            Changing a facilitator back to staff removes their programme access; the audit trail keeps the history.
          </p>
          <Result state={roleState} />
        </form>
      </div>
    </Dialog>
  );
}

/* ── Active ────────────────────────────────────────────────────────────────── */

function ActiveToggle({ userId, isActive, fullName }: { userId: string; isActive: boolean; fullName: string }) {
  const [state, action] = useActionState(setUserActiveAction, INITIAL);
  return (
    <form action={action} className="inline-flex flex-col">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      <SubmitButton variant={isActive ? "danger" : "secondary"} size="sm" pendingLabel={isActive ? "Closing…" : "Opening…"}>
        {isActive ? "Deactivate" : "Reactivate"}
      </SubmitButton>
      {state.message && (
        <span role="status" className={`mt-1 text-xs ${state.ok ? "text-primary" : "text-danger"}`} title={`${fullName}`}>
          {state.ok ? "Saved" : state.message}
        </span>
      )}
    </form>
  );
}
