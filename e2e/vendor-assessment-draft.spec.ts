import { expect, test, type Page } from "@playwright/test";

/**
 * Vendor product assessment draft persistence (P1 fix, 2026-07-07; one-page
 * contract 2026-09-08).
 *
 * Before the fix, advancing the assessment fired ZERO requests — answers lived
 * only in client state, so a reload lost everything. The assessment is now ONE
 * page (route atlas box, A3), so "position" is no longer a thing to resume; the
 * guarantee that remains, proved end-to-end against the real UI:
 *   1. type an answer -> the debounced autosave fires a real draft POST
 *   2. reload -> the typed answer is still there (answer survived)
 *   3. the page is one screen: no pager, every section present at once
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

// Always create a FRESH product so the test starts with no resumed draft — this
// suite runs against an accumulating local-review DB, so reusing a product would
// inherit a prior run's saved answers.
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

test("vendor assessment autosaves each answer and resumes it after reload (one page)", async ({ page }) => {
  await signIn(page, "review.vendor@pat.local", "/vendor");

  const opened = await createFreshProductAssessment(page);
  test.skip(!opened, "Vendor add-product surface unavailable in the local-review harness.");

  // One page: no pager, the remaining-count panel instead of a page counter.
  await expect(page.getByText(/Remaining:/)).toBeVisible();
  await expect(page.getByText(/Page:/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Continue to next page" })).toHaveCount(0);

  // Type a recognisable sentinel into the first profile field. The debounced
  // autosave must fire a real persistence request (previously fired nothing).
  const fields = page.locator(".pat-input, .pat-textarea");
  const [draftResponse] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/vendor/product-assessment/draft") && r.request().method() === "POST"),
    fields.first().fill(SENTINEL),
  ]);
  expect(draftResponse.ok()).toBeTruthy();

  // Declaring a feature opens the scored sections on the same page (no navigation).
  const checkboxes = page.getByRole("checkbox");
  if ((await checkboxes.count()) > 0) {
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/vendor/product-assessment/draft") && r.request().method() === "POST"),
      checkboxes.first().check({ force: true }),
    ]);
    await expect(page.getByTestId("vendor-assessment-stacked")).toBeVisible();
  }

  // Reload: the typed answer must survive (the core regression), on the same single page.
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".pat-input, .pat-textarea").first()).toHaveValue(SENTINEL);
  await expect(page.getByText(/Page:/)).toHaveCount(0);
});
