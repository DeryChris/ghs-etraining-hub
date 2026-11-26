import { describe, expect, it } from "vitest";
import { canonicalJson, computeAuditHash, redactMetadata } from "./audit-hash";

describe("redactMetadata", () => {
  it("redacts personal identifiers at any depth, including inside arrays", () => {
    const out = redactMetadata({
      email: "a@ghs.gov.gh",
      nested: { phone: "+233200000000", note: "kept" },
      list: [{ staffId: "GHS-000001" }],
    });
    expect(out).toEqual({
      email: "[REDACTED]",
      nested: { phone: "[REDACTED]", note: "kept" },
      list: [{ staffId: "[REDACTED]" }],
    });
  });
});

describe("canonicalJson", () => {
  it("is independent of key insertion order", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
  });
});

describe("computeAuditHash", () => {
  const base = {
    prevHash: null,
    actorId: "user-1",
    action: "MATERIAL_ACKNOWLEDGED",
    entity: "Material",
    entityId: "material-1",
    metadata: { versionId: "v1" },
    createdAt: "2026-01-13T10:00:00.000Z",
  };

  it("is deterministic for identical input", () => {
    expect(computeAuditHash(base)).toBe(computeAuditHash({ ...base }));
  });

  it("changes when any field changes (tamper evidence)", () => {
    const original = computeAuditHash(base);
    expect(computeAuditHash({ ...base, action: "MATERIAL_STARTED" })).not.toBe(original);
    expect(computeAuditHash({ ...base, actorId: "user-2" })).not.toBe(original);
    expect(computeAuditHash({ ...base, createdAt: "2026-01-13T10:00:00.001Z" })).not.toBe(original);
    expect(computeAuditHash({ ...base, metadata: { versionId: "v2" } })).not.toBe(original);
  });

  it("chains: altering a previous hash changes every following hash", () => {
    const first = computeAuditHash(base);
    const second = computeAuditHash({ ...base, prevHash: first, createdAt: "2026-01-13T10:00:01.000Z" });
    const tampered = computeAuditHash({ ...base, prevHash: "0".repeat(64), createdAt: "2026-01-13T10:00:01.000Z" });
    expect(second).not.toBe(tampered);
  });
});
