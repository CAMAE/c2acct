import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";

async function signInAsAdmin(page: Page) {
  const csrfResponse = await page.context().request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const csrfBody = (await csrfResponse.json()) as { csrfToken?: string };

  const signInResponse = await page.context().request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrfBody.csrfToken ?? "",
      email: "review.admin@pat.local",
      password: localReviewPassword,
      callbackUrl: "/admin/briefings",
      json: "true",
    },
  });
  expect(signInResponse.ok()).toBeTruthy();

  const responseBody = (await signInResponse.json().catch(() => null)) as { url?: string } | null;
  expect(responseBody?.url?.includes("error=")).not.toBe(true);
}

async function gotoStable(page: Page, url: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === 1 || !message.includes("ERR_ABORTED")) {
        throw error;
      }
    }
  }
}

test("admin briefing routes render board-ready structure from live PAT data", async ({ page }) => {
  await signInAsAdmin(page);

  await gotoStable(page, "/admin/briefings");
  await expect(page.getByRole("heading", { name: "Briefings", exact: true })).toBeVisible();

  const companyLink = page
    .locator('a[href^="/admin/briefings/"]')
    .filter({ hasText: /Demo Company/i })
    .first();
  await expect(companyLink).toBeVisible();
  const companyHref = await companyLink.getAttribute("href");
  expect(companyHref).toBeTruthy();

  await gotoStable(page, companyHref ?? "/admin/briefings");
  await expect(page).toHaveURL(new RegExp(".*/admin/briefings/[^/]+$"));
  await expect(page.getByText("Executive summary", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Individual layer", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Firm layer", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Product layer", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Ecosystem layer", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Insight narrative", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Risks", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Opportunities", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Confidence and evidence appendix", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("30 / 60 / 90 next actions", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/market ranking/i)).toHaveCount(0);
  await expect(page.getByText(/unsupported benchmark/i)).toHaveCount(0);

  const productLink = page.locator('a[href*="/products/"]').first();
  if ((await productLink.count()) > 0) {
    await expect(productLink).toBeVisible();
    await productLink.click();
    await page.waitForURL("**/products/**");
    await expect(page.getByText("Product risks", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Product opportunities", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Confidence and evidence appendix", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/market ranking/i)).toHaveCount(0);
    await expect(page.getByText(/unsupported benchmark/i)).toHaveCount(0);
  } else {
    await expect(page.getByText("No firm-side product reviews have been recorded yet.")).toBeVisible();
    await expect(
      page.getByText("No firm-side product reviews are recorded yet, so the product layer remains ungrounded."),
    ).toHaveCount(2);
  }

  await gotoStable(page, `${companyHref}/print`);
  await expect(page.getByText("Print briefing", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Executive summary", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Confidence and evidence appendix", { exact: true }).first()).toBeVisible();
});
