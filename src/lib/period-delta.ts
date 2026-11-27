/** Compare two equivalent reporting windows without inventing a zero baseline. */
export function periodDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

/** A truthful label for a positive current window when the comparison was empty. */
export function periodDeltaLabel(current: number, previous: number): string | null {
  return Number.isFinite(current) && current > 0 && previous === 0 ? "New activity" : null;
}
