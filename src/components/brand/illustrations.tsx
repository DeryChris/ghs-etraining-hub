import { UPPER_WEST_REGION } from "@/lib/ghana-map";

/**
 * Original vector illustrations for the training library. Colour comes from currentColor and the
 * brand variables, so they work in both themes. None of them carry information that
 * is not also in text.
 */

/* ── Upper West silhouette ────────────────────────────────────────────────
 * The region on its own, from the same real boundaries — cropped to the
 * region's own bounding box so no other region appears, and marked at its
 * centroid. This is the regional identity asset: a shape you can point at,
 * without surrounding regional boundaries.
 */
export function UpperWestMap({ className }: { className?: string }) {
  const upperWest = UPPER_WEST_REGION;
  if (!upperWest) return null;
  return (
    <svg
      viewBox="20 9 118 111"
      className={className}
      role="img"
      aria-label="Outline map of the Upper West Region of Ghana"
    >
      <defs>
        <linearGradient id="uw-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d={upperWest.d} fill="url(#uw-fill)" stroke="var(--primary)" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Location marker at the region's centroid. */}
      <g transform="translate(78.6 59.25)">
        <circle r="10" fill="var(--accent)" fillOpacity="0.35" className="region-pulse" />
        <circle r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
      </g>
    </svg>
  );
}

/* ── Empty-state art ───────────────────────────────────────────────────────── */

export type EmptyArtVariant = "folder" | "inbox" | "pulse" | "search" | "bell";

export function EmptyArt({ variant = "folder", className }: { variant?: EmptyArtVariant; className?: string }) {
  const common = { viewBox: "0 0 160 120", className, "aria-hidden": true as const, focusable: false as const };
  switch (variant) {
    case "inbox":
      return (
        <svg {...common}>
          <rect x="34" y="28" width="92" height="66" rx="12" fill="var(--surface-2)" stroke="var(--hairline)" strokeWidth="2" />
          <path d="M34 72h26l6 10h28l6-10h26" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="126" cy="30" r="10" fill="var(--primary)" />
          <path d="M122 30h8M126 26v8" stroke="var(--primary-ink)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "pulse":
      // A monitor with a heartbeat: the health service's own shorthand for
      // "nothing recorded yet", instead of a document with a tick on it.
      return (
        <svg {...common}>
          <rect x="24" y="30" width="112" height="66" rx="12" fill="var(--surface-2)" stroke="var(--hairline)" strokeWidth="2" />
          <rect x="36" y="42" width="88" height="42" rx="6" fill="var(--surface)" stroke="var(--hairline)" strokeWidth="1.5" />
          <path d="M42 64h18l7-13 10 26 8-16 6 8h31" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="124" cy="34" r="7" fill="var(--accent)" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="70" cy="56" r="28" fill="var(--surface-2)" stroke="var(--hairline)" strokeWidth="2" />
          <path d="M92 78l22 22" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
          <path d="M58 56h24M70 44v24" stroke="var(--ink-muted)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        </svg>
      );
    case "bell":
      return (
        <svg {...common}>
          <path d="M80 26c-16 0-26 11-26 26v18l-8 12h68l-8-12V52c0-15-10-26-26-26z" fill="var(--surface-2)" stroke="var(--hairline)" strokeWidth="2" strokeLinejoin="round" />
          <path d="M72 92a8 8 0 0016 0" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="110" cy="34" r="7" fill="var(--accent)" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M22 44a6 6 0 016-6h34l8 10h62a6 6 0 016 6v44a6 6 0 01-6 6H28a6 6 0 01-6-6z" fill="var(--surface-2)" stroke="var(--hairline)" strokeWidth="2" strokeLinejoin="round" />
          <rect x="62" y="58" width="36" height="36" rx="8" fill="var(--primary)" />
          <path d="M80 64v24M68 76h24" stroke="var(--primary-ink)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
  }
}

/* ── Health mark ─────────────────────────────────────────────────────────────
 * The service's own mark, for decorative slots that used to carry a seal. A heartbeat inside a ring, drawn from the same palette as the rest so it
 * reads as a quiet emblem rather than a badge.
 */

export function HealthMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable={false}>
      <circle cx="60" cy="60" r="52" fill="var(--primary)" fillOpacity="0.1" />
      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--primary)" strokeWidth="2" strokeOpacity="0.45" />
      <circle cx="60" cy="60" r="42" fill="var(--surface)" />
      <path
        d="M32 62h12l7-16 10 32 8-22 6 12h13"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M60 30v-8M60 98v-8M30 60h-8M98 60h-8" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.55" />
    </svg>
  );
}
