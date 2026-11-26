/**
 * The sign-in panel's artwork.
 *
 * Replaces the old grid-of-boxes: a soft topographic field with a pulse line
 * running through it, drawn in one SVG so it scales with the panel and costs no
 * request. Decorative only — hidden from assistive technology, and set behind
 * the text at low contrast so the copy stays the thing you read.
 */
export function AuthArt({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 640 900"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id="auth-sky" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#3ecf8e" />
          <stop offset="52%" stopColor="#1e9e6a" />
          <stop offset="100%" stopColor="#0b6b47" />
        </linearGradient>
        <radialGradient id="auth-glow" cx="0.24" cy="0.14" r="0.72">
          <stop offset="0%" stopColor="#b9f6d8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#b9f6d8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="auth-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f6d36b" stopOpacity="0" />
          <stop offset="35%" stopColor="#f6d36b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="640" height="900" fill="url(#auth-sky)" />
      <rect width="640" height="900" fill="url(#auth-glow)" />

      {/* Contour bands: the shape reads as terrain, not as a layout grid. */}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1.4">
        <path d="M-40 690 C 120 610, 210 760, 360 690 S 600 560, 700 620" />
        <path d="M-40 730 C 130 650, 220 800, 370 730 S 610 600, 700 660" />
        <path d="M-40 770 C 140 690, 230 840, 380 770 S 620 640, 700 700" />
        <path d="M-40 810 C 150 730, 240 880, 390 810 S 630 680, 700 740" />
        <path d="M-40 240 C 110 180, 200 300, 340 240 S 590 120, 700 180" strokeOpacity="0.1" />
        <path d="M-40 190 C 120 130, 210 250, 350 190 S 600 70, 700 130" strokeOpacity="0.08" />
      </g>

      {/* Concentric rings behind the brand mark. */}
      <g fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.2">
        <circle cx="96" cy="120" r="64" />
        <circle cx="96" cy="120" r="104" />
        <circle cx="96" cy="120" r="150" />
      </g>

      {/* A pulse line: the one motif that says "health" without a cliché icon. */}
      <path
        d="M-20 470 H 150 l 26 -54 l 30 116 l 28 -84 l 24 40 H 420 l 26 -34 l 26 34 H 680"
        fill="none"
        stroke="url(#auth-wave)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Scattered dots, irregular on purpose. */}
      <g fill="#ffffff" fillOpacity="0.22">
        {[
          [470, 210], [520, 258], [596, 190], [430, 300], [560, 340], [500, 150],
          [180, 560], [230, 610], [140, 640], [300, 590], [70, 520], [360, 640],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.2" />
        ))}
      </g>

      {/* Soft light at the base so the panel does not end in a hard edge. */}
      <rect y="820" width="640" height="80" fill="#0b6b47" fillOpacity="0.55" />
    </svg>
  );
}
