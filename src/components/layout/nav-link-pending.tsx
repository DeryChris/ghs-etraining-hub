"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";

/**
 * A tick beside a menu item the moment it is pressed.
 *
 * Next streams the next route in, which on a slow connection means a second or
 * two where nothing at all happens after a click — the exact complaint that the
 * menu "shows nothing". `useLinkStatus` is what makes the acknowledgement
 * immediate without turning the sidebar into a client router of its own.
 */
export function NavLinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <Loader2
      className="h-3.5 w-3.5 shrink-0 animate-spin opacity-80"
      aria-hidden
      data-nav-pending
    />
  );
}
