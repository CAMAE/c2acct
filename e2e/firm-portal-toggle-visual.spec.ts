import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";

type LocalReviewRole = "vendor" | "firm";

type ToggleVisualSnapshot = {
  label: string;
  ariaPressed: string | null;
  backgroundColor: string;
  borderColor: string;
  boxShadow: string;
  color: string;
};

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

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getToggleButton(page: Page, label: string) {
  return page
    .locator(".pat-mode-toggle")
    .getByRole("button", {
      name: new RegExp(`^${escapeForRegex(label)}(?:\\b|\\s|$)`, "i"),
    })
    .first();
}

async function readToggleSnapshot(button: Locator, label: string): Promise<ToggleVisualSnapshot> {
  return button.evaluate((element, buttonLabel) => {
    const styles = window.getComputedStyle(element);

    return {
      label: buttonLabel,
      ariaPressed: element.getAttribute("aria-pressed"),
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      boxShadow: styles.boxShadow,
      color: styles.color,
    };
  }, label);
}

async function activateToggle(page: Page, label: string, assertSurface: () => Promise<void>) {
  const button = getToggleButton(page, label);
  await expect(button).toBeVisible();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await button.click();
    try {
      await assertSurface();
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(300);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to activate toggle "${label}".`);
}

function expectDistinctVisuals(active: ToggleVisualSnapshot, inactive: ToggleVisualSnapshot) {
  expect(active.ariaPressed).toBe("true");
  expect(inactive.ariaPressed).toBe("false");
  expect(active.backgroundColor).not.toBe(inactive.backgroundColor);
  expect(active.color).not.toBe(inactive.color);
  expect(active.boxShadow).not.toBe(inactive.boxShadow);
}

test.describe("firm portal selector visual proof", () => {
  test.setTimeout(120_000);

  test("matches the shared PAT toggle treatment and writes proof artifacts", async ({ browser }) => {
    const artifactDir = path.join(process.cwd(), "artifacts", "visual");
    await mkdir(artifactDir, { recursive: true });

    const firmContext = await browser.newContext();
    const firmPage = await firmContext.newPage();

    await signInAsRole(firmPage, "firm");
    await gotoStable(firmPage, "/firm");
    await assertNoAuthOrRuntimeFailure(firmPage);

    // AUDIT-D21-001(c) closure: disable the 160ms background-color transition
    // on toggle buttons so getComputedStyle reads the final resolved color
    // rather than a mid-transition interpolated value. Without this, snapshot
    // reads taken right after click can return e.g. rgb(34,34,34) while the
    // background animates from white(rgb(255,255,255)) to --shell-ink
    // (rgb(32,32,32)) over 160ms. Visual snapshots in screenshots() also
    // become deterministic.
    await firmPage.addStyleTag({
      content: ".pat-mode-toggle__option { transition: none !important; }",
    });

    const workspaceButton = getToggleButton(firmPage, "Workspace");
    const meetPatButton = getToggleButton(firmPage, "Meet PAT");

    await expect(workspaceButton).toBeVisible();
    await expect(meetPatButton).toBeVisible();

    const firmInitialWorkspace = await readToggleSnapshot(workspaceButton, "Workspace");
    const firmInitialMeetPat = await readToggleSnapshot(meetPatButton, "Meet PAT");
    expectDistinctVisuals(firmInitialWorkspace, firmInitialMeetPat);

    await firmPage.locator(".pat-mode-toggle").screenshot({
      path: path.join(artifactDir, "firm-portal-toggle-workspace.png"),
    });

    await activateToggle(firmPage, "Meet PAT", async () => {
      await expect(
        firmPage.getByRole("heading", {
          name: "PAT is the intelligence layer for structured performance alignment.",
          exact: true,
        })
      ).toBeVisible();
    });

    const firmPatWorkspace = await readToggleSnapshot(workspaceButton, "Workspace");
    const firmPatMeetPat = await readToggleSnapshot(meetPatButton, "Meet PAT");
    expectDistinctVisuals(firmPatMeetPat, firmPatWorkspace);

    expect(firmPatMeetPat.backgroundColor).toBe(firmInitialWorkspace.backgroundColor);
    expect(firmPatMeetPat.borderColor).toBe(firmInitialWorkspace.borderColor);
    expect(firmPatMeetPat.boxShadow).toBe(firmInitialWorkspace.boxShadow);
    expect(firmPatMeetPat.color).toBe(firmInitialWorkspace.color);

    expect(firmPatWorkspace.backgroundColor).toBe(firmInitialMeetPat.backgroundColor);
    expect(firmPatWorkspace.borderColor).toBe(firmInitialMeetPat.borderColor);
    expect(firmPatWorkspace.boxShadow).toBe(firmInitialMeetPat.boxShadow);
    expect(firmPatWorkspace.color).toBe(firmInitialMeetPat.color);

    await firmPage.locator(".pat-mode-toggle").screenshot({
      path: path.join(artifactDir, "firm-portal-toggle-meet-pat.png"),
    });

    const vendorContext = await browser.newContext();
    const vendorPage = await vendorContext.newPage();

    await signInAsRole(vendorPage, "vendor");
    await gotoStable(vendorPage, "/vendor/product-assessment");
    await assertNoAuthOrRuntimeFailure(vendorPage);
    await vendorPage.addStyleTag({
      content: ".pat-mode-toggle__option { transition: none !important; }",
    });
    await expect(vendorPage.getByText("Existing products still in progress", { exact: true })).toBeVisible();

    const vendorExisting = await readToggleSnapshot(getToggleButton(vendorPage, "Existing"), "Existing");
    const vendorHelp = await readToggleSnapshot(getToggleButton(vendorPage, "Help"), "Help");
    expectDistinctVisuals(vendorExisting, vendorHelp);

    expect(firmInitialWorkspace.backgroundColor).toBe(vendorExisting.backgroundColor);
    expect(firmInitialWorkspace.borderColor).toBe(vendorExisting.borderColor);
    expect(firmInitialWorkspace.boxShadow).toBe(vendorExisting.boxShadow);
    expect(firmInitialWorkspace.color).toBe(vendorExisting.color);

    expect(firmInitialMeetPat.backgroundColor).toBe(vendorHelp.backgroundColor);
    expect(firmInitialMeetPat.borderColor).toBe(vendorHelp.borderColor);
    expect(firmInitialMeetPat.boxShadow).toBe(vendorHelp.boxShadow);
    expect(firmInitialMeetPat.color).toBe(vendorHelp.color);

    await vendorPage.locator(".pat-mode-toggle").screenshot({
      path: path.join(artifactDir, "vendor-product-assessment-toggle-reference.png"),
    });

    const proof = {
      checkedAt: new Date().toISOString(),
      conclusion:
        "Current source renders visually distinct portal toggle states. The firm portal selector matches the shared PAT toggle treatment.",
      firm: {
        workspaceActive: firmInitialWorkspace,
        meetPatInactive: firmInitialMeetPat,
        workspaceInactiveAfterMeetPat: firmPatWorkspace,
        meetPatActive: firmPatMeetPat,
      },
      vendorReference: {
        existingActive: vendorExisting,
        helpInactive: vendorHelp,
      },
      screenshots: {
        firmWorkspace: "artifacts/visual/firm-portal-toggle-workspace.png",
        firmMeetPat: "artifacts/visual/firm-portal-toggle-meet-pat.png",
        vendorReference: "artifacts/visual/vendor-product-assessment-toggle-reference.png",
      },
    };

    await writeFile(
      path.join(artifactDir, "firm-portal-toggle-proof.json"),
      `${JSON.stringify(proof, null, 2)}\n`,
      "utf8"
    );

    await vendorContext.close();
    await firmContext.close();
  });
});
