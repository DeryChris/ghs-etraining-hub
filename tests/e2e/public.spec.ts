import { expect, test } from "@playwright/test";

/**
 * Public-surface smoke tests. The marketing pages remain available without an
 * account; the public programme hierarchy uses the database taxonomy, so run
 * that test against a migrated database seeded with reference taxonomy.
 */
test.describe("public surface", () => {
  test("landing page presents the Upper West service and is not indexed", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page).toHaveTitle(/GHS-UWRHD Training Library/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByText(/Upper West Region/).first()).toBeVisible();
  });

  test("sign-in page is keyboard reachable and labelled", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByLabel("Staff ID")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
  });

  test("signed-in surfaces stay protected while public browsing remains separate", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);

    await page.goto("/catalogue");
    await expect(page).toHaveURL(/\/login\?next=%2Fcatalogue$/);

    const publicResponse = await page.goto("/programmes");
    expect(publicResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Explore Programme Areas" })).toBeVisible();
  });

  test("off-origin next parameters are discarded", async ({ page }) => {
    await page.goto("/login?next=https%3A%2F%2Fevil.example%2Fsteal");
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    expect(page.url()).toContain("/login");
    expect(page.url()).not.toContain("evil.example");
  });

  test("public browse follows Programme Areas → Programme Fields → Training Materials", async ({ page }) => {
    const indexResponse = await page.goto("/programmes");
    expect(indexResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explore Programme Areas");
    await expect(page.getByText(/Upper West Regional Health Directorate/).first()).toBeVisible();

    const areaResponse = await page.goto("/programmes/PF-PH");
    expect(areaResponse?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Public Health");
    await page.getByRole("link", { name: "Open EPI" }).click();

    await expect(page).toHaveURL(/\/programmes\/PF-PH\/PF-PH-01$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("EPI");
    await expect(page.locator("#materials-title")).toHaveText("Training Materials");
    const countLabel = page.getByText(/^\d+ training materials? published under EPI\.$/);
    await expect(countLabel).toBeVisible();
    const countMatch = (await countLabel.textContent())?.match(/^(\d+)/);
    const publishedCount = Number(countMatch?.[1]);
    expect(Number.isInteger(publishedCount)).toBe(true);
    if (publishedCount === 0) {
      await expect(page.getByText("No training materials available yet.", { exact: true })).toBeVisible();
    } else {
      await expect(page.locator('section[aria-labelledby="materials-title"] ul li')).toHaveCount(publishedCount);
    }
    await expect(page.getByRole("link", { name: "Sign in to the Library" }).first()).toBeVisible();
    await expect(page.getByText(/Uploaded by:/)).toHaveCount(0);
  });

  test("the retired certificate verification route is not exposed publicly", async ({ page }) => {
    await page.goto("/verify");
    await expect(page).toHaveURL(/\/login\?next=%2Fverify$/);
    await expect(page.getByText(/CPD|certificate verification/i)).toHaveCount(0);
  });

  test("unknown routes are denied by default rather than disclosed", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page).toHaveURL(/\/login\?next=%2Fthis-route-does-not-exist$/);
  });
});
