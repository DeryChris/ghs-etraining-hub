import { describe, expect, it } from "vitest";
import { formatCertificateCode, isCertificateCode, SERIAL_LENGTH } from "./certificate-code";

describe("formatCertificateCode", () => {
  it("builds GHS-CPD-<year>-<serial> with unambiguous characters", () => {
    const code = formatCertificateCode(2026, () => new Uint8Array(SERIAL_LENGTH).fill(31));
    expect(code).toBe("GHS-CPD-2026-ZZZZZZZZZZ");
    expect(code).toMatch(/^GHS-CPD-\d{4}-[0-9A-HJKMNP-TV-Z]{10}$/);
  });

  it("never emits I, L, O or U", () => {
    for (let seed = 0; seed < 64; seed += 1) {
      const code = formatCertificateCode(2026, () => new Uint8Array(SERIAL_LENGTH).fill(seed * 4));
      expect(code.slice(-SERIAL_LENGTH)).not.toMatch(/[ILOU]/);
    }
  });

  it("is not sequential: two generations differ", () => {
    const first = formatCertificateCode(2026);
    const second = formatCertificateCode(2026);
    expect(first).not.toBe(second);
  });
});

describe("isCertificateCode", () => {
  it("accepts generated codes", () => {
    expect(isCertificateCode(formatCertificateCode(2026))).toBe(true);
    expect(isCertificateCode(" ghs-cpd-2026-7k3m9qp2x4 ")).toBe(true);
  });

  it("rejects near misses and injected values", () => {
    expect(isCertificateCode("GHS-CPD-2026-7K3M9QP2X")).toBe(false);
    expect(isCertificateCode("GHS-CPD-2026-7K3M9QP2X4O")).toBe(false);
    expect(isCertificateCode("GHS-CPD-26-7K3M9QP2X4")).toBe(false);
    expect(isCertificateCode("'; drop table certificates; --")).toBe(false);
    expect(isCertificateCode(null)).toBe(false);
  });
});
