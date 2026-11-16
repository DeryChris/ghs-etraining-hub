"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * A template re-mounts on every navigation, so each page eases in on arrival.
 * Motion is reduced automatically when the visitor asks for it (MotionProvider).
 */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
