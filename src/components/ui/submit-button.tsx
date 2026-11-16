"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/** Disables itself while its parent form is submitting, keeping its width stable. */
export function SubmitButton({
  children,
  pendingLabel,
  variant,
  size,
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass({ variant, size, className })}>
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
