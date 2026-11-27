"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A form in an overlay, opened from a button — for pages that are rendered on the
 * server.
 *
 * `Dialog` takes its trigger as a render function, which a server component
 * cannot pass across the boundary. This wrapper keeps the same overlay and takes
 * plain props instead, so a server page can hand it a label and a form and get
 * the same panel the client-side tables use. That is what replaced the
 * `<details>` blocks that unfolded nine-field forms in the middle of a page.
 */
export function ActionDialog({
  label,
  title,
  description,
  size = "md",
  variant = "secondary",
  buttonSize = "sm",
  icon,
  className,
  children,
}: {
  /** The words on the button that opens the panel. */
  label: ReactNode;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  variant?: ButtonVariant;
  buttonSize?: ButtonSize;
  icon?: ReactNode;
  /** Replaces the default button styling — used for the dashed "add" affordances. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <Dialog
      size={size}
      title={title}
      description={description}
      trigger={({ open }) => (
        <button type="button" onClick={open} className={cn(buttonClass({ variant, size: buttonSize }), className)}>
          {icon}
          {label}
        </button>
      )}
    >
      {children}
    </Dialog>
  );
}
