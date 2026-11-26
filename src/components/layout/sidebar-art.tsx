"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/*
 * The decorative layers behind the signed-in menu.
 *
 * These were a kente lattice and the black star of the flag. Neither said
 * anything about the work, and the client asked for the menu's graphics to read
 * as health and administration. So: a monitor trace running down the rail, the
 * way a bedside monitor draws one, and a quiet cross-in-ring seal at the foot —
 * the two marks a health service actually uses for "monitoring" and "care".
 *
 * Nothing here carries meaning. Both are `aria-hidden`, both sit under 12%
 * opacity, and the seal is clipped by the rail, so the menu keeps its contrast.
 */

export function SidebarTrace({ className }: { className?: string }) {
  const id = `${useId()}-trace`;

  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 256 900"
      preserveAspectRatio="xMidYMin slice"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <defs>
        {/* One monitor sweep: flat, a beat, flat again. Repeated down the rail it
            reads as a trace rather than a pattern of shapes. */}
        <pattern id={id} width="256" height="180" patternUnits="userSpaceOnUse">
          <path
            d="M0 120h96l14-22 12 48 14-64 16 96 14-58h90"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M0 120h256" stroke="currentColor" strokeWidth="0.6" strokeDasharray="3 7" />
        </pattern>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="55%" stopColor="white" stopOpacity="0.09" />
          <stop offset="100%" stopColor="white" stopOpacity="0.025" />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect width="256" height="900" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      <rect width="256" height="900" fill={`url(#${id})`} mask={`url(#${id}-mask)`} />
    </svg>
  );
}

/** A cross in a ring: the seal at the foot of the rail. */
export function SidebarSeal({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 100 100"
      className={cn("pointer-events-none absolute", className)}
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.35" />
      {/* The cross itself, drawn as one thick plus so it reads at any size. */}
      <path
        d="M44 30h12v14h14v12H56v14H44V56H30V44h14z"
        fill="currentColor"
        opacity="0.28"
      />
      {/* A pulse breaking out of the ring, tying the seal to the trace above. */}
      <path
        d="M18 74h10l5-9 6 18 5-12 4 6h34"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
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
