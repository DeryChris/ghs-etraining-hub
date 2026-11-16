import { describe, expect, it } from "vitest";
import { downloadFileName, extensionForMime } from "./file-name";

describe("extensionForMime", () => {
  it("maps the allowlisted document and media types", () => {
    expect(extensionForMime("application/pdf")).toBe("pdf");
    expect(extensionForMime("video/mp4")).toBe("mp4");
    expect(extensionForMime("text/markdown")).toBe("md");
    expect(extensionForMime("image/jpeg")).toBe("jpg");
  });

  it("ignores parameters and casing", () => {
    expect(extensionForMime("Application/PDF; charset=binary")).toBe("pdf");
  });

  it("returns null for unknown or absent types instead of guessing", () => {
    expect(extensionForMime("application/x-unknown")).toBeNull();
    expect(extensionForMime(null)).toBeNull();
    expect(extensionForMime(undefined)).toBeNull();
  });
});

describe("downloadFileName", () => {
  it("uses the stored MIME type rather than assuming PDF", () => {
    expect(downloadFileName("IPC Core Protocol 2026", "video/mp4")).toBe("IPC_Core_Protocol_2026.mp4");
    expect(downloadFileName("IPC Core Protocol 2026", "application/pdf")).toBe("IPC_Core_Protocol_2026.pdf");
  });

  it("strips path and quoting characters from the title", () => {
    expect(downloadFileName('../../etc/passwd"', "application/pdf")).toBe("etc_passwd.pdf");
    expect(downloadFileName("A/B\\C:D", "text/markdown")).toBe("A_B_C_D.md");
  });

  it("never returns an empty or dot-leading name", () => {
    expect(downloadFileName("   ", "application/pdf")).toBe("material.pdf");
    expect(downloadFileName("...", "application/pdf")).toBe("material.pdf");
  });

  it("caps long titles", () => {
    const name = downloadFileName("A".repeat(300), "application/pdf");
    expect(name.length).toBeLessThanOrEqual(84);
    expect(name.endsWith(".pdf")).toBe(true);
  });

  it("adds no extension when the type is unknown", () => {
    expect(downloadFileName("Cold chain poster", null)).toBe("Cold_chain_poster");
  });
});
