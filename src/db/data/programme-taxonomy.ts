/**
 * The programme taxonomy GHS supplied: ten fields, each holding the areas that
 * appear on a training plan. Source: "Programme Fields and Sub-Areas" (GHS,
 * 2026), handed over with the Trainings brief.
 *
 * Two editorial decisions, both reversible from /programme-fields:
 *   · spellings are corrected and title-cased ("Adminstration" → "Administration",
 *     "rehablitation" → "Rehabilitation", "advocay" → "Advocacy"), because these
 *     strings end up on plans and reports;
 *   · the order in the document is kept (sortOrder), so the pickers read the way
 *     the source reads rather than alphabetically.
 *
 * Codes are stable: `PF-<FIELD>` for a field, `PF-<FIELD>-<nn>` for an area.
 * They appear in exports, so they are written once and never renumbered.
 */

export interface ProgrammeAreaSeed {
  code: string;
  name: string;
}

export interface ProgrammeFieldSeed {
  code: string;
  name: string;
  areas: readonly ProgrammeAreaSeed[];
}

function areas(fieldCode: string, names: readonly string[]): ProgrammeAreaSeed[] {
  return names.map((name, index) => ({
    code: `${fieldCode}-${String(index + 1).padStart(2, "0")}`,
    name,
  }));
}

export const PROGRAMME_FIELDS: readonly ProgrammeFieldSeed[] = [
  {
    code: "PF-ADM",
    name: "Administration and Support Services",
    areas: areas("PF-ADM", [
      "Biomedical Equipment",
      "Estate Management",
      "Health Administration",
      "Transport Management",
    ]),
  },
  {
    code: "PF-CLIN",
    name: "Clinical Care",
    areas: areas("PF-CLIN", [
      "Clinical Information and Monitoring",
      "Clinical Service Development",
      "Quality Assurance",
    ]),
  },
  {
    code: "PF-FAM",
    name: "Family and Health",
    areas: areas("PF-FAM", ["Nutrition", "Reproductive and Child Health"]),
  },
  {
    code: "PF-FIN",
    name: "Finance and Audit",
    areas: areas("PF-FIN", [
      "Control and Compliance",
      "Financial Information Systems Management (FISM)",
      "Financial Reporting and Analysis",
      "Performance Audit",
    ]),
  },
  {
    code: "PF-HPR",
    name: "Health Promotion",
    areas: areas("PF-HPR", [
      "Advocacy and Social Mobilisation",
      "Anaesthesia",
      "Case Management",
      "Diagnostic Services",
      "Health Communication",
      "Mental Health",
      "Nursing Practice",
      "Pharmacy",
      "Rehabilitation",
      "Research and Health Policy",
    ]),
  },
  {
    code: "PF-HR",
    name: "Human Resource",
    areas: areas("PF-HR", ["Management", "Planning", "Training"]),
  },
  {
    code: "PF-PPME",
    name: "Policy, Planning, Monitoring and Evaluation",
    areas: areas("PF-PPME", [
      "Information Communication Technology",
      "Monitoring and Evaluation",
      "Planning and Budget",
      "Policy",
    ]),
  },
  {
    code: "PF-PH",
    name: "Public Health",
    areas: areas("PF-PH", ["EPI", "NACP", "NMCP", "NTCP", "Occupational Health", "Surveillance"]),
  },
  {
    code: "PF-RD",
    name: "Research and Development",
    areas: areas("PF-RD", [
      "Dissemination, Documentation and Advocacy",
      "Ethics and Research Management",
      "Research Coordination",
    ]),
  },
  {
    code: "PF-SCM",
    name: "Supply Chain Management",
    areas: areas("PF-SCM", ["Procurement", "Supply Chain Management"]),
  },
];

/** Every area in the catalogue, flattened — used by the seeder and its test. */
export function flatProgrammeAreas(): { fieldCode: string; code: string; name: string }[] {
  return PROGRAMME_FIELDS.flatMap((field) =>
    field.areas.map((area) => ({ fieldCode: field.code, code: area.code, name: area.name })),
  );
}
