/**
 * Public site facts. Contact details come from environment variables and are never
 * invented: when a value is not configured, the page says how to get it instead.
 */
export const SITE = {
  name: "GHS-ELN",
  fullName: "Ghana Health Service eLearning Network",
  regionCount: 16,
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? null,
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? null,
  policyUpdated: "13 January 2026",
} as const;

export const PRIMARY_NAV = [
  { href: "/programmes", label: "Programmes" },
  { href: "/about", label: "About" },
  { href: "/verify", label: "Verify certificate" },
  { href: "/contact", label: "Contact" },
] as const;
