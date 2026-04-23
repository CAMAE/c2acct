import { expect, type Page } from "@playwright/test";

export const CONSULTANT_DISABLED_COPY =
  "Consultant access is disabled in this runtime until the company-scoped consultant plane is explicitly re-enabled for proof. The vendor entry remains the default sign-in path here.";

export async function expectConsultantSignInRouteState(
  page: Page,
  consultantAccessEnabled: boolean
) {
  if (consultantAccessEnabled) {
    const consultantCard = page
      .locator("section")
      .filter({ hasText: "Assigned briefing access" })
      .filter({ hasText: "/consultants" })
      .first();

    await expect(consultantCard).toBeVisible();
    await expect(page.getByText(CONSULTANT_DISABLED_COPY)).toHaveCount(0);
    return consultantCard;
  }

  await expect(page.getByText(CONSULTANT_DISABLED_COPY)).toBeVisible();
  await expect(page.getByRole("link", { name: "Consultant", exact: true })).toHaveCount(0);

  const vendorCard = page
    .locator("section")
    .filter({ hasText: "Landing route:" })
    .filter({ hasText: "/vendor" })
    .first();

  await expect(vendorCard).toBeVisible();
  await expect(page.getByText("Assigned briefing access")).toHaveCount(0);
  return vendorCard;
}
