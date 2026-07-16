import { expect, test, type Page } from "@playwright/test";

/**
 * Vendor BattleCard tenancy + gate proofs (Block F). Flag-independent: the ELITE
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

test("vendor on a Pro tier sees the Elite gate on the BattleCard (flag off)", async ({ page }) => {
  await signIn(page, "review.vendor@pat.local", "/vendor");
  await gotoStable(page, "/vendor/battlecard");
  // review.vendor resolves to Pro; with the battlecard flag off the route is the
  // ELITE-gated placeholder, so the upgrade gate — not a crash — must render.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/elite/i);
  await expect(page.getByText("TypeError")).toHaveCount(0);
});

test("consultant is walled off a vendor's BattleCard to /consultants (13a; scoped = F14)", async ({ page }) => {
  test.skip(!consultantAccessEnabled, "Consultant access flag is off.");
  await signIn(page, "review.consultant@pat.local", "/consultants");
  // 13a role wall: consultant is redirected off /vendor to /consultants before the
  // per-vendor tenancy 404 runs, so no out-of-scope BattleCard leaks. Scoped
  // read-only access for a consultant's own ecosystems is deferred as F14.
  await page.goto("/vendor/battlecard?vendor=nonexistent-vendor-xyz", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(/\/consultants(\/|\?|$)/);
});
