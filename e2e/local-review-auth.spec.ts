import { expect, test, type Page } from "@playwright/test";
import { expectConsultantSignInRouteState } from "./consultantSignInContract";

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

function getLocalReviewCard(page: Page, email: string) {
  return page
    .locator("section")
    .filter({ hasText: "Development-only local review auth" })
    .filter({ hasText: email })
    .first();
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
  test.setTimeout(120_000);

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
      await gotoStable(page, `/sign-in?view=${roleCase.view}`);
      const reviewCard = getLocalReviewCard(page, roleCase.email);
      await expect(reviewCard).toBeVisible();
      await expect(reviewCard).toContainText("Development-only local review auth");
      await expect(reviewCard).toContainText(roleCase.email);
      await expect(reviewCard).toContainText(roleCase.landing);
    }
  });

  test("keeps consultant sign-in deep links deterministic when consultant access is gated", async ({
    page,
  }) => {
    await page.goto("/sign-in?view=consultant&callbackUrl=%2Fconsultants");

    if (consultantAccessEnabled) {
      await expectConsultantSignInRouteState(page, consultantAccessEnabled);
      const consultantCard = getLocalReviewCard(page, "review.consultant@pat.local");
      await expect(consultantCard).toBeVisible();
      await expect(consultantCard).toContainText("/consultants");
      return;
    }

    await expectConsultantSignInRouteState(page, consultantAccessEnabled);
    await expect(getLocalReviewCard(page, "review.vendor@pat.local")).toBeVisible();
  });

  test("covers vendor local-review route access on the served runtime", async ({ browser }) => {
    const membershipContext = await browser.newContext();
    const membershipPage = await membershipContext.newPage();

    await signInAsRole(membershipPage, "vendor");
    await membershipPage.waitForURL("**/vendor**");
    await assertNoAuthOrRuntimeFailure(membershipPage);
    const membershipLink = membershipPage.locator('a[href="/vendor/membership"]').first();
    await expect(membershipLink).toBeVisible();
    await gotoStable(membershipPage, "/vendor/membership");
    await assertNoAuthOrRuntimeFailure(membershipPage);
    await expect(membershipPage.getByRole("button", { name: "Pro Membership", exact: true })).toBeVisible();
    await expect(membershipPage.getByRole("button", { name: "Elite Membership", exact: true })).toBeVisible();
    await expect(membershipPage.getByRole("button", { name: "Help", exact: true })).toBeVisible();
    await expect(membershipPage.getByText("What it is", { exact: true }).first()).toBeVisible();
    await gotoStable(membershipPage, "/vendor/membership/checkout?plan=pro");
    await assertNoAuthOrRuntimeFailure(membershipPage);
    await expect(membershipPage.getByRole("heading", { name: /checkout scaffold/i }).first()).toBeVisible();
    await expect(membershipPage.getByRole("button", { name: /Credit \/ Debit Card/i })).toBeVisible();
    await expect(membershipPage.getByRole("button", { name: /Bank Account/i })).toBeVisible();
    await expect(membershipPage.getByRole("button", { name: /PayPal/i })).toBeVisible();
    await expect(membershipPage.getByRole("button", { name: /Stripe/i })).toBeVisible();
    await expect(membershipPage.getByRole("button", { name: /Square/i })).toBeVisible();
    await expect(membershipPage.getByText("No live charge will be created", { exact: true })).toBeVisible();

    await membershipContext.close();

    const vendorContext = await browser.newContext();
    const vendorPage = await vendorContext.newPage();

    await signInAsRole(vendorPage, "vendor");
    await vendorPage.waitForURL("**/vendor**");
    await assertNoAuthOrRuntimeFailure(vendorPage);

    await gotoStable(vendorPage, "/vendor");
    await assertNoAuthOrRuntimeFailure(vendorPage);
    await expect(vendorPage.getByRole("heading", { name: /Vendor/i }).first()).toBeVisible();

    await gotoStable(vendorPage, "/vendor/product-assessment");
    await assertNoAuthOrRuntimeFailure(vendorPage);
    await expect(vendorPage.getByRole("heading", { name: /Vendor product assessment/i }).first()).toBeVisible();

    await gotoStable(vendorPage, "/vendor/product-insight");
    await assertNoAuthOrRuntimeFailure(vendorPage);
    await expect(vendorPage.getByRole("heading", { name: /Vendor product intelligence/i }).first()).toBeVisible();

    await gotoStable(vendorPage, "/vendor/alignment-insights");
    await assertNoAuthOrRuntimeFailure(vendorPage);
    await expect(vendorPage.getByText("Vendor alignment insights", { exact: true }).first()).toBeVisible();

    await vendorContext.close();
  });

  test("covers firm review routes and individual membership entry without access denied or runtime crashes", async ({
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
    await expect(firmPage.getByRole("button", { name: "Pro Membership", exact: true })).toBeVisible();
    await expect(firmPage.getByRole("button", { name: "Elite Membership", exact: true })).toBeVisible();
    await expect(firmPage.getByRole("button", { name: "Help", exact: true })).toBeVisible();
    await expect(firmPage.getByText("What it is", { exact: true }).first()).toBeVisible();
    await gotoStable(firmPage, "/firm/membership/checkout?plan=pro");
    await assertNoAuthOrRuntimeFailure(firmPage);
    await expect(firmPage.getByRole("heading", { name: /checkout scaffold/i }).first()).toBeVisible();
    await expect(firmPage.getByRole("button", { name: /Credit \/ Debit Card/i })).toBeVisible();
    await expect(firmPage.getByText("No live charge will be created", { exact: true })).toBeVisible();

    await gotoStable(firmPage, "/firm/alignment-assessment");
    await assertNoAuthOrRuntimeFailure(firmPage);
    await expect(
      firmPage.getByRole("heading", { name: /Firm alignment assessment/i }).first()
    ).toBeVisible();

    await gotoStable(firmPage, "/firm/product-assessments");
    await assertNoAuthOrRuntimeFailure(firmPage);
    await expect(
      firmPage.getByRole("heading", { name: /Firm product assessments/i }).first()
    ).toBeVisible();

    await gotoStable(firmPage, "/firm/insights");
    await assertNoAuthOrRuntimeFailure(firmPage);
    await expect(
      firmPage.getByRole("heading", { name: /Firm alignment insights/i }).first()
    ).toBeVisible();

    await firmContext.close();

    const individualContext = await browser.newContext();
    const individualPage = await individualContext.newPage();

    await signInAsRole(individualPage, "individual");
    await individualPage.waitForURL("**/user**");
    await assertNoAuthOrRuntimeFailure(individualPage);
    await expect(individualPage.getByRole("heading", { name: /Individual/i }).first()).toBeVisible();

    await gotoStable(individualPage, "/user/membership");
    await assertNoAuthOrRuntimeFailure(individualPage);
    await expect(individualPage.getByRole("button", { name: "Pro Membership", exact: true })).toBeVisible();
    await expect(individualPage.getByRole("button", { name: "Elite Membership", exact: true })).toBeVisible();
    await expect(individualPage.getByRole("button", { name: "Help", exact: true })).toBeVisible();
    await expect(individualPage.getByText("What it is", { exact: true }).first()).toBeVisible();
    await gotoStable(individualPage, "/user/membership/checkout?plan=elite");
    await assertNoAuthOrRuntimeFailure(individualPage);
    await expect(individualPage.getByRole("heading", { name: /checkout scaffold/i }).first()).toBeVisible();
    await expect(individualPage.getByRole("button", { name: /Credit \/ Debit Card/i })).toBeVisible();
    await expect(individualPage.getByText("No live charge will be created", { exact: true })).toBeVisible();

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

    await gotoStable(adminPage, "/admin/runtime");
    await assertNoAuthOrRuntimeFailure(adminPage);
    await expect(adminPage.getByRole("heading", { name: "Runtime", exact: true })).toBeVisible();

    await gotoStable(adminPage, "/admin/briefings");
    await assertNoAuthOrRuntimeFailure(adminPage);
    await expect(adminPage.getByRole("heading", { name: "Briefings", exact: true })).toBeVisible();

    if (consultantAccessEnabled) {
      await gotoStable(adminPage, "/admin/consultants");
      await assertNoAuthOrRuntimeFailure(adminPage);
      await expect(adminPage.getByRole("heading", { name: "Consultants", exact: true })).toBeVisible();
    } else {
      await gotoStable(adminPage, "/admin");
      await expect(adminPage.getByRole("link", { name: "Consultants", exact: true })).toHaveCount(0);
    }

    await adminContext.close();
  });

  test("proves the served release fingerprint matches the signed-in local-review runtime", async ({
    browser,
  }) => {
    const vendorContext = await browser.newContext();
    const vendorPage = await vendorContext.newPage();
    await signInAsRole(vendorPage, "vendor");
    await gotoStable(vendorPage, "/vendor");
    await assertNoAuthOrRuntimeFailure(vendorPage);

    const vendorFingerprintResponse = await vendorPage.context().request.get("/api/release-fingerprint");
    expect(vendorFingerprintResponse.ok()).toBeTruthy();
    const vendorFingerprintPayload = (await vendorFingerprintResponse.json()) as {
      fingerprint?: {
        releaseId?: string;
        commitSha?: string;
        buildId?: string;
        canonicalRootName?: string;
      };
    };
    expect(vendorFingerprintPayload.fingerprint?.canonicalRootName).toBe("c2acct-live");
    expect(vendorFingerprintPayload.fingerprint?.commitSha?.length).toBeGreaterThan(6);
    expect(vendorFingerprintPayload.fingerprint?.buildId).toBeTruthy();
    await expect(vendorPage.locator("[data-release-fingerprint]").first()).toContainText(
      vendorFingerprintPayload.fingerprint?.releaseId ?? ""
    );
    await vendorContext.close();

    const firmContext = await browser.newContext();
    const firmPage = await firmContext.newPage();
    await signInAsRole(firmPage, "firm");
    await gotoStable(firmPage, "/firm");
    await assertNoAuthOrRuntimeFailure(firmPage);

    const firmFingerprintResponse = await firmPage.context().request.get("/api/release-fingerprint");
    expect(firmFingerprintResponse.ok()).toBeTruthy();
    const firmFingerprintPayload = (await firmFingerprintResponse.json()) as {
      fingerprint?: {
        releaseId?: string;
      };
    };
    expect(firmFingerprintPayload.fingerprint?.releaseId).toBe(
      vendorFingerprintPayload.fingerprint?.releaseId
    );
    await expect(firmPage.locator("[data-release-fingerprint]").first()).toContainText(
      firmFingerprintPayload.fingerprint?.releaseId ?? ""
    );
    await firmContext.close();
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
    const assignmentCard = consultantCard
      .locator("div.rounded-\\[16px\\]")
      .filter({ hasText: `/consultants/briefings/${assignedCompanyId}` })
      .first();
    await expect(assignmentCard).toBeVisible();
    await expect(assignmentCard).toContainText(assignedFirmName);

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
