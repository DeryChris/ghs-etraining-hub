"use client";

import { Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

/**
 * Sign-out acknowledges the press. Without it the menu sits there, still signed
 * in, until the server answers — which reads as a dead button on a slow link.
 */
export function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex min-h-10 w-full items-center gap-2.5 rounded-control px-2.5 text-sm font-semibold text-ink hover:bg-surface-2 disabled:opacity-70"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-ink-muted" aria-hidden />
      ) : (
        <LogOut className="h-4 w-4 text-ink-muted" aria-hidden />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
