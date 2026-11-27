import { describe, expect, it } from "vitest";
import { accessResetResponse, redactLegacyTemporaryPassword } from "@/lib/complaint-response";

describe("complaint responses", () => {
  it("saves a public reset answer without the generated password", () => {
    const response = accessResetResponse("Your email has been corrected.");

    expect(response).toContain("Your email has been corrected.");
    expect(response).toContain("The temporary password is not included in this answer");
    expect(response).not.toMatch(/temporary password\s*:\s*\S+/i);
  });

  it("redacts a legacy temporary password before status lookup returns the response", () => {
    const password = "ABCD-EFGH-IJKL";
    const persisted = `Access reset. Temporary password: ${password}. Sign in with it and change it straight away.`;
    const publicResponse = redactLegacyTemporaryPassword(persisted);

    expect(publicResponse).not.toContain(password);
    expect(publicResponse).toContain("Temporary password: [provided separately]");
  });

  it("leaves ordinary answers and empty responses unchanged", () => {
    expect(redactLegacyTemporaryPassword("Your account is active again.")).toBe("Your account is active again.");
    expect(redactLegacyTemporaryPassword(null)).toBeNull();
  });
});
