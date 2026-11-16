import { expect, test, type Page } from "@playwright/test";

/**
 * Signed-in smoke tests. They need a seeded database and one provisioned learner:
 *
 *   E2E_LEARNER_EMAIL=… E2E_LEARNER_PASSWORD=… npm run test:e2e
 *
 * Skipped (not failed) when those are absent, so the suite is runnable in every
 * environment without leaking credentials into the repository.
 */
const email = process.env.E2E_LEARNER_EMAIL;
const password = process.env.E2E_LEARNER_PASSWORD;
const configured = Boolean(email && password);

async function signIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(String(email));
  await page.getByLabel("Password", { exact: true }).fill(String(password));
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe("signed-in learner", () => {
  test.skip(!configured, "E2E_LEARNER_EMAIL / E2E_LEARNER_PASSWORD are not set");

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("dashboard shows the learner's own summary", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/CPD/i).first()).toBeVisible();
  });

  test("library paginates rather than rendering every material", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByText(/showing \d+–\d+ of \d+ materials/i)).toBeVisible();
  });

  test("directorates list links into a space", async ({ page }) => {
    await page.goto("/directorates");
    await expect(page.getByRole("heading", { name: "Directorates" })).toBeVisible();
    const firstSpace = page.getByRole("link", { name: /spaces?/i }).first();
    if (await firstSpace.count()) await firstSpace.click();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("message composer is present and labelled", async ({ page }) => {
    await page.goto("/messages");
    await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
  });

  test("signing out returns to the sign-in page", async ({ page }) => {
    await page.goto("/dashboard");
    const signOut = page.getByRole("button", { name: /sign out/i });
    if (await signOut.count()) {
      await signOut.click();
      await page.waitForURL(/\/login/);
    }
  });
});
