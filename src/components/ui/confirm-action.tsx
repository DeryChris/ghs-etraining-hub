"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A destructive (or otherwise consequential) action, confirmed in an overlay.
 *
 * One click used to be enough to delete a district or deactivate a facility, and
 * the button sat in a row next to "Edit" — the two most adjacent things on the
 * page were "change this" and "remove this". Opening a panel costs one click and
 * buys a sentence explaining what will happen, a visible primary action to
 * confirm, and the ability to close without having done anything.
 *
 * The panel closes as soon as the submission starts; the page behind it is
 * revalidated by the action, so the result is visible where the row was.
 */
export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  action,
  fields,
  variant = "danger",
  buttonSize = "sm",
  icon,
  className,
  children,
}: {
  /** The words on the button that opens the panel. */
  label: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  /** The server action. Its own hidden inputs are supplied through `fields`. */
  action: (formData: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  variant?: ButtonVariant;
  buttonSize?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  /** Extra content under the description: a warning, a count, a list. */
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <Dialog
      size="sm"
      title={title}
      description={description}
      trigger={({ open }) => (
        <button type="button" onClick={open} className={cn(buttonClass({ variant, size: buttonSize }), className)}>
          {icon}
          {label}
        </button>
      )}
    >
      {({ close }) => (
        <form
          action={action}
          onSubmit={() => {
            setBusy(true);
            // Let the submission go, then get out of the way of the page.
            close();
          }}
          className="space-y-4"
        >
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          {children ?? (
            <p className="flex items-start gap-2 rounded-control border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              This cannot be undone from the page. The audit trail keeps a record of who did it.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className={buttonClass({ variant, size: "sm" })}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {confirmLabel}
            </button>
            <button type="button" onClick={close} className={buttonClass({ variant: "ghost", size: "sm" })}>
              Keep it
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
