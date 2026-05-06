import { mkdir } from "fs/promises";
import path from "path";
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
  await gotoStable(page, roleRedirect);
  await assertNoAuthOrRuntimeFailure(page);
}

function safeArtifactName(label: string) {
  return label.replace(/[^a-z0-9]+/gi, "-").replace(/(^-|-$)/g, "").toLowerCase();
}

async function visibleBodyText(page: Page) {
  return (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
}

async function auditToggleRoute(page: Page, route: string, label: string) {
  await gotoStable(page, route);
  await assertNoAuthOrRuntimeFailure(page);

  const toggle = page.locator(".pat-mode-toggle").first();
  await expect(toggle, `${label} should render a shared PAT mode toggle`).toBeVisible();
  const plainLinkCount = await toggle.locator("a").evaluateAll((links) =>
    links.filter((link) => link.getAttribute("role") !== "button").length
  );
  expect(plainLinkCount, `${label} should not render toggle options as plain text links`).toBe(0);

  const buttons = toggle.getByRole("button");
  const buttonCount = await buttons.count();
  expect(buttonCount, `${label} should render multiple clickable toggle buttons`).toBeGreaterThan(1);

  for (let index = 0; index < buttonCount; index += 1) {
    await expect(buttons.nth(index), `${label} toggle button ${index + 1} should be visible`).toBeVisible();
    await expect(buttons.nth(index), `${label} toggle button ${index + 1} should be enabled`).toBeEnabled();
  }

  const activeButton = toggle.locator('.pat-mode-toggle__option[data-active="true"]').first();
  const inactiveButton = toggle.locator('.pat-mode-toggle__option[data-active="false"]').last();
  await expect(activeButton, `${label} should have an active toggle state`).toBeVisible();
  await expect(inactiveButton, `${label} should have an inactive toggle state`).toBeVisible();

  const [activeStyle, inactiveStyle] = await Promise.all([
    activeButton.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        color: style.color,
      };
    }),
    inactiveButton.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        color: style.color,
      };
    }),
  ]);

  expect(activeStyle.backgroundColor, `${label} active background should be distinct`).not.toBe(inactiveStyle.backgroundColor);
  expect(activeStyle.color, `${label} active text should be distinct`).not.toBe(inactiveStyle.color);
  expect(activeStyle.boxShadow, `${label} active depth should be distinct`).not.toBe(inactiveStyle.boxShadow);

  const beforeText = await visibleBodyText(page);
  const targetKey = await inactiveButton.getAttribute("data-key");
  expect(targetKey, `${label} inactive toggle should expose a stable audit key`).toBeTruthy();
  await inactiveButton.click();
  await expect(toggle.locator(`.pat-mode-toggle__option[data-key="${targetKey}"]`)).toHaveAttribute("aria-pressed", "true");
  await assertNoAuthOrRuntimeFailure(page);
  await expect.poll(() => visibleBodyText(page), { message: `${label} lower content should change after toggle` }).not.toBe(beforeText);

  await toggle.screenshot({
    path: path.join(process.cwd(), "artifacts", "visual", "mode-toggle-audit", `${safeArtifactName(label)}.png`),
  });
}

async function firstHref(page: Page, selector: string) {
  const link = page.locator(selector).first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

test.describe("PAT route-wide mode toggle audit", () => {
  test.setTimeout(180_000);

  test("keeps every shared PAT mode toggle button-like, clickable, and content-changing", async ({ browser }) => {
    await mkdir(path.join(process.cwd(), "artifacts", "visual", "mode-toggle-audit"), { recursive: true });

    const vendorContext = await browser.newContext();
    const vendorPage = await vendorContext.newPage();
    await signInAsRole(vendorPage, "vendor");

    await auditToggleRoute(vendorPage, "/vendor", "vendor portal");
    await auditToggleRoute(vendorPage, "/vendor/product-assessment", "vendor product assessment");
    await auditToggleRoute(vendorPage, "/vendor/alignment-insights", "vendor alignment insights");
    await auditToggleRoute(vendorPage, "/vendor/alignment-insights/operating-discipline-demand", "vendor alignment insight detail");
    await auditToggleRoute(vendorPage, "/vendor/membership", "vendor membership");
    await auditToggleRoute(vendorPage, "/vendor/membership/checkout?plan=pro", "vendor checkout payment methods");

    await gotoStable(vendorPage, "/vendor/product-insight");
    const productInsightHref = await firstHref(vendorPage, 'a[href^="/vendor/product-insight/"]');
    await auditToggleRoute(vendorPage, productInsightHref, "vendor product insight");
    await auditToggleRoute(vendorPage, `${productInsightHref}/current-product-fit`, "vendor product insight detail");
    await vendorContext.close();

    const firmContext = await browser.newContext();
    const firmPage = await firmContext.newPage();
    await signInAsRole(firmPage, "firm");

    await auditToggleRoute(firmPage, "/firm", "firm portal");
    await auditToggleRoute(firmPage, "/firm/insights", "firm insights");
    await auditToggleRoute(firmPage, "/firm/insights/firm_tier1_operating_baseline", "firm insight detail");
    await auditToggleRoute(firmPage, "/firm/membership", "firm membership");
    await auditToggleRoute(firmPage, "/firm/membership/checkout?plan=pro", "firm checkout payment methods");
    await firmContext.close();

  });
});
