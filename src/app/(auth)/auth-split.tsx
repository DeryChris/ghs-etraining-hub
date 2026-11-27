"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * The signed-out card, in two halves.
 *
 * Left: what this is and how to get in — the getting-started steps, the note for
 * people who used the old manual portal, what the complaint hub is for. Right:
 * the form, and nothing else.
 *
 * It was one narrow column for a while, on the theory that a split screen put the
 * explanation where nobody's eyes were. The opposite turned out to be true: the
 * explanation is read *before* the form by exactly the people who need it (first
 * sign-in, forgotten password, "does my old account still work?"), and stacking
 * it above the form pushed the password field off a phone screen. Side by side,
 * the panel is still the first thing that loads and the form is one glance away.
 *
 * Below `lg` the aside collapses to a short summary at the top of the card, so
 * the phone still gets the steps without a wall of green above the fields.
 */
export function AuthSplit({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  const reduce = useReducedMotion();

  const panel = (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="w-full overflow-hidden rounded-[28px] border border-white/45 bg-surface shadow-[0_28px_70px_-30px_rgba(0,32,18,0.65),0_2px_0_rgba(255,255,255,0.6)_inset]"
    >
      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="relative overflow-hidden bg-[linear-gradient(155deg,#1d7d5b_0%,#145c42_48%,#0a3a2a_100%)] px-6 py-7 text-white sm:px-8 lg:py-10">
          {/* The same grey-green circles as the backdrop, at low strength: the
              panel reads as part of the page rather than a slab dropped on it. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/[0.07]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-black/[0.12]"
          />
          <div className="relative">{aside}</div>
        </div>

        <div className="px-6 py-7 sm:px-9 sm:py-9">{children}</div>
      </div>
    </motion.div>
  );

  return panel;
}
