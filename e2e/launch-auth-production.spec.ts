import { expect, test, type Page } from "@playwright/test";

const bootstrapPassword = process.env.PAT_BOOTSTRAP_DEFAULT_PASSWORD ?? "pat-bootstrap-pass";

type LaunchRole = "vendor" | "firm" | "individual" | "admin";

const launchUsers: Record<LaunchRole, { email: string; redirectTo: string }> = {
  vendor: {
    email: process.env.PAT_BOOTSTRAP_VENDOR_EMAIL ?? "vendor.bootstrap@example.com",
    redirectTo: "/vendor",
  },
  firm: {
    email: process.env.PAT_BOOTSTRAP_FIRM_EMAIL ?? "firm.bootstrap@example.com",
    redirectTo: "/firm",
  },
  individual: {
    email: process.env.PAT_BOOTSTRAP_INDIVIDUAL_EMAIL ?? "individual.bootstrap@example.com",
    redirectTo: "/user",
  },
  admin: {
    email: process.env.PAT_BOOTSTRAP_ADMIN_EMAIL ?? "admin.bootstrap@example.com",
    redirectTo: "/admin",
  },
};

async function assertNoAuthFailure(page: Page) {
  await expect(page.getByText("Access Denied")).toHaveCount(0);
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

async function signInAsProvisionedRole(page: Page, role: LaunchRole) {
  const user = launchUsers[role];
  const csrfResponse = await page.context().request.get("/api/auth/csrf");
  expect(csrfResponse.ok()).toBeTruthy();
  const csrfBody = (await csrfResponse.json()) as { csrfToken?: string };
  expect(typeof csrfBody.csrfToken).toBe("string");

  const signInResponse = await page.context().request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken: csrfBody.csrfToken ?? "",
      email: user.email,
      password: bootstrapPassword,
      callbackUrl: user.redirectTo,
      json: "true",
    },
  });
  expect(signInResponse.ok()).toBeTruthy();

  const responseBody = (await signInResponse.json().catch(() => null)) as { url?: string } | null;
  expect(responseBody?.url?.includes("error=")).not.toBe(true);

  await page.goto(user.redirectTo);
  await assertNoAuthFailure(page);
}

test.describe("launch auth production path", () => {
  test("hides deterministic review identities on the canonical production sign-in route", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("review.vendor@pat.local")).toHaveCount(0);
    await expect(page.getByText("review.firm@pat.local")).toHaveCount(0);
    await expect(page.getByText("review.individual@pat.local")).toHaveCount(0);
    await expect(page.getByText("review.admin@pat.local")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue with local review" })).toHaveCount(0);
  });

  test("lands vendor, firm, individual, and admin on their real credentials routes", async ({ browser }) => {
    for (const role of ["vendor", "firm", "individual", "admin"] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();

      await signInAsProvisionedRole(page, role);
      await page.waitForURL(`**${launchUsers[role].redirectTo}`);
      await assertNoAuthFailure(page);

      if (role === "admin") {
        await expect(page.getByRole("heading", { name: /C2Core operator control plane/i })).toBeVisible();
      } else {
        await expect(page).not.toHaveURL(/\/admin(?:\/|$)/);
      }

      await context.close();
    }
  });

  test("denies non-admin credentials from remaining on admin routes", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await signInAsProvisionedRole(page, "vendor");
    await gotoStable(page, "/admin");

    await expect(page.getByRole("heading", { name: /C2Core operator control plane/i })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /Operator access required/i })).toBeVisible();
    await assertNoAuthFailure(page);

    await context.close();
  });
});
