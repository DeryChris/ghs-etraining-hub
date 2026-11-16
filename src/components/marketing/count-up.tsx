"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";

/** Counts up to a value the first time it is seen. Jumps straight there for reduced motion. */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const display = useTransform(count, (latest) => Math.round(latest).toLocaleString("en-GB"));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 1.6, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, reduce, value, count]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}
