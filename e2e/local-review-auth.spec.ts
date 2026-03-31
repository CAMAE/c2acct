import { expect, test, type Page } from "@playwright/test";

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";

type LocalReviewRole = "vendor" | "firm" | "individual" | "admin";

async function assertNoAuthOrRuntimeFailure(page: Page) {
  await expect(page.getByText("Access Denied")).toHaveCount(0);
  await expect(page.getByText("Cannot read properties of undefined")).toHaveCount(0);
  await expect(page.getByText("TypeError")).toHaveCount(0);
  await expect(page.getByText("Application error")).toHaveCount(0);
  await expect(page.locator("[data-nextjs-dialog-overlay]")).toHaveCount(0);
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

async function signInAsRole(page: Page, role: LocalReviewRole) {
  const roleRedirect =
    role === "vendor" ? "/vendor" : role === "firm" ? "/firm" : role === "individual" ? "/user" : "/admin";
  const reviewEmail =
    role === "vendor"
      ? "review.vendor@pat.local"
      : role === "firm"
        ? "review.firm@pat.local"
        : role === "individual"
          ? "review.individual@pat.local"
          : "review.admin@pat.local";
  const csrfResponse = await page.context().request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const csrfBody = (await csrfResponse.json()) as { csrfToken?: string };
  expect(typeof csrfBody.csrfToken).toBe("string");

  const signInResponse = await page.context().request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrfBody.csrfToken ?? "",
      email: reviewEmail,
      password: localReviewPassword,
      callbackUrl: roleRedirect,
      json: "true",
    },
  });
  expect(signInResponse.ok()).toBeTruthy();

  const responseBody = (await signInResponse.json().catch(() => null)) as { url?: string } | null;
  expect(responseBody?.url?.includes("error=")).not.toBe(true);

  await page.goto(roleRedirect);
  await assertNoAuthOrRuntimeFailure(page);
}

test.describe("local review auth", () => {
  test.setTimeout(60_000);

  test("shows deterministic local review entries for vendor, firm, individual, and admin", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Development-only local review auth")).toBeVisible();
    await expect(page.getByText("review.vendor@pat.local")).toBeVisible();
    await expect(page.getByText("review.firm@pat.local")).toBeVisible();
    await expect(page.getByText("review.individual@pat.local")).toBeVisible();
    await expect(page.getByText("review.admin@pat.local")).toBeVisible();
    await expect(page.getByText("GitHub sign-in is intentionally unavailable in this local runtime.")).toBeVisible();
    await expect(page.getByText("http://127.0.0.1:3001/api/auth/callback/github", { exact: true }).first()).toBeVisible();
  });

  test("covers the vendor signed-in product assessment and membership flow", async ({ browser }) => {
    const membershipContext = await browser.newContext();
    const membershipPage = await membershipContext.newPage();

    await signInAsRole(membershipPage, "vendor");
    await membershipPage.waitForURL("**/vendor**");
    await assertNoAuthOrRuntimeFailure(membershipPage);
    const membershipLink = membershipPage.locator('a[href="/vendor/membership"]').first();
    await expect(membershipLink).toBeVisible();
    await gotoStable(membershipPage, "/vendor/membership");
    await assertNoAuthOrRuntimeFailure(membershipPage);
    await expect(membershipPage.getByRole("button", { name: "Free" })).toHaveClass(/pat-button-primary/);

    await membershipContext.close();

    const assessmentContext = await browser.newContext();
    const assessmentPage = await assessmentContext.newPage();

    await signInAsRole(assessmentPage, "vendor");
    await assessmentPage.waitForURL("**/vendor**");
    await expect(assessmentPage.locator('a[href="/vendor/product-assessment"]').first()).toBeVisible();
    await gotoStable(assessmentPage, "/vendor/product-assessment");
    await assertNoAuthOrRuntimeFailure(assessmentPage);
    await expect(
      assessmentPage.getByRole("heading", { name: "Per-product assessment, not one generic vendor form" })
    ).toBeVisible();
    await expect(assessmentPage.getByRole("heading", { name: "Product list" })).toBeVisible();

    await assessmentContext.close();
  });

  test("covers firm and individual signed-in membership entry without access denied or runtime crashes", async ({
    browser,
  }) => {
    const firmContext = await browser.newContext();
    const firmPage = await firmContext.newPage();

    await signInAsRole(firmPage, "firm");
    await firmPage.waitForURL("**/firm**");
    await assertNoAuthOrRuntimeFailure(firmPage);
    await expect(firmPage.getByRole("heading", { name: /Firm/i }).first()).toBeVisible();

    await gotoStable(firmPage, "/firm/membership");
    await assertNoAuthOrRuntimeFailure(firmPage);
    await expect(firmPage.getByRole("button", { name: "Free" })).toHaveClass(/pat-button-primary/);
    await expect(firmPage.getByRole("heading", { name: /Set the PAT tier/i })).toBeVisible();

    await firmContext.close();

    const individualContext = await browser.newContext();
    const individualPage = await individualContext.newPage();

    await signInAsRole(individualPage, "individual");
    await individualPage.waitForURL("**/user**");
    await assertNoAuthOrRuntimeFailure(individualPage);
    await expect(individualPage.getByRole("heading", { name: /Individual/i }).first()).toBeVisible();

    await gotoStable(individualPage, "/user/membership");
    await assertNoAuthOrRuntimeFailure(individualPage);
    await expect(individualPage.getByRole("button", { name: "Free" })).toHaveClass(/pat-button-primary/);
    await expect(individualPage.getByRole("heading", { name: /PAT tier/i })).toBeVisible();

    await individualContext.close();
  });

  test("covers admin control-plane routes after local review sign-in", async ({ browser }) => {
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await signInAsRole(adminPage, "admin");
    await adminPage.waitForURL("**/admin**");
    await assertNoAuthOrRuntimeFailure(adminPage);
    await expect(adminPage.getByRole("heading", { name: /C2Core operator control plane/i })).toBeVisible();

    await gotoStable(adminPage, "/admin/taxonomy");
    await assertNoAuthOrRuntimeFailure(adminPage);
    await expect(adminPage.getByRole("heading", { name: "Taxonomy", exact: true })).toBeVisible();

    await gotoStable(adminPage, "/admin/modules");
    await assertNoAuthOrRuntimeFailure(adminPage);
    await expect(adminPage.getByRole("heading", { name: /Modules/i })).toBeVisible();

    await adminPage.getByRole("link", { name: "Runtime", exact: true }).click();
    await adminPage.waitForURL("**/admin/runtime");
    await assertNoAuthOrRuntimeFailure(adminPage);
    await expect(adminPage.getByRole("heading", { name: "Runtime", exact: true })).toBeVisible();

    await adminPage.getByRole("link", { name: "Briefings", exact: true }).click();
    await adminPage.waitForURL("**/admin/briefings");
    await assertNoAuthOrRuntimeFailure(adminPage);
    await expect(adminPage.getByRole("heading", { name: "Briefings", exact: true })).toBeVisible();

    await adminContext.close();
  });
});
