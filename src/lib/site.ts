/**
 * The single source of truth for the product's name and public facts.
 *
 * Nothing else in the codebase may hard-code the system name: pages, metadata,
 * e-mails and shell chrome read from here, so a rename is one edit and the long,
 * short and abbreviated forms can never drift apart. Contact details come from
 * environment variables and are never invented: when a value is not configured,
 * the page says how to get it instead.
 *
 * Which form to use where:
 *   `code`     — the wordmark, browser-title suffixes, tight UI chrome.
 *   `name`     — headings and body copy ("Open the GHS-UWRHD Training Library").
 *   `fullName` — first mention on a page, legal documents, metadata/OG titles.
 */
export const SITE = {
  /** Abbreviated form. Wordmark, title template, favicon label. */
  code: "GHS-UWRHD-TL",
  /** Short display form. Headings, body copy, buttons. */
  name: "GHS-UWRHD Training Library",
  /** Registered long form. Legal pages, first mentions, metadata. */
  fullName:
    "Ghana Health Service – Upper West Regional Health Directorate – Training Library",
  /** Institutional parent, for lockups and footers. */
  institution: "Ghana Health Service",
  /** Regional authority the platform serves. */
  authority: "Upper West Regional Health Directorate",
  /** Second line of the wordmark. */
  tagline: "Training Library",
  /** One sentence. Shell footers, share cards, structured data. */
  purpose:
    "A centralised digital platform for organising, managing and accessing institutional training materials across the Upper West Region.",
  /** Metadata description: what the service is, for a search result or share card. */
  description:
    "Access and manage training materials from the Ghana Health Service Upper West Regional Health Directorate through a centralised, organised and version-controlled digital library.",
  /** The single regional scope of the platform. No other region is served. */
  regionName: "Upper West Region",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? null,
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? null,
  policyUpdated: "16 November 2026",
} as const;

export const PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/programmes", label: "Programme Areas" },
  { href: "/catalogue", label: "Library" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
] as const;

/** The Library is a signed-in destination, not a public-header link. */
export function primaryNavFor(signedIn: boolean): readonly (typeof PRIMARY_NAV)[number][] {
  return PRIMARY_NAV.filter((item) => signedIn || item.href !== "/catalogue");
}
