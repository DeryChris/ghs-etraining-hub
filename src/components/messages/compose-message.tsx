"use client";

import { useActionState, useEffect, useRef } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { inputClass, labelClass } from "@/components/ui/input";
import { sendMessageAction, type MessageActionState } from "@/lib/server/actions/messages";
import { ROLE_LABELS } from "@/lib/labels";
import type { Role } from "@/lib/rbac/capabilities";

export interface Recipient {
  id: string;
  name: string;
  role: Role;
  facility: string | null;
}

const INITIAL: MessageActionState = { ok: false, message: null };

export function ComposeMessage({
  recipients,
  recipientId,
  recipientName,
}: {
  recipients?: Recipient[];
  recipientId?: string;
  recipientName?: string;
}) {
  const [state, formAction] = useActionState(sendMessageAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  // A successful send clears the draft. The reset runs on the DOM, not in render.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const bodyId = recipientId ? "compose-body-thread" : "compose-body";

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {recipientId ? (
        <input type="hidden" name="recipientId" value={recipientId} />
      ) : (
        <div>
          <label htmlFor="compose-recipient" className={labelClass}>
            To
          </label>
          <select id="compose-recipient" name="recipientId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Choose a colleague
            </option>
            {recipients?.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {ROLE_LABELS[person.role]}
                {person.facility ? ` · ${person.facility}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor={bodyId} className={labelClass}>
          {recipientName ? `Message ${recipientName}` : "Message"}
        </label>
        <textarea
          id={bodyId}
          name="body"
          required
          maxLength={4000}
          rows={3}
          placeholder="Write a message. Do not include patient information."
          className={inputClass}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p
          role="status"
          aria-live="polite"
          className={state.message ? (state.ok ? "text-xs text-primary" : "text-xs text-danger") : "sr-only"}
        >
          {state.message ?? ""}
        </p>
        <SubmitButton size="sm" pendingLabel="Sending…">
          Send message
        </SubmitButton>
      </div>
    </form>
  );
}
