import { chromium } from "@playwright/test";

/** Block B deliverable screenshots. Requires a running server on --base. */
const BASE = process.argv.find((a) => a.startsWith("--base="))?.split("=")[1] ?? "http://127.0.0.1:3002";
const OUT = "artifacts/blockb-screenshots";
const EMAIL = "review.firm@pat.local";
const PASSWORD = process.argv.find((a) => a.startsWith("--password="))?.split("=")[1] ?? "";
const TAG = process.argv.find((a) => a.startsWith("--tag="))?.split("=")[1] ?? "on";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  // Auth via the credentials callback, same shape as the e2e suite.
  const csrf = await (await context.request.get(`${BASE}/api/auth/csrf`)).json();
  await context.request.post(`${BASE}/api/auth/callback/credentials`, {
    form: { csrfToken: csrf.csrfToken, email: EMAIL, password: PASSWORD, redirectTo: "/firm" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });

  await page.goto(`${BASE}/firm`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/0-firm-portal-${TAG}.png`, fullPage: true });
  console.log(`portal: ${page.url()}`);

  const modules = await page.goto(`${BASE}/firm/modules`, { waitUntil: "networkidle" });
  console.log(`/firm/modules status: ${modules?.status()}`);
  await page.screenshot({ path: `${OUT}/a-cards-${TAG}.png`, fullPage: true });

  if (modules?.status() === 200) {
    // (b) in-progress item view — the Strength module has 2 of 6 answered.
    const resume = page.locator('a:has-text("Resume module"), button:has-text("Resume module")').first();
    if (await resume.count()) {
      // Server action + redirect(): wait for the URL to actually change.
      await Promise.all([page.waitForURL(/\/firm\/modules\/.+/, { timeout: 20000 }), resume.click()]);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `${OUT}/b-item-view-${TAG}.png`, fullPage: true });
      console.log(`item view: ${page.url()}`);
    }

    // (c) completion view — the Diagnostic module is COMPLETED.
    await page.goto(`${BASE}/firm/modules`, { waitUntil: "networkidle" });
    const review = page.locator('a:has-text("Review module"), button:has-text("Review module")').first();
    if (await review.count()) {
      await Promise.all([page.waitForURL(/\/firm\/modules\/.+/, { timeout: 20000 }), review.click()]);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `${OUT}/c-completion-${TAG}.png`, fullPage: true });
      console.log(`completion: ${page.url()}`);
    }
  }

  await browser.close();
}
main().catch((e) => { console.error("shots failed:", e); process.exit(1); });
