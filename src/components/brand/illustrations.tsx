import { GHANA_MAP } from "@/lib/ghana-map";

/**
 * Original vector illustrations for the training library. Colour comes from currentColor and the
 * brand variables, so they work in both themes. None of them carry information that
 * is not also in text.
 */

/* ── Region map: the sixteen regions, from real boundaries ─────────────────────
 * Paths come from src/lib/ghana-map.ts (generated from the 2019 boundaries), not
 * from a hand-drawn outline: the country is the right shape, and each region is a
 * shape you can point at. The library is live in Upper West only, so that region
 * carries the brand fill and the rest are legible but plainly inactive — the map
 * answers "where is this available?" without a caption doing the work.
 */

const LIVE_REGION = "Upper West";

export function RegionMap({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${GHANA_MAP.width} ${GHANA_MAP.height}`}
      className={className}
      role="img"
      aria-label="Map of Ghana's sixteen regions. The training library is live in the Upper West Region; the other fifteen regions are coming soon."
    >
      <defs>
        <linearGradient id="region-live" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.92" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.62" />
        </linearGradient>
      </defs>

      {GHANA_MAP.regions.map((region) => {
        const live = region.name === LIVE_REGION;
        return (
          <path
            key={region.name}
            d={region.d}
            fill={live ? "url(#region-live)" : "var(--surface-2)"}
            fillOpacity={live ? 1 : 0.75}
            stroke={live ? "var(--primary)" : "var(--hairline)"}
            strokeWidth={live ? 1.4 : 0.9}
            strokeLinejoin="round"
          >
            <title>{live ? `${region.name} — live` : `${region.name} — coming soon`}</title>
          </path>
        );
      })}
    </svg>
  );
}

/* ── Empty-state art ───────────────────────────────────────────────────────── */

export type EmptyArtVariant = "folder" | "inbox" | "certificate" | "search" | "bell";

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
    case "certificate":
      return (
        <svg {...common}>
          <rect x="30" y="26" width="100" height="70" rx="8" fill="var(--surface)" stroke="var(--hairline)" strokeWidth="2" />
          <path d="M46 46h68M46 58h50M46 70h36" stroke="var(--hairline)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="116" cy="84" r="14" fill="var(--accent)" />
          <path d="M110 84l4 4 8-9" fill="none" stroke="var(--accent-ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

/* ── Certificate seal (verification result) ────────────────────────────────── */

export function CertificateSeal({ className }: { className?: string }) {
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    const x1 = 60 + Math.cos(angle) * 49;
    const y1 = 60 + Math.sin(angle) * 49;
    const x2 = 60 + Math.cos(angle) * 54;
    const y2 = 60 + Math.sin(angle) * 54;
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />;
  });
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden focusable={false}>
      {ticks}
      <circle cx="60" cy="60" r="40" fill="var(--primary)" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 4" />
      <path
        d="M60 40l4.7 9.5 10.5 1.5-7.6 7.4 1.8 10.4L60 63.8l-9.4 4.9 1.8-10.4-7.6-7.4 10.5-1.5z"
        fill="var(--accent)"
      />
    </svg>
  );
}
