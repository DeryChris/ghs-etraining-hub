import { z } from "zod";
import { TRAINING_STATUSES } from "@/lib/labels";
import { dateRangeError } from "@/lib/training-dates";

/**
 * Input shapes for the Trainings registry. Kept out of the action module so the
 * rules can be unit-tested without a database, and so the form and the action
 * cannot drift apart.
 *
 * These checks are about shape. Whether the chosen programme field really belongs
 * to the chosen field — or the facility to the district — is a database question
 * and is answered in the action, inside the same request.
 */

const uuid = z.string().uuid("Choose one of the listed options.");

const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a calendar date.");

const trainingFields = z.object({
  title: z
    .string()
    .trim()
    .min(4, "Give the training a title of at least 4 characters.")
    .max(160, "Keep the title under 160 characters."),
  year: z
    .string()
    .trim()
    .regex(/^(19|20|21)\d{2}$/, "Enter the plan year, e.g. 2026.")
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => value >= 2000 && value <= 2100, "Enter a year between 2000 and 2100."),
  programmeFieldId: uuid,
  programmeAreaId: uuid,
  targetGroup: optionalText(160),
  regionId: uuid,
  districtId: optionalUuid,
  subDistrictId: optionalUuid,
  facilityId: optionalUuid,
  startsOn: isoDate,
  endsOn: z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a calendar date."),
  durationText: optionalText(40),
  venue: optionalText(160),
  status: z.enum(TRAINING_STATUSES).default("PLANNED"),
  attendeeCount: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? Number.parseInt(value, 10) : undefined))
    .refine((value) => value === undefined || (Number.isInteger(value) && value >= 0 && value <= 5000), {
      message: "Enter the number of people trained, between 0 and 5,000.",
    }),
  notes: optionalText(1000),
});

type Range = { startsOn: string; endsOn?: string };

function checkRange(value: Range, ctx: z.RefinementCtx) {
  const error = dateRangeError(value.startsOn, value.endsOn);
  if (error) ctx.addIssue({ code: "custom", path: ["endsOn"], message: error });
}

export const trainingInput = trainingFields.strict().superRefine(checkRange);

export type TrainingInput = z.infer<typeof trainingInput>;

/** The same shape plus the row being changed. */
export const trainingUpdateInput = trainingFields
  .extend({ trainingId: uuid })
  .strict()
  .superRefine(checkRange);
