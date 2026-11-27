export const ACCRA_TIME_ZONE = "Africa/Accra";

/** Calendar date key in the reporting timezone, independent of the host process timezone. */
export function dateKeyInTimeZone(date = new Date(), timeZone = ACCRA_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
