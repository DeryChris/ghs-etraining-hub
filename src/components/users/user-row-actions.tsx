"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { hintClass, inputClass } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  changeUserRoleAction,
  sendPasswordResetAction,
  setUnitHeadAction,
  setUserActiveAction,
  type UserActionState,
} from "@/lib/server/actions/users";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/rbac/capabilities";

const INITIAL: UserActionState = { ok: false, message: null };

const ROLES: Role[] = ["LEARNER", "FACILITATOR", "SYSTEM_ADMIN"];

function Result({ state }: { state: UserActionState }) {
  if (!state.message) return null;
  return (
    <p role="status" className={state.ok ? "text-xs font-medium text-primary" : "text-xs font-medium text-danger"}>
      {state.message}
    </p>
  );
}

/**
 * One row of the directory, with the three things an administrator may do to
 * another person's account. Nothing here is hidden behind a disabled button
 * without a reason: `isSelf` explains why your own row is read-only, and the
 * server refuses the same operations even if the form is replayed.
 */
export function UserRowActions({
  userId,
  fullName,
  role,
  isActive,
  isUnitHead,
  isSelf,
}: {
  userId: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  isUnitHead: boolean;
  isSelf: boolean;
}) {
  const [roleState, roleAction] = useActionState(changeUserRoleAction, INITIAL);
  const [activeState, activeAction] = useActionState(setUserActiveAction, INITIAL);
  const [resetState, resetAction] = useActionState(sendPasswordResetAction, INITIAL);
  const [unitHeadState, unitHeadAction] = useActionState(setUnitHeadAction, INITIAL);

  if (isSelf) {
    return (
      <div className="space-y-1">
        <Badge variant="outline">This is you</Badge>
        <p className={hintClass}>Another administrator must change your role or close your account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form action={roleAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="userId" value={userId} />
        <div className="min-w-[9rem]">
          <label htmlFor={`role-${userId}`} className="sr-only">
            Role for {fullName}
          </label>
          <select id={`role-${userId}`} name="role" defaultValue={role} className={inputClass}>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton variant="secondary" size="sm" pendingLabel="Saving…">
          Save role
        </SubmitButton>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <form action={activeAction}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="active" value={isActive ? "false" : "true"} />
          <SubmitButton variant={isActive ? "danger" : "secondary"} size="sm" pendingLabel={isActive ? "Closing…" : "Opening…"}>
            {isActive ? "Deactivate" : "Reactivate"}
          </SubmitButton>
        </form>
        <form action={resetAction}>
          <input type="hidden" name="userId" value={userId} />
          <SubmitButton variant="ghost" size="sm" pendingLabel="Sending…">
            Send reset link
          </SubmitButton>
        </form>
        {role === "FACILITATOR" && (
          <form action={unitHeadAction}>
            <input type="hidden" name="userId" value={userId} />
            <SubmitButton variant={isUnitHead ? "secondary" : "ghost"} size="sm" pendingLabel={isUnitHead ? "Removing…" : "Granting…"}>
              {isUnitHead ? "Remove unit head" : "Make unit head"}
            </SubmitButton>
          </form>
        )}
      </div>

      <Result state={roleState} />
      <Result state={activeState} />
      <Result state={resetState} />
      <Result state={unitHeadState} />
    </div>
  );
}
