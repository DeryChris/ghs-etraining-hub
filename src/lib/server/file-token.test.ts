import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { signFileToken, verifyFileToken } from "./file-token";

const SECRET = "test-secret-0123456789abcdefghijklmnop";

describe("file tokens", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", SECRET);
  });

  it("round-trips the key and the download name", () => {
    const token = signFileToken({ purpose: "get", key: "materials/abc/v1.pdf", ttlSeconds: 60, name: "Protocol.pdf" });
    const payload = verifyFileToken(token, "get");
    expect(payload?.k).toBe("materials/abc/v1.pdf");
    expect(payload?.n).toBe("Protocol.pdf");
  });

  it("refuses a token used for the other purpose — an upload link cannot read", () => {
    const token = signFileToken({ purpose: "put", key: "materials/abc/v1.pdf", ttlSeconds: 60 });
    expect(verifyFileToken(token, "get")).toBeNull();
    expect(verifyFileToken(token, "put")?.k).toBe("materials/abc/v1.pdf");
  });

  it("refuses an expired token", () => {
    const token = signFileToken({ purpose: "get", key: "k", ttlSeconds: -1 });
    expect(verifyFileToken(token, "get")).toBeNull();
  });

  it("refuses a tampered key, because the signature covers the whole payload", () => {
    const token = signFileToken({ purpose: "get", key: "materials/mine/v1.pdf", ttlSeconds: 60 });
    const [body, signature] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ p: "get", k: "materials/someone-else/v1.pdf", e: Date.now() + 60_000 }),
    ).toString("base64url");
    expect(verifyFileToken(`${forgedBody}.${signature}`, "get")).toBeNull();
    expect(verifyFileToken(`${body}.${signature}`, "get")?.k).toBe("materials/mine/v1.pdf");
  });

  it("refuses a token signed with a different secret", () => {
    const token = signFileToken({ purpose: "get", key: "k", ttlSeconds: 60 });
    vi.stubEnv("SESSION_SECRET", "another-secret-0123456789abcdefghijkl");
    expect(verifyFileToken(token, "get")).toBeNull();
  });
});
