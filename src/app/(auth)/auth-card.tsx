"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * The card every signed-out screen sits on.
 *
 * Lifted on arrival and again on hover: two pixels of travel, a hair more shadow,
 * 200 ms. Enough that the panel feels like an object on the page — the reference
 * the brief asked for — and small enough that nothing moves under a cursor that
 * is already heading for the Sign in button. Off entirely under
 * `prefers-reduced-motion`.
 */
export function AuthCard({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className="w-full rounded-[28px] border border-white/45 bg-surface p-7 shadow-lift sm:p-9">{children}</div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full rounded-[28px] border border-white/45 bg-surface p-7 shadow-[0_28px_70px_-30px_rgba(0,32,18,0.65),0_2px_0_rgba(255,255,255,0.6)_inset] sm:p-9"
    >
      {children}
    </motion.div>
  );
}
