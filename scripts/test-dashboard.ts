import { chromium } from "@playwright/test";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = await browser.newContext();
  const page = await context.newPage();

  const jsErrors: string[] = [];
  page.on("pageerror", (err) => jsErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") jsErrors.push(msg.text());
  });

  // Capture console errors specifically about dashboard queries
  const queryErrors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Failed query") || text.includes("dashboard.essential_failed")) {
      queryErrors.push(text);
    }
  });

  console.log("Navigating to http://127.0.0.1:3000/login...");
  await page.goto("http://127.0.0.1:3000/login", { waitUntil: "networkidle" });

  await page.waitForSelector('input[name="email"]', { state: "visible" });
  await page.fill('input[name="email"]', "admin@ghs.gov.gh");
  await page.fill('input[name="password"]', "change-me-12345");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  console.log("On dashboard:", page.url());
  await page.waitForTimeout(3000);

  const bodyText = await page.locator("body").textContent();
  console.log("\n=== DASHBOARD CONTENT ===");
  console.log(bodyText?.slice(0, 2000));

  console.log("\n=== JAVASCRIPT ERRORS ===");
  if (jsErrors.length > 0) {
    jsErrors.forEach((e) => console.log("  -", e));
  } else {
    console.log("  None");
  }

  console.log("\n=== QUERY ERRORS ===");
  if (queryErrors.length > 0) {
    queryErrors.forEach((e) => console.log("  -", e.slice(0, 200)));
  } else {
    console.log("  None");
  }

  // Check for specific elements
  console.log("\n=== ELEMENT CHECKS ===");
  const checks = [
    ["Dashboard heading", 'text="Dashboard"'],
    ["CPD credits", 'text="CPD credits"'],
    ["UNAUTHENTICATED error", 'text="UNAUTHENTICATED"'],
    ["Sign out button", 'text="Sign out"'],
  ];
  for (const [name, selector] of checks) {
    const count = await page.locator(selector).count();
    console.log(`${name}: ${count > 0 ? "✅ FOUND" : "❌ NOT FOUND"}`);
  }

  await page.close();
  await browser.close();
  console.log("\nTest complete!");
}

main().catch((e) => {
  console.error("❌ Test failed:", e.message);
  process.exit(1);
});
