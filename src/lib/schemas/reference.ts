import { z } from "zod";
import { DISTRICT_KINDS, FACILITY_OWNERSHIPS, FACILITY_TYPES } from "@/lib/labels";

/**
 * Input shapes for the reference-data administration surfaces
 * (/programme-fields and /geography). Small on purpose: these tables hold
 * vocabulary, and vocabulary that is hard to type correctly is vocabulary that
 * ends up inconsistent — which is the thing this whole taxonomy exists to stop.
 */

const uuid = z.string().uuid("Choose one of the listed options.");

const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const referenceName = z
  .string()
  .trim()
  .min(2, "Enter at least two characters.")
  .max(120, "Keep the name under 120 characters.")
  .refine((value) => /[a-z]/i.test(value), "Use letters, not only numbers.");

export const referenceCode = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Enter at least two characters.")
  .max(24, "Keep the code under 24 characters.")
  .regex(/^[A-Z0-9][A-Z0-9-]*$/, "Use A–Z, 0–9 and dashes only.");

const optionalCode = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value.toUpperCase() : undefined))
  .refine((value) => value === undefined || /^[A-Z0-9][A-Z0-9-]{1,23}$/.test(value), "Use A–Z, 0–9 and dashes only.");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const programmeFieldInput = z
  .object({
    name: referenceName,
    code: optionalCode,
    description: optionalText(280),
  })
  .strict();

export const programmeAreaInput = z
  .object({
    fieldId: uuid,
    name: referenceName,
    code: optionalCode,
    description: optionalText(280),
  })
  .strict();

export const regionInput = z.object({ name: referenceName, code: optionalCode }).strict();

export const districtInput = z
  .object({
    regionId: uuid,
    name: referenceName,
    kind: z.enum(DISTRICT_KINDS).default("DISTRICT"),
    capital: optionalText(120),
  })
  .strict();

export const subDistrictInput = z.object({ districtId: uuid, name: referenceName }).strict();

export const facilityInput = z
  .object({
    districtId: uuid,
    subDistrictId: optionalUuid,
    name: referenceName,
    type: z.enum(FACILITY_TYPES).default("HEALTH_CENTRE"),
    ownership: z.enum(FACILITY_OWNERSHIPS).default("GHS"),
    isActive: z
      .string()
      .optional()
      .transform((value) => value !== "false"),
  })
  .strict();

/**
 * A code the administrator did not have to invent: initials of the name, in
 * capitals. "Administration and Support Services" → "ASS". The action prefixes
 * it (PF-…) and appends a number when it is already taken, so the field stays
 * optional in the form without ever producing a duplicate.
 */
const CONNECTORS = new Set(["AND", "OF", "THE", "FOR", "TO", "IN", "ON", "AT", "A", "AN"]);

export function codeFrom(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const meaningful = words.filter((word) => !CONNECTORS.has(word.toUpperCase()));
  const source = meaningful.length > 0 ? meaningful : words;

  const initials = source.map((word) => word[0]?.toUpperCase() ?? "").join("");
  const compact = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const baseValue = initials.length >= 2 ? initials : compact.slice(0, 4);
  // A single-letter name still needs a two-character code, because every code
  // column this feeds is validated with a two-character minimum.
  const base = baseValue.length >= 2 ? baseValue : (baseValue || "R").padEnd(2, "X");
  return base.slice(0, 10);
}
