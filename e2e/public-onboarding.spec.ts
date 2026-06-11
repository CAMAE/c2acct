import { expect, test } from "@playwright/test";

/**
 * Public funnel after the /create-account wizard landed: the homepage offers
 * Meet PAT, Sign in, and a single "Create an account" card (label "Choose
 * your path"); the vendor/firm onboarding landing pages funnel to Sign in or
 * Create an account only (the save-intent / start-assessment cluster is
 * retired). Card visible ⟺ wizard enabled, one flag: while
 * PAT_ENABLE_SELF_SIGNUP is off the create-account entry points do not render
 * at all (no dead-end bounce to sign-in); direct URL hits are pinned to the
 * sign-in redirect in create-account.spec.ts.
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
  test("homepage Create-an-account card is visible ⟺ the wizard is enabled", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Continue to your workspace" })).toBeVisible();

    const createAccountCard = page.getByRole("link", { name: /Create an account/ });
    if ((await createAccountCard.count()) > 0) {
      // Flag on: the card exists and leads straight into the wizard.
      await expect(createAccountCard.first()).toBeVisible();
      await createAccountCard.first().click();
      await page.waitForURL("**/create-account");
      await expect(page.getByRole("heading", { name: "Which best describes you?" })).toBeVisible();
    } else {
      // Flag off (ships dark): no dead-end card that bounces to sign-in —
      // the June 9 audit class of bug. No link on the page may target the wizard.
      await expect(page.locator('a[href="/create-account"]')).toHaveCount(0);
      await expect(page.getByText("Choose your path")).toHaveCount(0);
    }
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
