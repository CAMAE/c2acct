import { expect, test, type Page } from "@playwright/test";

/**
 * Audience guard (B5-4, hardened by 13a role wall). A signed-in account on a
 * portal that is not its audience home is redirected server-side to its own home.
 * 13a closed the P0 where a consultant/admin reached the firm/vendor workspaces:
 * a consultant is now walled to /consultants. (Scoped consultant read-only board
 * access is deferred as F14 — a proper scoped authorization check, never a route
 * exemption; see the founders-preview ledger.)
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

test("consultant is walled off /firm and /vendor to /consultants (13a role wall)", async ({ page }) => {
  await signIn(page, "review.consultant@pat.local", "/consultants");
  await page.goto("/firm", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/consultants(\/|\?|$)/);
  await page.goto("/vendor", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/consultants(\/|\?|$)/);
});
