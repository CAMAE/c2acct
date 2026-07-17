import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * R1 (16e checkpoint) — the notification-dropdown items must be REAL navigating
 * anchors, not display-only mark-read buttons. Regression guard: seed a nudge for
 * the local-review firm (via the admin nudge API — admins may nudge any company),
 * then sign in as that firm, open the header bell, click the notification, and
 * assert the browser navigates to the notification's CTA href.
 *
 * Requires PAT_ENABLE_PINGS=1 on the web server (the bell + nudge API are dark
 * otherwise); skipped by default so the canonical local-review suite is untouched.
 */

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";

// getLocalReviewCompanyId({ name: "Demo Company", type: FIRM }) — the firm behind
// review.firm@pat.local. See lib/auth/localReview.ts.
const DEMO_FIRM_COMPANY_ID = "demo-firm-company-demo-company";

async function signIn(page: Page, email: string, callbackUrl: string) {
  const csrfResponse = await page.context().request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const csrfBody = (await csrfResponse.json()) as { csrfToken?: string };

  const signInResponse = await page.context().request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrfBody.csrfToken ?? "",
      email,
      password: localReviewPassword,
      callbackUrl,
      json: "true",
    },
  });
  expect(signInResponse.ok()).toBeTruthy();
  const body = (await signInResponse.json().catch(() => null)) as { url?: string } | null;
  expect(body?.url?.includes("error=")).not.toBe(true);
}

test("notification dropdown item navigates to its CTA on click", async ({ page }) => {
  test.skip(
    process.env.PAT_ENABLE_PINGS !== "1",
    "Notification bell + nudge API require PAT_ENABLE_PINGS=1."
  );

  // 1) Seed a real notification for review.firm by nudging its company as admin.
  await signIn(page, "review.admin@pat.local", "/admin");
  const nudge = await page.context().request.post("/api/notifications/nudge", {
    data: { companyId: DEMO_FIRM_COMPANY_ID, audience: "firm" },
  });
  expect(nudge.ok()).toBeTruthy();

  // 2) Re-auth as the firm (overwrites the session) and open a portal page.
  await signIn(page, "review.firm@pat.local", "/firm");
  await page.goto("/firm", { waitUntil: "domcontentloaded" });

  // 3) Open the header bell; the feed is fetched client-side on open.
  const bell = page.getByRole("button", { name: /Notifications/ });
  await expect(bell).toBeVisible();
  await bell.click();

  const dialog = page.locator("#notification-bell-card");
  await expect(dialog).toBeVisible();

  // 4) The nudge item is a real anchor (href = /firm/alignment-assessment).
  const item = dialog.locator("a", { hasText: /friendly reminder/i }).first();
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute("href", /\/firm\/alignment-assessment/);

  await item.click();
  await expect(page).toHaveURL(/\/firm\/alignment-assessment/);
});
