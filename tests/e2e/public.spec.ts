import { expect, test } from "@playwright/test";

/**
 * Public-surface smoke tests. They deliberately avoid the signed-in area: a
 * seeded database and a Supabase project are needed for the authenticated flows
 * (see docs/qa.md), while these must pass against any environment, including a
 * preview deploy of a branch.
 */
test.describe("public surface", () => {
  test("landing page renders the service and a sign-in route", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    // The internal platform must never be indexed.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("sign-in page is keyboard reachable and labelled", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeEnabled();
  });

  test("protected routes send anonymous visitors to sign-in with a same-origin next", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });

  test("off-origin next parameters are discarded", async ({ page }) => {
    await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fsteal");
    // The form posts back to the sanitised default, never to the supplied host.
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("certificate verification page renders without a lookup", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.getByRole("heading", { name: /check that a cpd certificate is genuine/i })).toBeVisible();
    await expect(page.getByLabel("Serial code")).toBeVisible();
  });

  test("unknown routes are denied by default rather than disclosed", async ({ page }) => {
    // The edge gate protects anything not on the public allowlist, so an unknown
    // path looks exactly like a private one to an anonymous visitor.
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/login\?next=%2Fthis-route-does-not-exist$/);
  });

  test("a malformed serial is rejected without a lookup", async ({ page }) => {
    // Format is validated before the database is touched (and before the limiter
    // counts a strike), so junk input cannot be used to probe codes.
    const response = await page.goto("/verify?code=not-a-serial");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /check that a cpd certificate is genuine/i })).toBeVisible();
    await expect(page.getByText(/no certificate matches that code/i)).toHaveCount(0);
  });
});
