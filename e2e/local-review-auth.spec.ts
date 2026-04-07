import { expect, test, type Page } from "@playwright/test";

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";
const consultantAccessEnabled = process.env.PAT_ENABLE_CONSULTANT_ACCESS === "1";

type LocalReviewRole = "vendor" | "firm" | "individual" | "admin" | "consultant";

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
    role === "vendor"
      ? "/vendor"
      : role === "firm"
        ? "/firm"
        : role === "individual"
          ? "/user"
          : role === "consultant"
            ? "/consultants"
            : "/admin";
  const reviewEmail =
    role === "vendor"
      ? "review.vendor@pat.local"
      : role === "firm"
        ? "review.firm@pat.local"
        : role === "individual"
          ? "review.individual@pat.local"
          : role === "consultant"
            ? "review.consultant@pat.local"
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

function buildUniqueFirmName(label: string) {
  return `Consultant ${label} Firm ${Date.now()} ${Math.random().toString(36).slice(2, 8)}`;
}

async function createFirmOrganization(page: Page, name: string) {
  await gotoStable(page, "/admin/organizations");
  await page.getByPlaceholder("Organization name").fill(name);
  await page.locator('select[name="type"]').selectOption("FIRM");
  await Promise.all([
    page.waitForURL("**/admin/organizations"),
    page.getByRole("button", { name: "Create", exact: true }).click(),
  ]);
  await assertNoAuthOrRuntimeFailure(page);

  const organizationLink = page
    .locator('a[href^="/admin/organizations/"]')
    .filter({ hasText: name })
    .first();
  await expect(organizationLink).toBeVisible();
  const href = await organizationLink.getAttribute("href");
  expect(href).toBeTruthy();

  return href!.split("/").pop()!;
}

test.describe("local review auth", () => {
  test.setTimeout(60_000);

  test("shows deterministic local review entries for vendor, firm, individual, admin, and consultant", async ({ page }) => {
    const roleCases = [
      { view: "vendor", email: "review.vendor@pat.local", landing: "/vendor" },
      { view: "firm", email: "review.firm@pat.local", landing: "/firm" },
      { view: "individual", email: "review.individual@pat.local", landing: "/user" },
      { view: "admin", email: "review.admin@pat.local", landing: "/admin" },
      ...(consultantAccessEnabled
        ? [{ view: "consultant", email: "review.consultant@pat.local", landing: "/consultants" }]
        : []),
    ] as const;

    for (const roleCase of roleCases) {
      await page.goto(`/sign-in?view=${roleCase.view}`);
      await expect(page.getByText("Development-only local review auth")).toBeVisible();
      await expect(page.getByText(roleCase.email)).toBeVisible();
      await expect(page.getByText(roleCase.landing)).toBeVisible();
    }
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

  test("proves consultant access stays company-scoped after admin create and assignment", async ({ browser }) => {
    test.skip(!consultantAccessEnabled, "Consultant access is gated off until explicit proof is requested.");

    const assignedFirmName = buildUniqueFirmName("Assigned");
    const unassignedFirmName = buildUniqueFirmName("Unassigned");

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await signInAsRole(adminPage, "admin");
    await adminPage.waitForURL("**/admin**");

    const assignedCompanyId = await createFirmOrganization(adminPage, assignedFirmName);
    const unassignedCompanyId = await createFirmOrganization(adminPage, unassignedFirmName);

    await gotoStable(adminPage, "/admin/consultants");
    await adminPage.getByPlaceholder("consultant@company.com").fill("review.consultant@pat.local");
    await adminPage.getByPlaceholder("Consultant name").fill("Consultant review");
    await Promise.all([
      adminPage.waitForURL("**/admin/consultants"),
      adminPage.getByRole("button", { name: "Add consultant", exact: true }).click(),
    ]);
    await assertNoAuthOrRuntimeFailure(adminPage);

    const consultantCard = adminPage
      .locator("div.rounded-\\[22px\\].border")
      .filter({ hasText: "review.consultant@pat.local" })
      .first();
    await expect(consultantCard).toBeVisible();
    await consultantCard.locator('select[name="companyId"]').selectOption({ label: assignedFirmName });
    await Promise.all([
      adminPage.waitForURL("**/admin/consultants"),
      consultantCard.getByRole("button", { name: "Assign firm", exact: true }).click(),
    ]);
    await assertNoAuthOrRuntimeFailure(adminPage);
    await expect(consultantCard.getByText(`/consultants/briefings/${assignedCompanyId}`)).toBeVisible();
    await expect(consultantCard.getByText(assignedFirmName)).toBeVisible();

    await adminContext.close();

    const consultantContext = await browser.newContext();
    const consultantPage = await consultantContext.newPage();

    await signInAsRole(consultantPage, "consultant");
    await consultantPage.waitForURL("**/consultants");
    await assertNoAuthOrRuntimeFailure(consultantPage);
    await expect(consultantPage.getByRole("heading", { name: "Assigned PAT briefings", exact: true })).toBeVisible();
    await expect(consultantPage.getByText(assignedFirmName)).toBeVisible();
    await expect(consultantPage.getByText(unassignedFirmName)).toHaveCount(0);

    await gotoStable(consultantPage, `/consultants/briefings/${assignedCompanyId}`);
    await assertNoAuthOrRuntimeFailure(consultantPage);
    await expect(
      consultantPage.getByRole("heading", { name: `${assignedFirmName} briefing`, exact: true })
    ).toBeVisible();

    const deniedResponse = await consultantPage.goto(`/consultants/briefings/${unassignedCompanyId}`, {
      waitUntil: "domcontentloaded",
    });
    expect(deniedResponse?.status()).toBe(404);
    await expect(consultantPage.getByText("This page could not be found")).toBeVisible();

    await consultantContext.close();
  });
});
