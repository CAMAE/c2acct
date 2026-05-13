import { expect, test } from "@playwright/test";

const roleCases = [
  {
    audience: "vendor",
    shortLabel: "vendor",
    homeCta: "Start vendor onboarding",
    heading: "Vendor onboarding",
    firstAssessment: "Sign in and start vendor product assessment",
    callbackPath: "/vendor/product-assessment",
    checkoutHref: "/vendor/membership/checkout?plan=pro&from=onboarding",
  },
  {
    audience: "firm",
    shortLabel: "firm",
    homeCta: "Start firm onboarding",
    heading: "Firm onboarding",
    firstAssessment: "Sign in and start firm alignment assessment",
    callbackPath: "/firm/alignment-assessment",
    checkoutHref: "/firm/membership/checkout?plan=pro&from=onboarding",
  },
  {
    audience: "user",
    shortLabel: "individual",
    homeCta: "Start individual onboarding",
    heading: "Individual onboarding",
    firstAssessment: "Sign in and start individual alignment assessment",
    callbackPath: "/user/alignment-assessment",
    checkoutHref: "/user/membership/checkout?plan=pro&from=onboarding",
  },
] as const;

test.describe("public PAT onboarding", () => {
  for (const role of roleCases) {
    test(`routes ${role.audience} from homepage to onboarding and first assessment sign-in`, async ({ page }) => {
      test.skip(
        role.audience === "user" && !process.env.PAT_ENABLE_INDIVIDUAL_SURFACES,
        "Individual onboarding surface requires PAT_ENABLE_INDIVIDUAL_SURFACES=1 (pilot flag off by default)."
      );
      await page.goto("/");

      await expect(page.getByRole("heading", { name: "Choose your path", exact: true }).first()).toBeVisible();
      await page.getByRole("link", { name: new RegExp(role.homeCta, "i") }).click();

      await expect(page).toHaveURL(new RegExp(`/onboarding/${role.audience}$`));
      await expect(page.getByRole("heading", { name: role.heading, exact: true })).toBeVisible();
      await expect(page.getByText(/Payment state: (Scaffold only|Stripe configured)/)).toBeVisible();
      await expect(page.getByText(/No live charge will be created|Stripe-hosted checkout is configured/).first()).toBeVisible();
      await expect(page.getByText(/insights stay pending/i)).toBeVisible();
      await expect(page.getByRole("link", { name: "Review Pro checkout" })).toHaveAttribute("href", role.checkoutHref);

      await page.getByRole("button", { name: new RegExp(`Save ${role.shortLabel} onboarding intent`, "i") }).click();
      await page.waitForURL(new RegExp(`/onboarding/${role.audience}\\?plan=pro&started=1$`));
      await expect(page.getByText(/Saved onboarding intent/i)).toBeVisible();

      await page.getByRole("link", { name: role.firstAssessment }).first().click();
      await page.waitForURL("**/sign-in**");
      await expect(page).toHaveURL(new RegExp(`callbackUrl=${encodeURIComponent(role.callbackPath)}`));
      await expect(page.getByText(role.callbackPath).first()).toBeVisible();
    });
  }
});
