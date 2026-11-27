import { describe, expect, it } from "vitest";
import {
  canPublish,
  canTransition,
  checkUpload,
  materialStorageKey,
  nextVersionNumber,
  publishBlockers,
  type PublishContext,
} from "./material-workflow";

const materialId = "8f14e45f-ceea-467f-a3f5-2b0d1b9f7a1c";
const uuid = "2c1f0f9e-1a2b-4c3d-8e9f-0a1b2c3d4e5f";

describe("state machine", () => {
  it("allows the documented lifecycle", () => {
    expect(canTransition("DRAFT", "IN_REVIEW")).toBe(true);
    expect(canTransition("IN_REVIEW", "PUBLISHED")).toBe(true);
    expect(canTransition("PUBLISHED", "SUPERSEDED")).toBe(true);
    expect(canTransition("PUBLISHED", "ARCHIVED")).toBe(true);
  });

  it("refuses shortcuts, including publishing a draft", () => {
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(false);
    expect(canTransition("SUPERSEDED", "PUBLISHED")).toBe(false);
    expect(canTransition("ARCHIVED", "PUBLISHED")).toBe(false);
    expect(canTransition("ARCHIVED", "DRAFT")).toBe(false);
  });
});

describe("version numbering", () => {
  it("starts at 1 and continues from the highest", () => {
    expect(nextVersionNumber([])).toBe(1);
    expect(nextVersionNumber([1])).toBe(2);
    expect(nextVersionNumber([1, 2, 5])).toBe(6);
  });
});

describe("storage keys", () => {
  it("are opaque, material-scoped and immutable", () => {
    expect(materialStorageKey(materialId, "pdf", uuid)).toBe(`materials/${materialId}/${uuid}.pdf`);
    expect(materialStorageKey(materialId, "mp4", uuid)).not.toContain("v1");
  });

  it("rejects anything that is not a uuid or safe extension", () => {
    expect(() => materialStorageKey("../../etc/passwd", "pdf", uuid)).toThrow();
    expect(() => materialStorageKey(materialId, "../pdf", uuid)).toThrow();
    expect(() => materialStorageKey(materialId, "pdf", "not-a-uuid")).toThrow();
  });
});

describe("upload checks", () => {
  it("accepts the allowlisted types and returns the extension", () => {
    expect(checkUpload("application/pdf", 1024)).toEqual({ ok: true, extension: "pdf" });
    expect(checkUpload("video/mp4", 1024)).toEqual({ ok: true, extension: "mp4" });
    expect(checkUpload("text/markdown; charset=utf-8", 1024)).toEqual({ ok: true, extension: "md" });
  });

  it("refuses other types with a plain-English reason", () => {
    const result = checkUpload("application/x-msdownload", 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/not accepted/i);
  });

  it("enforces the per-type size limits", () => {
    const tooBigPdf = checkUpload("application/pdf", 26 * 1024 * 1024);
    expect(tooBigPdf.ok).toBe(false);
    if (!tooBigPdf.ok) expect(tooBigPdf.message).toMatch(/limit/i);

    // A 16 MB video is fine; the limit is per type, not global.
    expect(checkUpload("video/mp4", 16 * 1024 * 1024).ok).toBe(true);
  });

  it("refuses empty files and non-finite sizes", () => {
    expect(checkUpload("application/pdf", 0).ok).toBe(false);
    expect(checkUpload("application/pdf", Number.NaN).ok).toBe(false);
  });
});

describe("publishing rules", () => {
  const base: PublishContext = {
    versionState: "IN_REVIEW",
    uploadedById: "author",
    publisherId: "reviewer",
    publisherRole: "FACILITATOR",
    approvals: [{ reviewerId: "reviewer", decision: "APPROVED" }],
  };

  it("allows a colleague's approved version to be published", () => {
    expect(canPublish(base)).toBe(true);
    expect(publishBlockers(base)).toEqual([]);
  });

  it("refuses self-publishing even with someone else's approval", () => {
    const selfPublish = { ...base, publisherId: "author" };
    expect(canPublish(selfPublish)).toBe(false);
    expect(publishBlockers(selfPublish).join(" ")).toMatch(/colleague must publish/i);
  });

  it("refuses to publish without an approval from someone other than the uploader", () => {
    expect(canPublish({ ...base, approvals: [] })).toBe(false);
    // The uploader approving their own work does not count.
    expect(canPublish({ ...base, approvals: [{ reviewerId: "author", decision: "APPROVED" }] })).toBe(false);
    // A rejection is not an approval.
    expect(canPublish({ ...base, approvals: [{ reviewerId: "reviewer", decision: "REJECTED" }] })).toBe(false);
  });

  it("refuses versions that are not in review", () => {
    for (const state of ["DRAFT", "PUBLISHED", "SUPERSEDED", "ARCHIVED"] as const) {
      expect(canPublish({ ...base, versionState: state })).toBe(false);
    }
  });

  it("lets a SYSTEM_ADMIN override only with a substantive written reason", () => {
    const override = {
      ...base,
      publisherId: "author",
      publisherRole: "SYSTEM_ADMIN" as const,
      approvals: [],
      overrideReason: "Directorate emergency release approved by the DPO",
    };
    expect(canPublish(override)).toBe(true);

    expect(canPublish({ ...override, overrideReason: null })).toBe(false);
    expect(canPublish({ ...override, overrideReason: "too short" })).toBe(false);
    // A facilitator cannot override, however good the reason.
    expect(canPublish({ ...override, publisherRole: "FACILITATOR" })).toBe(false);
  });
});
