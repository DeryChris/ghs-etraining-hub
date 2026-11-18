/**
 * Date arithmetic for a training plan, kept pure so it can be tested without a
 * database and shared by the form (instant feedback) and the Server Action
 * (the same rule, applied where it counts).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole days between two ISO dates, inclusive of both ends. Null if unusable. */
export function inclusiveDayCount(startsOn: string | null | undefined, endsOn: string | null | undefined): number | null {
  if (!startsOn || !endsOn) return null;
  if (!ISO_DATE.test(startsOn) || !ISO_DATE.test(endsOn)) return null;
  const start = Date.parse(`${startsOn}T00:00:00Z`);
  const end = Date.parse(`${endsOn}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const days = Math.round((end - start) / 86_400_000) + 1;
  return days > 0 ? days : null;
}

/**
 * "3 days" — what the duration box says when the dates are known. A same-day
 * training is one day, not zero.
 */
export function durationLabel(startsOn: string | null | undefined, endsOn: string | null | undefined): string | null {
  const days = inclusiveDayCount(startsOn, endsOn);
  if (days === null) return null;
  return days === 1 ? "1 day" : `${days} days`;
}

/** The plan year a start date belongs to, e.g. "2026-03-04" → 2026. */
export function planYearOf(startsOn: string | null | undefined): number | null {
  if (!startsOn || !ISO_DATE.test(startsOn)) return null;
  const year = Number.parseInt(startsOn.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

/**
 * The one rule the form and the action must agree on: a training cannot end
 * before it starts. Returns a sentence for the user, or null when it is fine.
 */
export function dateRangeError(startsOn: string, endsOn: string | null | undefined): string | null {
  if (!ISO_DATE.test(startsOn)) return "Enter the date the training starts.";
  if (!endsOn) return null;
  if (!ISO_DATE.test(endsOn)) return "Enter the end date as a calendar date, or leave it empty.";
  if (endsOn < startsOn) return "The end date cannot be before the start date.";
  return null;
}

/** Every year a plan may be filed under, newest first, for a filter list. */
export function yearRange(newest = new Date().getFullYear() + 1, oldest = 2024): number[] {
  const years: number[] = [];
  for (let year = newest; year >= oldest; year -= 1) years.push(year);
  return years;
}
