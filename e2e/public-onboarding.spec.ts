import { expect, test } from "@playwright/test";

/**
 * Public funnel after the /create-account wizard landed: the homepage offers
 * Meet PAT, Sign in, and a single "Create an account" card (label "Choose
 * your path"); the vendor/firm onboarding landing pages funnel to Sign in or
 * Create an account only (the save-intent / start-assessment cluster is
 * retired). While PAT_ENABLE_SELF_SIGNUP is off the create-account entry
 * points fall back to /sign-in — both states are asserted here by following
 * the link and accepting either destination, then pinning the dark-state
 * redirect in create-account.spec.ts.
 */

const roleCases = [
  {
    audience: "vendor",
    shortLabel: "vendor",
    heading: "Vendor onboarding",
    workspacePath: "/vendor",
    checkoutHref: "/vendor/membership/checkout?plan=pro&from=onboarding",
  },
  {
    audience: "firm",
    shortLabel: "firm",
    heading: "Firm onboarding",
    workspacePath: "/firm",
    checkoutHref: "/firm/membership/checkout?plan=pro&from=onboarding",
  },
] as const;

test.describe("public PAT funnel", () => {
  test("homepage funnels through the Create an account card", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Choose your path").first()).toBeVisible();
    const createAccountCard = page.getByRole("link", { name: /Create an account/ }).first();
    await expect(createAccountCard).toBeVisible();
    await createAccountCard.click();

    // Flag on → the wizard; flag off (ships dark) → the canonical sign-in hub.
    await page.waitForURL(/\/(create-account|sign-in)/);
  });

  for (const role of roleCases) {
    test(`${role.audience} landing page funnels to sign-in or create-account only`, async ({ page }) => {
      await page.goto(`/onboarding/${role.audience}`);

      await expect(page.getByRole("heading", { name: role.heading, exact: true })).toBeVisible();
      await expect(page.getByText(/Payment state: (Scaffold only|Stripe configured)/)).toBeVisible();
      await expect(page.getByText(/No live charge will be created|Stripe-hosted checkout is configured/).first()).toBeVisible();
      await expect(page.getByText(/insights stay pending/i)).toBeVisible();
      await expect(page.getByRole("link", { name: "Review Pro checkout" })).toHaveAttribute("href", role.checkoutHref);

      // The retired cluster stays retired.
      await expect(page.getByRole("button", { name: /Save .* onboarding intent/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /Sign in and start/i })).toHaveCount(0);

      const signIn = page.getByRole("link", { name: `Sign in to ${role.shortLabel} workspace` }).first();
      await expect(signIn).toBeVisible();
      await signIn.click();
      await page.waitForURL("**/sign-in**");
      await expect(page).toHaveURL(new RegExp(`callbackUrl=${encodeURIComponent(role.workspacePath)}`));
    });
  }
});
