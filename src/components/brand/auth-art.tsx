/**
 * The sign-in backdrop.
 *
 * One full-bleed SVG, drawn from the health service's own vocabulary rather than
 * from geometry: a heartbeat trace running across the page, a soft cross-field,
 * a pill, a droplet and a stethoscope bell, all at low contrast behind glass. It
 * costs no request, scales with the viewport, and — because it is a single
 * decorative layer — never competes with the card it sits behind.
 *
 * `preserveAspectRatio="xMidYMid slice"` means the composition fills any screen:
 * the trace stays a trace, cropped rather than squashed.
 */
export function AuthArt({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      <defs>
        <linearGradient id="auth-bg" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#0a8f57" />
          <stop offset="45%" stopColor="#006b3f" />
          <stop offset="100%" stopColor="#00301c" />
        </linearGradient>
        <radialGradient id="auth-halo" cx="0.5" cy="0.42" r="0.62">
          <stop offset="0%" stopColor="#eafff2" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#eafff2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="auth-trace" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0" />
          <stop offset="22%" stopColor="#ffe9a8" stopOpacity="0.85" />
          <stop offset="70%" stopColor="#fcd116" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1440" height="900" fill="url(#auth-bg)" />
      <rect width="1440" height="900" fill="url(#auth-halo)" />

      {/* The heartbeat: two traces, the lower one fainter, so it reads as depth. */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M-40 470 H210 l40 -86 l36 172 l44 -128 l34 64 l26 -22 H560 l42 -60 l38 60 H880 l44 -96 l40 96 H1180 l34 -44 l30 44 H1500"
          stroke="url(#auth-trace)"
          strokeWidth="3.5"
          strokeOpacity="0.9"
        />
        <path
          d="M-40 560 H150 l30 -52 l30 104 l32 -78 l26 40 H430 l30 -30 l28 30 H700 l34 -58 l32 58 H1010 l30 -40 l28 40 H1500"
          stroke="#ffffff"
          strokeWidth="2"
          strokeOpacity="0.14"
        />
      </g>

      {/* A field of soft crosses, the one symbol every health worker reads instantly. */}
      <g stroke="#ffffff" strokeOpacity="0.09" strokeWidth="10" strokeLinecap="round">
        {Array.from({ length: 26 }, (_, index) => {
          const x = 70 + ((index * 61) % 1310);
          const y = 90 + ((index * 137) % 720);
          return (
            <g key={index} transform={`translate(${x} ${y}) rotate(${(index % 5) * 8}) scale(${0.55 + (index % 3) * 0.22})`}>
              <line x1="-16" y1="0" x2="16" y2="0" />
              <line x1="0" y1="-16" x2="0" y2="16" />
            </g>
          );
        })}
      </g>

      {/* A pill and a droplet, drawn as objects rather than icons. */}
      <g opacity="0.13" transform="translate(1160 150) rotate(-24)">
        <rect x="0" y="0" width="132" height="56" rx="28" fill="#ffffff" />
        <path d="M66 0h38a28 28 0 010 56H66z" fill="#fcd116" />
      </g>
      <g opacity="0.16" transform="translate(190 690)">
        <path d="M0 -46c26 30 44 52 44 70a44 44 0 11-88 0c0-18 18-40 44-70z" fill="#ffffff" />
      </g>
      <g opacity="0.12" transform="translate(1210 660)">
        <circle cx="0" cy="0" r="58" fill="none" stroke="#ffffff" strokeWidth="9" />
        <path d="M42 42l48 48" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" />
        <circle cx="0" cy="0" r="34" fill="none" stroke="#fcd116" strokeWidth="4" strokeDasharray="5 9" />
      </g>

      {/* Vignette: keeps the corners quiet so the card is the brightest thing. */}
      <rect width="1440" height="900" fill="#00160d" fillOpacity="0.24" />
    </svg>
  );
}
