"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/** A compact welcome panel beside the sign-in form on desktop; the mobile view leads with the form. */
export function AuthSplit({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full overflow-hidden rounded-[28px] border border-white/45 bg-surface shadow-[0_28px_70px_-30px_rgba(0,32,18,0.65),0_2px_0_rgba(255,255,255,0.6)_inset]"
    >
      <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="relative hidden min-h-[460px] overflow-hidden bg-[linear-gradient(155deg,#1d7d5b_0%,#145c42_48%,#0a3a2a_100%)] px-8 py-10 text-white lg:flex lg:items-center xl:px-10">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/[0.07]" />
          <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-black/[0.12]" />
          <div className="relative w-full">{aside}</div>
        </aside>

        <div className="px-6 py-7 sm:px-9 sm:py-9">{children}</div>
      </div>
    </motion.div>
  );
}
