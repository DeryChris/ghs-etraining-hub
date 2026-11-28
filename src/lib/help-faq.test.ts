import { describe, expect, it } from "vitest";
import { filterHelpFaqs, HELP_FAQ_CATEGORIES } from "@/lib/help-faq";

describe("filterHelpFaqs", () => {
  it("matches question and answer text without case sensitivity", () => {
    const results = filterHelpFaqs({ query: "STAFF ID" });
    const matches = results.flatMap((category) => category.items);

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((item) => item.question.includes("Staff ID"))).toBe(true);
  });

  it("supports useful search phrases that are not exact question text", () => {
    const documentResults = filterHelpFaqs({ query: "document versions" });
    const staffResults = filterHelpFaqs({ query: "missing staff record" });
    const downloadResults = filterHelpFaqs({ query: "download materials" });

    expect(documentResults.flatMap((category) => category.items).map((item) => item.id)).toContain("older-file-version");
    expect(staffResults.flatMap((category) => category.items).map((item) => item.id)).toContain("staff-id-not-recognised");
    expect(downloadResults.flatMap((category) => category.items).map((item) => item.id)).toContain("preview-download-files");
  });

  it("can limit results to a selected category", () => {
    const results = filterHelpFaqs({ query: "unclaimed record", categoryId: "getting-started" });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("getting-started");
    expect(results[0]?.items.map((item) => item.id)).toEqual(["sign-in-or-register"]);
  });

  it("restores every FAQ when the search is cleared", () => {
    const results = filterHelpFaqs({ query: "" });
    const resultCount = results.reduce((total, category) => total + category.items.length, 0);
    const expectedCount = HELP_FAQ_CATEGORIES.reduce((total, category) => total + category.items.length, 0);

    expect(resultCount).toBe(expectedCount);
    expect(results).toHaveLength(HELP_FAQ_CATEGORIES.length);
  });
});
