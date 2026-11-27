/**
 * Vector art for the public pages.
 *
 * These replace the boxed 44px grid that used to sit behind the hero and the map.
 * A regular grid reads as graph paper — texture for its own sake — and at low
 * opacity it turned every section into a rectangle of squares. What is here
 * instead is drawn from the things the platform is actually about: woven kente
 * bands (the wrappers a document arrives in), the Ghana black star, and the
 * contour rings of a map. Gradients carry the transitions rather than blurs, so
 * nothing soft ever sits on top of text.
 *
 * Everything is `aria-hidden`, `pointer-events-none`, and painted with SVG
 * gradients over theme tokens, so both themes get their own colour without a
 * second definition. No filters: a blurred layer is expensive to composite and
 * is exactly what used to bleed over content edges.
 */

/** A five-pointed star, drawn once at radius 100 and scaled by the caller. */
const STAR = "M0 -100 L24.7 -34 L95.1 -30.9 L39.9 13 L58.8 80.9 L0 42 L-58.8 80.9 L-39.9 13 L-95.1 -30.9 L-24.7 -34 Z";

/** Woven bands: three skewed ribbons that fade out before they reach the copy. */
function KenteBands({ id, opacity = 1 }: { id: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <path d="M-120 -40 L520 -140 L556 -58 L-84 42 Z" fill={`url(#${id}-green)`} opacity="0.5" />
      <path d="M-120 44 L470 -46 L502 20 L-84 110 Z" fill={`url(#${id}-gold)`} opacity="0.55" />
      <path d="M-120 128 L420 48 L446 96 L-84 176 Z" fill={`url(#${id}-red)`} opacity="0.4" />
    </g>
  );
}

/** The hero backdrop: colour wash, woven bands, contour rings, star. */
export function HeroArt() {
  const id = "hero";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Colour wash — radial gradients, no blur filter, all below 20% alpha. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(90% 70% at 8% -10%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 62%)",
            "radial-gradient(70% 60% at 92% -6%, color-mix(in oklab, var(--accent) 26%, transparent), transparent 58%)",
            "radial-gradient(80% 70% at 60% 110%, color-mix(in oklab, var(--primary) 14%, transparent), transparent 64%)",
          ].join(", "),
        }}
      />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 760"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${id}-green`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.42" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-red`} x1="0" y1="0" x2="1" y2="0.5">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.34" />
            <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-star`} x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Woven bands, top-left. The mask keeps them out of the headline column. */}
        <g style={{ maskImage: "linear-gradient(105deg, black 0%, black 34%, transparent 62%)" }}>
          <KenteBands id={id} />
        </g>

        {/* Contour rings — a map read from above, top-right, fading under the photo. */}
        <g stroke={`url(#${id}-ring)`} strokeWidth="1.25">
          <circle cx="1215" cy="105" r="150" />
          <circle cx="1215" cy="105" r="228" strokeDasharray="2 8" />
          <circle cx="1215" cy="105" r="306" />
          <circle cx="1215" cy="105" r="384" strokeDasharray="1 10" strokeOpacity="0.7" />
        </g>

        {/* Black star, large and barely there, bottom-right. */}
        <g transform="translate(1268 628) scale(1.55)" fill={`url(#${id}-star)`} opacity="0.5">
          <path d={STAR} />
        </g>

        {/* A quiet dotted field, bottom-left, to ground the wash without a box. */}
        <g fill="var(--primary)" opacity="0.18">
          {Array.from({ length: 6 }, (_, row) =>
            Array.from({ length: 10 }, (_, col) => (
              <circle key={`${row}-${col}`} cx={48 + col * 26} cy={560 + row * 26} r={1.6} />
            )),
          )}
        </g>
      </svg>

      {/* Hands the page back to the canvas at the bottom edge — a gradient, not a blur. */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-canvas" />
    </div>
  );
}

/** The backdrop for the map card: contours and a soft corner light. */
export function MapArt() {
  const id = "map";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(70% 60% at 20% 0%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 60%), radial-gradient(60% 50% at 100% 100%, color-mix(in oklab, var(--accent) 18%, transparent), transparent 60%)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <g stroke={`url(#${id}-ring)`} strokeWidth="1">
          {[70, 120, 170, 220, 270, 320].map((r) => (
            <ellipse key={r} cx="300" cy="300" rx={r * 1.15} ry={r} strokeDasharray={r % 100 === 0 ? "3 7" : undefined} />
          ))}
        </g>
      </svg>
    </div>
  );
}

/** The closing call to action: gradient transitions and one woven band. */
export function CtaArt() {
  const id = "cta";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(80% 90% at 100% 0%, color-mix(in oklab, var(--accent) 34%, transparent), transparent 58%)",
            "radial-gradient(70% 80% at 0% 100%, color-mix(in oklab, var(--danger) 26%, transparent), transparent 60%)",
            "linear-gradient(120deg, color-mix(in oklab, var(--primary) 92%, black) 0%, var(--primary) 55%, color-mix(in oklab, var(--primary) 70%, var(--accent)) 100%)",
          ].join(", "),
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" fill="none">
        <defs>
          <linearGradient id={`${id}-band`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g style={{ maskImage: "linear-gradient(90deg, transparent 0%, black 30%, transparent 85%)" }}>
          <path d="M-40 300 L1240 190 L1240 236 L-40 346 Z" fill={`url(#${id}-band)`} />
          <path d="M-40 360 L1240 250 L1240 272 L-40 382 Z" fill={`url(#${id}-band)`} opacity="0.6" />
        </g>
        <g transform="translate(1080 300) scale(0.9)" fill="var(--accent)" opacity="0.16">
          <path d={STAR} />
        </g>
      </svg>
    </div>
  );
}
