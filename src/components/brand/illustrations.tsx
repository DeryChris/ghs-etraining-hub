/**
 * Original vector illustrations for the training library. Colour comes from currentColor and the
 * brand variables, so they work in both themes. None of them carry information that
 * is not also in text.
 */

/* ── Region map: Ghana's outline with the 16 administrative regions ─────────── */

const GHANA_OUTLINE: [number, number][] = [
  [-3.2, 5.0], [-2.5, 4.7], [-1.5, 4.9], [-0.5, 5.4], [0.2, 5.8], [1.2, 6.1],
  [1.2, 7.4], [0.9, 8.6], [0.5, 9.6], [0.3, 10.7], [-0.1, 11.1], [-1.0, 11.0],
  [-2.2, 11.1], [-2.8, 10.6], [-2.8, 9.4], [-2.9, 8.3], [-2.5, 7.5], [-2.8, 6.7], [-3.2, 6.0],
];

const REGIONS: { name: string; lon: number; lat: number }[] = [
  { name: "Greater Accra", lon: -0.2, lat: 5.6 },
  { name: "Ashanti", lon: -1.6, lat: 6.7 },
  { name: "Northern", lon: -0.84, lat: 9.4 },
  { name: "Volta", lon: 0.47, lat: 6.6 },
  { name: "Central", lon: -1.25, lat: 5.1 },
  { name: "Western", lon: -1.75, lat: 4.9 },
  { name: "Eastern", lon: -0.26, lat: 6.09 },
  { name: "Bono", lon: -2.33, lat: 7.34 },
  { name: "Bono East", lon: -1.93, lat: 7.58 },
  { name: "Ahafo", lon: -2.52, lat: 7.67 },
  { name: "Western North", lon: -2.49, lat: 6.2 },
  { name: "Upper East", lon: -0.85, lat: 10.8 },
  { name: "Upper West", lon: -2.5, lat: 10.06 },
  { name: "Savannah", lon: -1.82, lat: 9.08 },
  { name: "North East", lon: -0.37, lat: 10.53 },
  { name: "Oti", lon: -0.18, lat: 8.07 },
];

const MAP_W = 300;
const MAP_H = 340;
const PAD = 16;
const MIN_LON = -3.4;
const MAX_LON = 1.4;
const MIN_LAT = 4.5;
const MAX_LAT = 11.3;
// Equal scale on both axes so the country keeps its real proportions.
const SCALE = Math.min((MAP_W - PAD * 2) / (MAX_LON - MIN_LON), (MAP_H - PAD * 2) / (MAX_LAT - MIN_LAT));
const X0 = (MAP_W - (MAX_LON - MIN_LON) * SCALE) / 2;
const Y0 = (MAP_H - (MAX_LAT - MIN_LAT) * SCALE) / 2;

function project(lon: number, lat: number): [number, number] {
  return [X0 + (lon - MIN_LON) * SCALE, Y0 + (MAX_LAT - lat) * SCALE];
}

export function RegionMap({ className }: { className?: string }) {
  const outline = GHANA_OUTLINE.map(([lon, lat], index) => {
    const [x, y] = project(lon, lat);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ") + " Z";

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className={className} role="img" aria-label="Map of Ghana showing the 16 regions served by the Ghana Health Service Training Library">
      <path d={outline} fill="var(--primary)" fillOpacity="0.1" stroke="var(--primary)" strokeOpacity="0.55" strokeWidth="1.5" strokeLinejoin="round" />
      {REGIONS.map((region, index) => {
        const [x, y] = project(region.lon, region.lat);
        return (
          <g key={region.name}>
            <circle cx={x} cy={y} r="9" fill="var(--primary)" fillOpacity="0.25" className="region-pulse" style={{ animationDelay: `${(index % 8) * 0.3}s` }} />
            <circle cx={x} cy={y} r="3.6" fill="var(--primary)" stroke="var(--surface)" strokeWidth="1.5">
              <title>{region.name}</title>
            </circle>
          </g>
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
