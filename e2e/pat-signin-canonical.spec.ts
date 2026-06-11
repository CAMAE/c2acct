import { expect, test } from "@playwright/test";
import { expectConsultantSignInRouteState } from "./consultantSignInContract";

const consultantAccessEnabled = process.env.PAT_ENABLE_CONSULTANT_ACCESS === "1";

test.describe("PAT canonical sign-in routing", () => {
  test("treats /login as a compatibility-only shim into /sign-in", async ({ page }) => {
    await page.goto("/login?callbackUrl=%2Fadmin&authReset=1&authResetReason=stale_callback");
    await page.waitForURL("**/sign-in**");
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fadmin&view=admin&authReset=1&authResetReason=stale_callback/);
    await expect(page.getByText("Local auth state was cleared after a stale callback or invalid PKCE/state flow.")).toBeVisible();
  });

  test("redirects signed-out protected routes into the canonical /sign-in hub", async ({ page }) => {
    await page.goto("/firm/insights");
    await page.waitForURL("**/sign-in**");
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Ffirm%2Finsights&view=firm/);
  });

  test("keeps role-targeted sign-in deep links intact on /sign-in", async ({ page }) => {
    await page.goto("/sign-in?callbackUrl=%2Fvendor%2Fproduct-insight%2Fproduct-fixture");
    // The visible "Landing route:" panel was removed from /sign-in; the deep
    // link now travels in the credentials form's hidden redirectTo input, so
    // that is what proves the callback survives the sign-in hop.
    const redirectCarrier = page.locator(
      'input[name="redirectTo"][value="/vendor/product-insight/product-fixture"]'
    );
    await expect(redirectCarrier.first()).toBeAttached();
  });

  test("handles consultant deep links deterministically based on the consultant gate", async ({ page }) => {
    await page.goto("/sign-in?view=consultant&callbackUrl=%2Fconsultants");
    await expectConsultantSignInRouteState(page, consultantAccessEnabled);
  });
});
