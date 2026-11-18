"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/*
 * The two decorative layers behind the signed-in menu.
 *
 * Nothing here carries meaning: the weave is a kente-derived lattice (the three
 * GHS colours appear as hairlines, never as text), and the star is the black
 * star of the flag drawn as an outline. Both are `aria-hidden` and sit under
 * 10% opacity so the menu keeps a 7:1 contrast ratio on the green.
 */

export function SidebarWeave({ className }: { className?: string }) {
  const id = `${useId()}-weave`;

  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 256 720"
      preserveAspectRatio="xMidYMin slice"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <defs>
        <pattern id={id} width="72" height="72" patternUnits="userSpaceOnUse">
          {/* Kente-inspired double diamond. */}
          <path
            d="M36 4 68 36 36 68 4 36Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.5"
          />
          <path d="M36 20 52 36 36 52 20 36Z" fill="currentColor" opacity="0.35" />
          {/* Weft dashes between the diamonds. */}
          <path d="M0 36h6M66 36h6M36 0v6M36 66v6" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        </pattern>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.16" />
          <stop offset="55%" stopColor="white" stopOpacity="0.07" />
          <stop offset="100%" stopColor="white" stopOpacity="0.02" />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect width="256" height="720" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <rect width="256" height="720" fill={`url(#${id})`} mask={`url(#${id}-mask)`} />
    </svg>
  );
}

export function SidebarStar({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      className={cn("pointer-events-none absolute", className)}
    >
      <path
        d="M50 4 61.8 35.4 95 36.6 68.9 57.3 77.9 89.4 50 70.2 22.1 89.4 31.1 57.3 5 36.6 38.2 35.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d="M50 22 57 39.6 75.6 40.3 61 51.6 66 69.9 50 59.6 34 69.9 39 51.6 24.4 40.3 43 39.6Z"
        fill="currentColor"
        opacity="0.18"
      />
    </svg>
  );
}

/** The flag's three bands, as a hairline under the mark. */
export function SidebarFlagLine({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-[3px] w-full overflow-hidden rounded-full", className)}>
      <span className="h-full flex-1 bg-ghs-red" />
      <span className="h-full flex-1 bg-ghs-gold" />
      <span className="h-full flex-1 bg-white/70" />
    </span>
  );
}
