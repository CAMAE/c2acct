import { expect, test, type Page } from "@playwright/test";

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";

type LocalReviewRole = "vendor" | "firm" | "individual";

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
  const roleRedirect = role === "vendor" ? "/vendor" : role === "firm" ? "/firm" : "/user";
  const reviewEmail =
    role === "vendor"
      ? "review.vendor@pat.local"
      : role === "firm"
        ? "review.firm@pat.local"
        : "review.individual@pat.local";

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

  await gotoStable(page, roleRedirect);
  await assertNoAuthOrRuntimeFailure(page);
}

function pathname(page: Page) {
  return new URL(page.url()).pathname;
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPatToggleButton(page: Page, label: string) {
  return page
    .locator(".pat-mode-toggle")
    .getByRole("button", {
      name: new RegExp(`^${escapeForRegex(label)}(?:\\b|\\s|$)`, "i"),
    })
    .first();
}

function buildHistoryProductName() {
  return `History Product ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`;
}

async function activatePatToggle(page: Page, label: string, assertSurface: () => Promise<void>) {
  const button = getPatToggleButton(page, label);
  await expect(button).toBeVisible();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await button.click();
    try {
      await assertSurface();
      await assertNoAuthOrRuntimeFailure(page);
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(300);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to activate PAT toggle "${label}".`);
}

async function expectPathname(page: Page, expectedPathname: string) {
  await expect.poll(() => pathname(page)).toBe(expectedPathname);
}

async function openLinkAndWaitForPath(page: Page, href: string, expectedPathname: string) {
  const link = page.locator(`a[href="${href}"]`).first();
  await expect(link).toBeVisible();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await link.click();
    try {
      await expectPathname(page, expectedPathname);
      await assertNoAuthOrRuntimeFailure(page);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to open path "${expectedPathname}".`);
}

async function expectBackLeavesCurrentPage(page: Page, expectedPathname: string) {
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expectPathname(page, expectedPathname);
  await assertNoAuthOrRuntimeFailure(page);
}

test.describe("PAT panel and surface history", () => {
  test.setTimeout(120_000);

  test("uses replace-style panel history on /firm", async ({ page }) => {
    await gotoStable(page, "/sign-in/firm");
    await signInAsRole(page, "firm");
    await expectPathname(page, "/firm");
    await expect(page.locator('a[href="/firm/alignment-assessment"]').first()).toBeVisible();

    await activatePatToggle(page, "Meet PAT", async () => {
      await expect(
        page.getByRole("heading", {
          name: "PAT is the intelligence layer for structured performance alignment.",
          exact: true,
        })
      ).toBeVisible();
    });

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("What each firm page does", { exact: true })).toBeVisible();
    });

    await activatePatToggle(page, "Workspace", async () => {
      await expect(page.locator('a[href="/firm/alignment-assessment"]').first()).toBeVisible();
    });

    await expectBackLeavesCurrentPage(page, "/sign-in/firm");
  });

  test("leaves /vendor/product-assessment with one back after mode changes", async ({ page }) => {
    await gotoStable(page, "/sign-in/vendor");
    await signInAsRole(page, "vendor");
    await expectPathname(page, "/vendor");

    await openLinkAndWaitForPath(page, "/vendor/product-assessment", "/vendor/product-assessment");
    await expect(page.getByText("Existing products still in progress", { exact: true })).toBeVisible();

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("How to use vendor product assessment", { exact: true })).toBeVisible();
    });

    await activatePatToggle(page, "Completed", async () => {
      await expect(page.getByText("Completed vendor product assessments", { exact: true })).toBeVisible();
    });

    await activatePatToggle(page, "Existing", async () => {
      await expect(page.getByText("Existing products still in progress", { exact: true })).toBeVisible();
    });

    await expectBackLeavesCurrentPage(page, "/vendor");
  });

  test("leaves vendor product insight detail with one back after surface changes", async ({ page }) => {
    await gotoStable(page, "/sign-in/vendor");
    await signInAsRole(page, "vendor");

    await gotoStable(page, "/vendor/product-assessment?mode=add-new");
    await assertNoAuthOrRuntimeFailure(page);
    const productName = buildHistoryProductName();
    await page.getByPlaceholder("Product name").fill(productName);
    await page.getByPlaceholder("Product website").fill("https://example.com");
    await page.getByPlaceholder("Product summary").fill("Product created to verify PAT history behavior.");
    await Promise.all([
      page.waitForURL("**/vendor/product-assessment"),
      page.getByRole("button", { name: "Add product", exact: true }).click(),
    ]);
    await assertNoAuthOrRuntimeFailure(page);

    const productAssessmentLink = page
      .locator('a[href^="/vendor/product-assessment/"]')
      .filter({ hasText: productName })
      .first();
    await expect(productAssessmentLink).toBeVisible();
    const assessmentHref = await productAssessmentLink.getAttribute("href");
    expect(assessmentHref).toBeTruthy();
    const productId = assessmentHref!.split("/").pop()!;

    await gotoStable(page, `/vendor/product-insight/${productId}`);
    await assertNoAuthOrRuntimeFailure(page);
    await expectPathname(page, `/vendor/product-insight/${productId}`);

    await openLinkAndWaitForPath(
      page,
      `/vendor/product-insight/${productId}/current-product-fit`,
      `/vendor/product-insight/${productId}/current-product-fit`
    );
    await expect(page.getByText("What it is", { exact: true }).first()).toBeVisible();

    await activatePatToggle(page, "Evidence", async () => {
      await expect(page.getByText("Current PAT picture", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("Vendor-reported evidence", { exact: true }).first()).toBeVisible();
    });

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("What it is", { exact: true }).first()).toBeVisible();
    });

    await expectBackLeavesCurrentPage(page, `/vendor/product-insight/${productId}`);
  });

  test("leaves vendor alignment detail with one back after surface changes", async ({ page }) => {
    await gotoStable(page, "/sign-in/vendor");
    await signInAsRole(page, "vendor");

    await gotoStable(page, "/vendor/alignment-insights");
    await assertNoAuthOrRuntimeFailure(page);
    await expectPathname(page, "/vendor/alignment-insights");

    await openLinkAndWaitForPath(
      page,
      "/vendor/alignment-insights/operating-discipline-demand",
      "/vendor/alignment-insights/operating-discipline-demand"
    );
    await expect(page.getByText("Current PAT picture", { exact: true }).first()).toBeVisible();

    await activatePatToggle(page, "Elite", async () => {
      await expect(page.getByText(/Coming soon\.\s*Unlock with Elite membership\./).first()).toBeVisible();
    });

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("What it is", { exact: true }).first()).toBeVisible();
    });

    await activatePatToggle(page, "Pro", async () => {
      await expect(page.getByText("Current PAT picture", { exact: true }).first()).toBeVisible();
    });

    await expectBackLeavesCurrentPage(page, "/vendor/alignment-insights");
  });

  test("leaves firm insight detail with one back after surface changes", async ({ page }) => {
    await gotoStable(page, "/sign-in/firm");
    await signInAsRole(page, "firm");

    await gotoStable(page, "/firm/insights");
    await assertNoAuthOrRuntimeFailure(page);
    await expectPathname(page, "/firm/insights");

    await openLinkAndWaitForPath(
      page,
      "/firm/insights/firm_tier1_operating_baseline",
      "/firm/insights/firm_tier1_operating_baseline"
    );
    await expect(page.getByText("Current PAT picture", { exact: true }).first()).toBeVisible();

    await activatePatToggle(page, "Elite", async () => {
      await expect(page.getByText(/Coming soon\.\s*Unlock with Elite membership\./).first()).toBeVisible();
    });

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("What it is", { exact: true }).first()).toBeVisible();
    });

    await activatePatToggle(page, "Pro", async () => {
      await expect(page.getByText("Current PAT picture", { exact: true }).first()).toBeVisible();
    });

    await expectBackLeavesCurrentPage(page, "/firm/insights");
  });
});
