import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginWelcome } from "./login-welcome";

describe("the login welcome panel", () => {
  it("keeps the introduction brief and leaves sign-in instructions to Help", () => {
    const markup = renderToStaticMarkup(<LoginWelcome />);

    expect(markup).toContain("Your training resources, all in one place.");
    expect(markup).toContain("Sign in to access the training materials and tools available to you.");
    expect(markup).not.toContain("Getting started");
    expect(markup).not.toContain("Step 01");
    expect(markup).not.toContain("old portal");
  });
});
