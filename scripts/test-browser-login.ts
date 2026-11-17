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

  console.log("Navigating to http://127.0.0.1:3000/login...");
  await page.goto("http://127.0.0.1:3000/login", { waitUntil: "networkidle" });

  await page.waitForSelector('input[name="email"]', { state: "visible" });
  await page.fill('input[name="email"]', "admin@ghs.gov.gh");
  await page.fill('input[name="password"]', "change-me-12345");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  console.log("On dashboard:", page.url());

  // Get all visible text
  const bodyText = await page.locator("body").textContent();
  console.log("\n=== DASHBOARD CONTENT ===");
  console.log(bodyText);

  // Check for specific elements
  console.log("\n=== ELEMENT CHECKS ===");
  const checks = [
    ["Dashboard heading", 'text="Dashboard"'],
    ["CPD credits", 'text="CPD credits"'],
    ["Good morning/afternoon/evening", 'text=/Good (morning|afternoon|evening)/'],
    ["UNAUTHENTICATED error", 'text="UNAUTHENTICATED"'],
    ["Sign out button", 'text="Sign out"'],
    ["Library link", 'text="Browse library"'],
  ];
  for (const [name, selector] of checks) {
    const count = await page.locator(selector).count();
    console.log(`${name}: ${count > 0 ? "✅ FOUND" : "❌ NOT FOUND"}`);
  }

  // Print JS errors
  if (jsErrors.length > 0) {
    console.log("\n=== JAVASCRIPT ERRORS ===");
    jsErrors.forEach((e) => console.log("  -", e));
  }

  // Check cookies
  const cookies = await context.cookies();
  console.log("\n=== COOKIES ===");
  cookies.forEach((c) => console.log(`  ${c.name}: ${c.value.slice(0, 40)}...`));

  await page.close();
  await browser.close();
}

main().catch((e) => {
  console.error("❌ Test failed:", e.message);
  process.exit(1);
});
