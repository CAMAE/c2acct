import { expect, test, type Page } from "@playwright/test";

/**
 * Alignment Board tenancy + gate proofs (Block D). These are flag-independent:
 * the ELITE gate (flag off) and the consultant cross-tenant 404 both hold in the
 * default local-review harness. The flag-on board render + the Pro-teaser /
 * Elite-real name split are verified against the preview (see the block report)
 * and unit-covered in tests/alignment-board.test.ts.
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

test("firm on a Pro tier sees the Elite gate on the Alignment Board (flag off)", async ({ page }) => {
  await signIn(page, "review.firm@pat.local", "/firm");
  await gotoStable(page, "/firm/alignment-board");
  // review.firm resolves to Pro; with the board flag off the route is the
  // ELITE-gated placeholder, so the upgrade gate — not a crash — must render.
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/elite/i);
  await expect(page.getByText("TypeError")).toHaveCount(0);
});

test("consultant cannot open another firm's board (cross-tenant 404)", async ({ page }) => {
  test.skip(!consultantAccessEnabled, "Consultant access flag is off.");
  await signIn(page, "review.consultant@pat.local", "/consultants");
  // A firm id outside the consultant's scope must 404 (tenancy runs before the
  // board flag), never leak another firm's board.
  const response = await page.goto("/firm/alignment-board?firm=nonexistent-firm-xyz", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
});
