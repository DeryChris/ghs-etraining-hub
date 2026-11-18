import { describe, expect, it } from "vitest";
import { draftInput, finaliseInput, publishInput, reviewDecisionInput, uploadRequestInput } from "./authoring";

const MATERIAL_ID = "8f1d6a9e-3c2b-4a7d-9f10-6b5c4d3e2f1a";
const VERSION_ID = "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d";

describe("authoring schemas", () => {
  it("accepts a minimal draft", () => {
    const parsed = draftInput.safeParse({
      programmeAreaId: MATERIAL_ID,
      title: "Malaria case management refresher",
      type: "DOCUMENT",
      priority: "HIGH",
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses a draft title that is too short", () => {
    const parsed = draftInput.safeParse({ programmeAreaId: MATERIAL_ID, title: "ab", type: "DOCUMENT", priority: "LOW" });
    expect(parsed.success).toBe(false);
  });

  it("refuses unknown fields so payloads cannot smuggle state", () => {
    const parsed = draftInput.safeParse({
      programmeAreaId: MATERIAL_ID,
      title: "Valid title",
      type: "DOCUMENT",
      priority: "LOW",
      state: "PUBLISHED",
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts an upload request for an allowed type", () => {
    const parsed = uploadRequestInput.safeParse({
      materialId: MATERIAL_ID,
      fileName: "ipc-protocol.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2_000_000,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts only keys the server generated for this material", () => {
    const good = finaliseInput.safeParse({
      materialId: MATERIAL_ID,
      versionId: VERSION_ID,
      storageKey: `materials/${MATERIAL_ID}/${VERSION_ID}.pdf`,
      checksumSha256: "a".repeat(64),
    });
    expect(good.success).toBe(true);

    const traversal = finaliseInput.safeParse({
      materialId: MATERIAL_ID,
      versionId: VERSION_ID,
      storageKey: `materials/${MATERIAL_ID}/../../../etc/passwd.pdf`,
      checksumSha256: "a".repeat(64),
    });
    expect(traversal.success).toBe(false);

    const wrongPrefix = finaliseInput.safeParse({
      materialId: MATERIAL_ID,
      versionId: VERSION_ID,
      storageKey: `other/${MATERIAL_ID}/${VERSION_ID}.pdf`,
      checksumSha256: "a".repeat(64),
    });
    expect(wrongPrefix.success).toBe(false);
  });

  it("requires a sha256 checksum, not an arbitrary string", () => {
    const parsed = finaliseInput.safeParse({
      materialId: MATERIAL_ID,
      versionId: VERSION_ID,
      storageKey: `materials/${MATERIAL_ID}/${VERSION_ID}.pdf`,
      checksumSha256: "not-a-checksum",
    });
    expect(parsed.success).toBe(false);
  });

  it("limits review decisions to approved or rejected", () => {
    expect(
      reviewDecisionInput.safeParse({ materialId: MATERIAL_ID, versionId: VERSION_ID, decision: "APPROVED" }).success,
    ).toBe(true);
    expect(
      reviewDecisionInput.safeParse({ materialId: MATERIAL_ID, versionId: VERSION_ID, decision: "MAYBE" }).success,
    ).toBe(false);
  });

  it("keeps the override reason optional at the schema level", () => {
    expect(publishInput.safeParse({ materialId: MATERIAL_ID, versionId: VERSION_ID }).success).toBe(true);
    expect(publishInput.safeParse({ materialId: MATERIAL_ID, versionId: VERSION_ID, overrideReason: "Approved verbally by the CNO on 12 Nov" }).success).toBe(true);
  });
});
