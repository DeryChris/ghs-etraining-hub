/** CPD accrual rules. Credits are stored as integers ×10 (e.g. 5.0 points = 50). */
export const CPD_CYCLE_TARGET_POINTS = 30;

export function pointsFromCreditsX10(creditsX10: number): number {
  return Math.round(creditsX10) / 10;
}
