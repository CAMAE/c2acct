import { expect, test } from "@playwright/test";

/**
 * Block 17 · Track A (A1 reproduce → A2 fix). The provisioned-pilot sign-in FORM
 * (server action signInWithPilotCredentials → signIn("credentials", { redirectTo }))
 * silently bounced 3× with valid creds and no error param on the :3005 standalone,
 * while a direct credentials-callback POST succeeded — so the flake is the
 * server-action form path, not auth.
 *
 * This drives the FORM (not the callback) with a valid provisioned pilot account
 * and asserts it lands on the firm portal. RED until A2 lands; then it guards the
 * founder sign-in path in the suite (A3).
 */

const PILOT_EMAIL = "demo-firm-elite@pat.local";
const PILOT_PASSWORD = "PatEliteDemo7x";

test("provisioned-pilot form sign-in reaches the firm portal (no silent bounce)", async ({ page }) => {
  await page.goto("/sign-in?view=firm", { waitUntil: "domcontentloaded" });

  // The provisioned-pilot form for the active (firm) card.
  await page.getByPlaceholder("Provisioned pilot email").fill(PILOT_EMAIL);
  await page.getByPlaceholder("Provisioned pilot password").fill(PILOT_PASSWORD);
  await page.getByRole("button", { name: "Continue with provisioned account" }).click();

  // Desired: the session sticks and we land on the firm portal — not back on
  // /sign-in (the silent no-error bounce) and not on an error state.
  await expect(page).toHaveURL(/\/firm(\/|$|\?)/, { timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/sign-in/);
});
