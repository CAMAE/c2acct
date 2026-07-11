import { expect, test, type Page } from "@playwright/test";

/**
 * Audience guard (B5-4). A signed-in account on the wrong customer portal is
 * redirected server-side to its own portal home; consultant/admin are unaffected.
 * Live repro this fixes: a firm account served /vendor rendered an empty vendor
 * page ("Vendor company: <firm name>, Products: 0") instead of redirecting.
 */

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";

async function signIn(page: Page, email: string, redirect: string) {
  const csrf = await page.context().request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken?: string };
  const res = await page.context().request.post("/api/auth/callback/credentials", {
    form: { csrfToken: csrfToken ?? "", email, password: localReviewPassword, callbackUrl: redirect, json: "true" },
  });
  expect(res.ok()).toBeTruthy();
}

test("firm account on /vendor is redirected to /firm", async ({ page }) => {
  await signIn(page, "review.firm@pat.local", "/firm");
  await page.goto("/vendor", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/firm(\/|\?|$)/);
});

test("vendor account on /firm is redirected to /vendor", async ({ page }) => {
  await signIn(page, "review.vendor@pat.local", "/vendor");
  await page.goto("/firm", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/vendor(\/|\?|$)/);
});

test("consultant is not audience-redirected (may view firm + vendor)", async ({ page }) => {
  await signIn(page, "review.consultant@pat.local", "/consultants");
  await page.goto("/firm", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/firm(\/|\?|$)/);
  await page.goto("/vendor", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/vendor(\/|\?|$)/);
});
