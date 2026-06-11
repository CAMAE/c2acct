import { expect, test, type Page } from "@playwright/test";

/**
 * /create-account wizard. The flag state is probed at runtime (the standalone
 * e2e server reads its own env): with PAT_ENABLE_SELF_SIGNUP off — the pilot
 * default — /create-account must redirect to the canonical sign-in hub; with
 * the flag on, the full wizard provisions an org + owner through the shared
 * seam and hands off to the membership checkout scaffold.
 */

async function selfSignupIsLive(page: Page) {
  await page.goto("/create-account");
  await page.waitForURL(/\/(create-account|sign-in)/);
  return page.url().includes("/create-account");
}

test("flag off: /create-account ships dark and redirects to sign-in", async ({ page }) => {
  const live = await selfSignupIsLive(page);
  test.skip(live, "PAT_ENABLE_SELF_SIGNUP=1 on this server; dark-state redirect is asserted when the flag is off.");

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByText("Which best describes you?")).toHaveCount(0);
});

test("flag on: wizard creates a firm account through the seam and lands on checkout", async ({ page }) => {
  const live = await selfSignupIsLive(page);
  test.skip(!live, "PAT_ENABLE_SELF_SIGNUP is off on this server; run with the flag on to exercise the wizard.");

  // Step 1: role
  await expect(page.getByRole("heading", { name: "Which best describes you?" })).toBeVisible();
  await page.getByRole("button", { name: /I run or work at an accounting firm/ }).click();

  // Step 2: organization name + size
  await expect(page.getByRole("heading", { name: "Tell us about your firm" })).toBeVisible();
  const runId = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  await page.getByPlaceholder("e.g. Garrett & Garrett CPAs").fill(`E2E Firm ${runId}`);
  await page.getByRole("button", { name: "2–4", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 3: primary goal
  await expect(page.getByRole("heading", { name: "What brings you to PAT?" })).toBeVisible();
  await page.getByRole("button", { name: /Get an alignment baseline/ }).click();

  // Step 4: plan (Pro + Elite only)
  await expect(page.getByRole("heading", { name: "Choose your plan" })).toBeVisible();
  await expect(page.getByText("Free", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Pro\b/ }).first().click();

  // Step 5: account details → provisioning seam → auto sign-in → checkout handoff
  await expect(page.getByRole("heading", { name: "Account details" })).toBeVisible();
  await page.getByLabel("Your name").fill("E2E Owner");
  await page.getByLabel("Work email").fill(`e2e.owner+${runId}@pat-e2e.local`);
  await page.getByLabel("Password", { exact: true }).fill("E2eWizardPass12");
  await page.getByRole("button", { name: /Create account and continue/ }).click();

  await page.waitForURL("**/firm/membership/checkout**");
  expect(page.url()).toContain("plan=pro");
  expect(page.url()).toContain("from=create-account");
  // Billing truth: scaffold copy while PAT_BILLING_ENABLED is off.
  await expect(page.getByText(/No live charge will be created|Stripe-hosted checkout is configured/).first()).toBeVisible();
});
