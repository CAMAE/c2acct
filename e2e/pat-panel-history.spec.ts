import { expect, test, type Page } from "@playwright/test";

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";

type LocalReviewRole = "vendor" | "firm";

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
  const roleRedirect = role === "vendor" ? "/vendor" : "/firm";
  const reviewEmail = role === "vendor" ? "review.vendor@pat.local" : "review.firm@pat.local";

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
      // Propagation wait, not a sleep: the toggle reports its own state, so wait
      // for the click to have landed before asserting the surface again.
      await expect(button).toHaveAttribute("aria-pressed", "true");
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

// Contract (PatModeToggle navigationMode="replace", PortalPanelSelector since
// May 2026): panel and surface switches REPLACE the current history entry, so
// however many panels were toggled, one back returns to the page the user
// arrived from — the panels never pile up in history. Pinned 2026-09-08; the
// pre-June "push" expectations this spec used to carry were the stale ones.
async function expectOneBackReturnsTo(page: Page, previousPathname: string) {
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expectPathname(page, previousPathname);
  await assertNoAuthOrRuntimeFailure(page);
}

async function arriveFrom(page: Page, previousPath: string, targetPath: string) {
  await gotoStable(page, previousPath);
  await gotoStable(page, targetPath);
  await assertNoAuthOrRuntimeFailure(page);
}

test.describe("PAT panel and surface history", () => {
  test.setTimeout(120_000);

  test("panel switches on /firm replace history: one back returns to the previous page", async ({ page }) => {
    await gotoStable(page, "/sign-in/firm");
    await signInAsRole(page, "firm");
    await expectPathname(page, "/firm");
    await arriveFrom(page, "/firm/insights", "/firm");
    await expect(page.locator('a[href="/firm/alignment-assessment"]').first()).toBeVisible();

    await activatePatToggle(page, "Meet PAT", async () => {
      await expect(page.getByRole("heading", { name: "PAT Intelligence Layer", exact: true })).toBeVisible();
    });

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("What each firm page does", { exact: true })).toBeVisible();
    });

    await activatePatToggle(page, "Workspace", async () => {
      await expect(page.locator('a[href="/firm/alignment-assessment"]').first()).toBeVisible();
    });

    await expectOneBackReturnsTo(page, "/firm/insights");
  });

  test("mode changes on /vendor/product-assessment replace history: one back returns to /vendor", async ({ page }) => {
    await gotoStable(page, "/sign-in/vendor");
    await signInAsRole(page, "vendor");
    await expectPathname(page, "/vendor");

    await openLinkAndWaitForPath(page, "/vendor/product-assessment", "/vendor/product-assessment");
    await expect(page.getByText("Existing products still in progress", { exact: true })).toBeVisible();

    // One-page assessment modes: Completed / Existing / Add New / Help.
    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByRole("heading", { name: "How to use vendor product assessment", exact: true })).toBeVisible();
    });

    await activatePatToggle(page, "Existing", async () => {
      await expect(page.getByText("Existing products still in progress", { exact: true })).toBeVisible();
    });

    await expectOneBackReturnsTo(page, "/vendor");
  });

  test("surface changes on vendor product insight detail replace history", async ({ page }) => {
    await gotoStable(page, "/sign-in/vendor");
    await signInAsRole(page, "vendor");

    await gotoStable(page, "/vendor/product-insight");
    await assertNoAuthOrRuntimeFailure(page);

    const productInsightLink = page.locator('a[href^="/vendor/product-insight/"]').first();
    await expect(productInsightLink).toBeVisible();
    const productInsightHref = await productInsightLink.getAttribute("href");
    expect(productInsightHref).toBeTruthy();
    const productId = productInsightHref!.split("/").pop()!.split("?")[0];

    await gotoStable(page, `/vendor/product-insight/${productId}`);
    await assertNoAuthOrRuntimeFailure(page);
    await expectPathname(page, `/vendor/product-insight/${productId}`);

    // Readout cards expand inline first ("Open readout"); the full view is the
    // link that appears inside the expanded card.
    const detailPath = `/vendor/product-insight/${productId}/current-product-fit`;
    const card = page.locator('[data-insight-key="current-product-fit"]').first();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: /Open readout/ }).click();
    const detailLink = card.locator(`a[href^="${detailPath}"]`).first();
    await expect(detailLink).toBeVisible();
    await detailLink.click();
    await expectPathname(page, detailPath);
    await assertNoAuthOrRuntimeFailure(page);

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("What it is", { exact: true }).first()).toBeVisible();
    });

    await activatePatToggle(page, "Evidence", async () => {
      await expect(page.getByText("Vendor-reported evidence", { exact: true }).first()).toBeVisible();
    });

    await expectOneBackReturnsTo(page, `/vendor/product-insight/${productId}`);
  });

  test("surface changes on vendor alignment detail replace history", async ({ page }) => {
    await gotoStable(page, "/sign-in/vendor");
    await signInAsRole(page, "vendor");

    await arriveFrom(page, "/vendor/alignment-insights", "/vendor/alignment-insights/operating-discipline-demand");
    await expectPathname(page, "/vendor/alignment-insights/operating-discipline-demand");

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("What it is", { exact: true }).first()).toBeVisible();
    });

    await activatePatToggle(page, "Pro", async () => {
      await expect(page.getByText("What it is", { exact: true }).first()).not.toBeVisible();
    });

    await expectOneBackReturnsTo(page, "/vendor/alignment-insights");
  });

  test("surface changes on firm insight detail replace history", async ({ page }) => {
    await gotoStable(page, "/sign-in/firm");
    await signInAsRole(page, "firm");

    await arriveFrom(page, "/firm/insights", "/firm/insights/firm_tier1_operating_baseline");
    await expectPathname(page, "/firm/insights/firm_tier1_operating_baseline");

    await activatePatToggle(page, "Help", async () => {
      await expect(page.getByText("What it is", { exact: true }).first()).toBeVisible();
    });

    await activatePatToggle(page, "Pro", async () => {
      await expect(page.getByText("What it is", { exact: true }).first()).not.toBeVisible();
    });

    await expectOneBackReturnsTo(page, "/firm/insights");
  });
});
