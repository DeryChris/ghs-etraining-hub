import { expect, test } from "@playwright/test";

/**
 * Smoke suite for the learner journey. Requires a seeded learner account:
 *   E2E_LEARNER_EMAIL=... E2E_LEARNER_PASSWORD=... npx playwright test
 * Skipped (not failed) when the credentials are not provided.
 */
const email = process.env.E2E_LEARNER_EMAIL ?? "";
const password = process.env.E2E_LEARNER_PASSWORD ?? "";

test.skip(!email || !password, "Set E2E_LEARNER_EMAIL and E2E_LEARNER_PASSWORD to run the smoke suite.");

test("anonymous visitors are sent to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  // The brand lives in the document title, which is where the name is rendered on
  // the sign-in screen (the wordmark itself is an image plus SITE.code).
  await expect(page).toHaveTitle(/GHS-TL/);
});

test("learner can sign in and reach every primary page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);

  const pages: Array<[string, RegExp]> = [
    ["/directorates", /Directorates/],
    ["/library", /Library/],
    ["/messages", /Messages/],
    ["/notifications", /Notifications/],
    ["/analytics", /Analytics/],
  ];
  for (const [path, heading] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
});

test("sign-out returns to sign-in and blocks the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
