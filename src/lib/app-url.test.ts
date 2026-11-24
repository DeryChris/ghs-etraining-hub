import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeOrigin, resolveAppUrl } from "./app-url";

describe("normalizeOrigin", () => {
  it("accepts a normal origin and drops the trailing slash", () => {
    expect(normalizeOrigin("https://ghstl.vercel.app")).toBe("https://ghstl.vercel.app");
    expect(normalizeOrigin("https://ghstl.vercel.app/")).toBe("https://ghstl.vercel.app");
    expect(normalizeOrigin("  https://ghstl.vercel.app  ")).toBe("https://ghstl.vercel.app");
  });

  it("repairs a dropped colon — the failure that broke the Vercel build", () => {
    expect(normalizeOrigin("https//ghstl.vercel.app")).toBe("https://ghstl.vercel.app");
    expect(normalizeOrigin("http//ghstl.vercel.app")).toBe("http://ghstl.vercel.app");
  });

  it("adds the scheme when it is missing entirely", () => {
    expect(normalizeOrigin("ghstl.vercel.app")).toBe("https://ghstl.vercel.app");
    expect(normalizeOrigin("//ghstl.vercel.app")).toBe("https://ghstl.vercel.app");
  });

  it("keeps the origin and discards path, query and fragment", () => {
    expect(normalizeOrigin("https://ghstl.vercel.app/dashboard?x=1#top")).toBe("https://ghstl.vercel.app");
    expect(normalizeOrigin("https://ghstl.vercel.app:8443/app")).toBe("https://ghstl.vercel.app:8443");
  });

  it("allowlists localhost but rejects a bare word", () => {
    expect(normalizeOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(normalizeOrigin("localhost:3000")).toBe("https://localhost:3000");
    expect(normalizeOrigin("ghstl")).toBeNull();
  });

  it("rejects values with no host to be found", () => {
    expect(normalizeOrigin("")).toBeNull();
    expect(normalizeOrigin("   ")).toBeNull();
    expect(normalizeOrigin(undefined)).toBeNull();
    expect(normalizeOrigin(null)).toBeNull();
    expect(normalizeOrigin("not a url")).toBeNull();
    expect(normalizeOrigin("ftp://ghstl.vercel.app")).toBeNull();
  });
});

describe("resolveAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the configured value and reports a repair", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https//ghstl.vercel.app");
    vi.stubEnv("VERCEL_URL", "ghs-etraining-hub-abc.vercel.app");
    expect(resolveAppUrl()).toMatchObject({
      url: "https://ghstl.vercel.app",
      source: "env",
      repaired: true,
    });
  });

  it("falls back to Vercel's host when the configured value is unusable", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not a url");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "ghs-etraining-hub.vercel.app");
    expect(resolveAppUrl()).toMatchObject({ url: "https://ghs-etraining-hub.vercel.app", source: "vercel" });
  });

  it("never throws, even with nothing configured", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(resolveAppUrl()).toMatchObject({ url: "http://localhost:3000", source: "localhost" });
  });
});
