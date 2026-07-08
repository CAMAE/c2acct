import { expect, test, type Page } from "@playwright/test";

/**
 * Vendor product assessment draft persistence (P1 fix, 2026-07-07).
 *
 * Before the fix, "Continue to next page" fired ZERO requests — answers and page
 * position lived only in client state, so a reload lost everything. This proves
 * the guarantee end-to-end against the real UI:
 *   1. type an answer on page 1, click Continue -> a draft POST actually fires
 *   2. reload -> the assessment resumes on page 2 (position survived)
 *   3. step back -> the typed answer is still there (answer survived)
 */

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";
const SENTINEL = "E2E draft sentinel positioning value";

async function signIn(page: Page, email: string, redirect: string) {
  const csrf = await page.context().request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken?: string };
  const res = await page.context().request.post("/api/auth/callback/credentials", {
    form: { csrfToken: csrfToken ?? "", email, password: localReviewPassword, callbackUrl: redirect, json: "true" },
  });
  expect(res.ok()).toBeTruthy();
}

const DETAIL_PATH = /^\/vendor\/product-assessment\/.+/;
// waitForURL matches the FULL URL (incl. origin), so this variant is unanchored.
const DETAIL_URL = /\/vendor\/product-assessment\/[^/?#]+$/;

// Always create a FRESH product so the test starts on a clean page 1 with no
// resumed draft — this suite runs against an accumulating local-review DB, so
// reusing a product would inherit a prior run's saved page position.
async function createFreshProductAssessment(page: Page): Promise<boolean> {
  await page.goto("/vendor/product-assessment?mode=add-new", { waitUntil: "domcontentloaded" });
  const nameField = page.locator('input[name="name"]');
  if ((await nameField.count()) === 0) return false;
  await nameField.fill("E2E Draft Persistence Product");
  await Promise.all([
    page.waitForURL(DETAIL_URL, { waitUntil: "commit", timeout: 20000 }),
    page.locator('form:has(input[name="name"]) button[type="submit"]').first().click(),
  ]);
  return DETAIL_PATH.test(new URL(page.url()).pathname);
}

test("vendor assessment persists on continue and resumes answer + position after reload", async ({ page }) => {
  await signIn(page, "review.vendor@pat.local", "/vendor");

  const opened = await createFreshProductAssessment(page);
  test.skip(!opened, "Vendor add-product surface unavailable in the local-review harness.");

  // Page 1 (profile). Fill every profile field so the page can advance regardless
  // of seed completeness, and seed the first field with a recognisable sentinel.
  await expect(page.getByText(/Page:/)).toContainText("1 /");
  const fields = page.locator(".pat-input, .pat-textarea");
  const fieldCount = await fields.count();
  for (let i = 0; i < fieldCount; i += 1) {
    await fields.nth(i).fill(i === 0 ? SENTINEL : "e2e");
  }
  // Ensure at least one feature is declared (page 1 gates on it). The utility
  // checkbox is an sr-only input inside a styled label, so force the check.
  const checkboxes = page.getByRole("checkbox");
  if ((await checkboxes.count()) > 0) {
    await checkboxes.first().check({ force: true });
  }

  // Continue must now fire a real persistence request (previously fired nothing).
  const [draftResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/vendor/product-assessment/draft") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Continue to next page" }).click(),
  ]);
  expect(draftResponse.ok()).toBeTruthy();
  await expect(page.getByText(/Page:/)).toContainText("2 /");

  // Reload: position must survive (this is the core regression).
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Page:/)).toContainText("2 /");

  // Step back to page 1: the typed answer must have survived the reload too.
  await page.getByRole("button", { name: "Back a page" }).click();
  await expect(page.getByText(/Page:/)).toContainText("1 /");
  await expect(page.locator(".pat-input, .pat-textarea").first()).toHaveValue(SENTINEL);
});
