import { randomBytes } from "node:crypto";

/**
 * Certificate serials are public lookups, so they must be unguessable.
 *
 * Crockford base32 (no I, L, O or U) over 50 random bits: 10 characters, no
 * ambiguous glyphs, and the space is large enough that enumeration is not a
 * realistic way to harvest staff names from the verification page. Sequential
 * serials — the obvious alternative — would turn that page into a directory.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const SERIAL_LENGTH = 10;

/** Injectable byte source keeps the generator pure and unit-testable. */
export type ByteSource = (size: number) => Uint8Array;

export function formatCertificateCode(year: number, random: ByteSource = randomBytes): string {
  const bytes = random(SERIAL_LENGTH);
  let serial = "";
  for (let index = 0; index < SERIAL_LENGTH; index += 1) {
    // 256 divides evenly by 32, so the modulo stays unbiased.
    serial += ALPHABET[(bytes[index] ?? 0) % ALPHABET.length];
  }
  return `GHS-CPD-${year}-${serial}`;
}

/** Defensive check for codes arriving from the public verification form. */
export function isCertificateCode(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^GHS-CPD-\d{4}-[0-9A-HJKMNP-TV-Z]{10}$/.test(value.trim().toUpperCase());
}
