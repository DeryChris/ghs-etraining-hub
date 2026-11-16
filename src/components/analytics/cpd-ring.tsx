"use client";

import { motion, useReducedMotion } from "framer-motion";

/** Animated progress ring. The number is real text, so the value is never only visual. */
export function CpdRing({ value, max, size = 136 }: { value: number; max: number; size?: number }) {
  const reduce = useReducedMotion();
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, value / max));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${value.toFixed(1)} of ${max} CPD points`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable={false}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - fraction) }}
          transition={reduce ? { duration: 0 } : { duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tabular-nums text-ink">{value.toFixed(1)}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">of {max} pts</span>
      </div>
    </div>
  );
}
