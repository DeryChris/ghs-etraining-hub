import { expect, test, type Page } from "@playwright/test";

/**
 * Signed-in smoke tests. They need a migrated database with the GHS taxonomy and
 * one provisioned learner. E2E_LEARNER_EMAIL accepts either the account's work
 * email or its Staff ID because both are valid sign-in identifiers.
 *
 * Skipped (not failed) when credentials are absent, so the suite is runnable in
 * every environment without leaking them into the repository.
 */
const identifier = process.env.E2E_LEARNER_EMAIL;
const password = process.env.E2E_LEARNER_PASSWORD;
const configured = Boolean(identifier && password);

async function signIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Staff ID").fill(String(identifier));
  await page.getByLabel("Password", { exact: true }).fill(String(password));
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe("signed-in learner", () => {
  test.skip(!configured, "E2E_LEARNER_EMAIL / E2E_LEARNER_PASSWORD are not set");

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("dashboard shows a personal greeting and reading summary", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);
    await expect(page.getByRole("heading", { name: "Your reading" })).toBeVisible();
  });

  test("signed-in catalogue remains separate from public browse routes", async ({ page }) => {
    await page.goto("/catalogue");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Programme Areas and their Programme Fields");
    await expect(page.getByRole("search")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Explore Programme Areas" })).toHaveCount(0);
  });

  test("messages and complaints share the signed-in inbox", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: "Messages & complaints", exact: true })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("signing out returns to sign-in and blocks the dashboard", async ({ page }) => {
    await page.getByRole("button", { name: /Account menu/ }).click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });
});
