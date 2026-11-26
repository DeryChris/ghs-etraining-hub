"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A quiet cross-fade when the tab changes.
 *
 * Six pixels of travel and a 180 ms fade: enough that the page feels like it
 * arrived rather than blinked, small enough that it never delays reading. The
 * key is the pathname, so a filter change (same route, new query) does not
 * re-animate the list the person is already scanning — that would feel like a
 * page reload for something that did not reload.
 *
 * `useReducedMotion` turns it off for anybody who has asked the operating system
 * for less movement.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
