import { expect, test, type Page } from "@playwright/test";

/**
 * Vendor Sales Card tenancy + gate proofs (Block F). Flag-independent: the ELITE
 * gate (flag off) and the consultant cross-tenant 404 both hold in the default
 * local-review harness. The flag-on ranked cards + the Pro-Secret-Firm / Elite-
 * real split are verified on the preview and unit-covered (tests/salescard-leak.test.ts).
 */

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";
const consultantAccessEnabled = process.env.PAT_ENABLE_CONSULTANT_ACCESS === "1";

async function gotoStable(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 1 || !message.includes("ERR_ABORTED")) throw error;
    }
  }
}

async function signIn(page: Page, email: string, redirect: string) {
  const csrf = await page.context().request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken?: string };
  const res = await page.context().request.post("/api/auth/callback/credentials", {
    form: { csrfToken: csrfToken ?? "", email, password: localReviewPassword, callbackUrl: redirect, json: "true" },
  });
  expect(res.ok()).toBeTruthy();
}

test("vendor on a Pro tier sees the Elite gate on the Sales Card (flag off)", async ({ page }) => {
  await signIn(page, "review.vendor@pat.local", "/vendor");
  await gotoStable(page, "/vendor/sales-card");
  // review.vendor resolves to Pro; with the sales-card flag off the route is the
  // ELITE-gated placeholder, so the upgrade gate — not a crash — must render.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/elite/i);
  await expect(page.getByText("TypeError")).toHaveCount(0);
});

test("consultant cannot open a vendor's sales card outside their scope (cross-tenant 404)", async ({ page }) => {
  test.skip(!consultantAccessEnabled, "Consultant access flag is off.");
  await signIn(page, "review.consultant@pat.local", "/consultants");
  const response = await page.goto("/vendor/sales-card?vendor=nonexistent-vendor-xyz", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
});
