/**
 * Reference geography for the pilot region, and the national region list.
 *
 * **Provenance.** Regions and the eleven Upper West districts are the published
 * administrative list (Ghana Statistical Service / Districts of Ghana; the
 * Upper West Regional Co-ordinating Council lists the same eleven). Facility
 * names and types come from the Ghana Health Service / ghanahospitals.org
 * facility directory and the public hospital list; CHPS compounds, pharmacies,
 * laboratories and private practices are excluded, per the project brief, which
 * puts the floor at health-centre level.
 *
 * **What this is not.** It is a pilot subset, not the master facility list. The
 * region has 75 sub-districts (Sub-District Health Management Teams) and several
 * hundred facilities; only the seven Nadowli-Kaleo sub-districts and the
 * hospitals, polyclinics and Wa Municipal health centres are recorded here, each
 * traceable to a published source. GHS ICT replaces this with the DHIMS2 / master
 * facility list export — the seeder upserts on (district, name), so a fuller file
 * is a drop-in replacement, not a migration.
 *
 * Anything not in this file is genuinely unknown here rather than guessed: an
 * invented sub-district would put a real training in the wrong place on a map.
 */

export interface SeedRegion {
  code: string;
  name: string;
}

/** The sixteen regions of Ghana (2019 boundaries). Upper West is the pilot. */
export const REGIONS: SeedRegion[] = [
  { code: "AA", name: "Ashanti" },
  { code: "AH", name: "Ahafo" },
  { code: "BA", name: "Bono" },
  { code: "BE", name: "Bono East" },
  { code: "CR", name: "Central" },
  { code: "ER", name: "Eastern" },
  { code: "GA", name: "Greater Accra" },
  { code: "NE", name: "North East" },
  { code: "NR", name: "Northern" },
  { code: "OT", name: "Oti" },
  { code: "SV", name: "Savannah" },
  { code: "UE", name: "Upper East" },
  { code: "UW", name: "Upper West" },
  { code: "VR", name: "Volta" },
  { code: "WN", name: "Western North" },
  { code: "WR", name: "Western" },
];

export type SeedFacilityType =
  | "REGIONAL_HOSPITAL"
  | "MUNICIPAL_HOSPITAL"
  | "DISTRICT_HOSPITAL"
  | "POLYCLINIC"
  | "HEALTH_CENTRE"
  | "CLINIC"
  | "DIRECTORATE"
  | "OTHER";

export interface SeedFacility {
  name: string;
  type: SeedFacilityType;
  ownership?: "GHS" | "CHAG" | "OTHER";
}

export interface SeedDistrict {
  name: string;
  kind: "METROPOLITAN" | "MUNICIPAL" | "DISTRICT";
  capital: string;
  /** Only where a published source names them; the rest await the GHS export. */
  subDistricts: string[];
  facilities: SeedFacility[];
}

const ghs = { ownership: "GHS" as const };

export const UPPER_WEST_DISTRICTS: SeedDistrict[] = [
  {
    name: "Wa Municipal",
    kind: "MUNICIPAL",
    capital: "Wa",
    subDistricts: [],
    facilities: [
      { name: "Upper West Regional Hospital", type: "REGIONAL_HOSPITAL", ...ghs },
      { name: "Wa Municipal Hospital", type: "MUNICIPAL_HOSPITAL", ...ghs },
      { name: "Hain Polyclinic", type: "POLYCLINIC", ...ghs },
      { name: "Bamahu Health Centre", type: "HEALTH_CENTRE", ...ghs },
      { name: "Busa Health Centre", type: "HEALTH_CENTRE", ...ghs },
      { name: "Charia Health Centre", type: "HEALTH_CENTRE", ...ghs },
      { name: "Charingu Health Centre", type: "HEALTH_CENTRE", ...ghs },
      { name: "Kambali Health Centre", type: "HEALTH_CENTRE", ...ghs },
      { name: "Market Health Centre (Wa)", type: "HEALTH_CENTRE", ...ghs },
      { name: "Urban Health Centre (Wa)", type: "HEALTH_CENTRE", ...ghs },
      { name: "WASEC Health Centre", type: "HEALTH_CENTRE", ...ghs },
    ],
  },
  {
    name: "Wa East",
    kind: "DISTRICT",
    capital: "Funsi",
    subDistricts: [],
    facilities: [],
  },
  {
    name: "Wa West",
    kind: "DISTRICT",
    capital: "Wechiau",
    subDistricts: [],
    facilities: [{ name: "Wa West District Hospital", type: "DISTRICT_HOSPITAL", ...ghs }],
  },
  {
    name: "Nadowli-Kaleo",
    kind: "DISTRICT",
    capital: "Nadowli",
    // Nadowli-Kaleo District Assembly annual progress report: seven sub-districts / area councils.
    subDistricts: ["Nadowli", "Kaleo", "Sankana", "Sombo", "Jang", "Takpo", "Charikpong"],
    facilities: [
      { name: "Nadowli District Hospital", type: "DISTRICT_HOSPITAL", ...ghs },
      { name: "Nadowli Health Centre", type: "HEALTH_CENTRE", ...ghs },
      { name: "Ahmadiyya Muslim Hospital, Kaleo", type: "DISTRICT_HOSPITAL", ownership: "OTHER" },
    ],
  },
  {
    name: "Daffiama-Bussie-Issa",
    kind: "DISTRICT",
    capital: "Issa",
    subDistricts: [],
    facilities: [
      { name: "Issa Health Centre", type: "HEALTH_CENTRE", ...ghs },
      { name: "Bussie Health Centre", type: "HEALTH_CENTRE", ...ghs },
      { name: "Fian Health Centre", type: "HEALTH_CENTRE", ...ghs },
    ],
  },
  {
    name: "Jirapa Municipal",
    kind: "MUNICIPAL",
    capital: "Jirapa",
    subDistricts: [],
    facilities: [{ name: "St Joseph's Hospital, Jirapa", type: "DISTRICT_HOSPITAL", ownership: "CHAG" }],
  },
  {
    name: "Lambussie-Karni",
    kind: "DISTRICT",
    capital: "Lambussie",
    subDistricts: [],
    facilities: [{ name: "Lambussie Polyclinic", type: "POLYCLINIC", ...ghs }],
  },
  {
    name: "Lawra Municipal",
    kind: "MUNICIPAL",
    capital: "Lawra",
    subDistricts: [],
    facilities: [{ name: "Lawra Municipal Hospital", type: "MUNICIPAL_HOSPITAL", ...ghs }],
  },
  {
    name: "Nandom Municipal",
    kind: "MUNICIPAL",
    capital: "Nandom",
    subDistricts: [],
    facilities: [{ name: "St Theresa's Hospital, Nandom", type: "DISTRICT_HOSPITAL", ownership: "CHAG" }],
  },
  {
    name: "Sissala East Municipal",
    kind: "MUNICIPAL",
    capital: "Tumu",
    subDistricts: [],
    facilities: [{ name: "Tumu Municipal Hospital", type: "MUNICIPAL_HOSPITAL", ...ghs }],
  },
  {
    name: "Sissala West",
    kind: "DISTRICT",
    capital: "Gwollu",
    subDistricts: [],
    facilities: [{ name: "Sissala West Municipal Hospital, Gwollu", type: "DISTRICT_HOSPITAL", ...ghs }],
  },
];

export const UPPER_WEST_REGION_CODE = "UW";
