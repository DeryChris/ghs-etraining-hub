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
 *   `name`     — headings and body copy ("Open the GHS Training Library").
 *   `fullName` — first mention on a page, legal documents, metadata/OG titles.
 */
export const SITE = {
  /** Abbreviated form. Wordmark, title template, favicon label. */
  code: "GHS-TL",
  /** Short display form. Headings, body copy, buttons. */
  name: "GHS Training Library",
  /** Registered long form. Legal pages, first mentions, metadata. */
  fullName: "Ghana Health Service Training Library",
  /** Second line of the wordmark. */
  tagline: "Training Library",
  /** One sentence. Shell footers, share cards, structured data. */
  purpose: "Every Ghana Health Service training programme, with its materials catalogued, versioned and traceable.",
  /** Metadata description: what the service is, for a search result or share card. */
  description:
    "The Ghana Health Service Training Library keeps the material from every GHS training programme — slides, protocols, videos and references — catalogued by programme and module, versioned, and traceable to the people who uploaded, reviewed and downloaded it.",
  regionCount: 16,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? null,
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? null,
  policyUpdated: "16 November 2026",
} as const;

export const PRIMARY_NAV = [
  { href: "/programmes", label: "Programmes" },
  { href: "/about", label: "About" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" },
] as const;
