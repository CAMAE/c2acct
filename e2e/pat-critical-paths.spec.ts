import { expect, test, type Page } from "@playwright/test";

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

test.describe("PAT critical browser paths", () => {
  test("redirects signed-out users away from protected PAT pages and APIs", async ({ page, request }) => {
    const protectedRoutes = [
      "/survey",
      "/results",
      "/outputs",
      "/profiles",
      "/platform",
      "/firm/alignment-assessment",
      "/firm/insights",
      "/vendor/alignment-insights",
      "/vendor/alignment-insights/operating-discipline-demand",
      "/vendor/product-insight",
      "/vendor/product-insight/product-fixture",
    ];

    for (const route of protectedRoutes) {
      await gotoStable(page, route);
      expect(page.url()).toContain(`/sign-in?callbackUrl=${encodeURIComponent(route)}`);
    }

    const protectedApiRequests = [
      request.post("/api/survey/submit", {
        data: {
          moduleKey: "firm_alignment_operating_model_v1",
          answers: {},
        },
      }),
      request.post("/api/firm/product-assessment/draft", {
        data: {
          productId: "product-fixture",
          currentPage: 1,
          answers: {},
        },
      }),
      request.post("/api/vendor/product-assessment/draft", {
        data: {
          productId: "product-fixture",
          currentPage: 1,
          utilityKeys: ["core_accounting"],
          answers: {},
          openEndedResponses: {},
          profile: {},
        },
      }),
    ];

    for (const response of await Promise.all(protectedApiRequests)) {
      expect(response.status()).toBe(401);
    }
    await expect(
      page.getByRole("heading", { name: /One credentials path for vendor, firm, individual, and admin/i })
    ).toBeVisible();
  });

  test.skip(process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH === "1", "local review auth is intentionally enabled for e2e");

  test("keeps local review controls hidden in production-style e2e mode", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Development-only local review auth")).toHaveCount(0);
    await expect(page.getByText("review.vendor@pat.local")).toHaveCount(0);

    await page.goto("/sign-in?view=vendor");
    await expect(page.getByText("Development-only local review auth")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue with local review" })).toHaveCount(0);
  });

  test("persists locale switching across audited public PAT routes", async ({ page }) => {
    const locales = [
      {
        code: "es",
        homeHeading: "La capa de inteligencia dentro de C2Acct",
        signInHeading: "ACCESO",
        patHeading: "PAT es la capa de inteligencia para la alineación estructurada del desempeño.",
      },
      {
        code: "fr",
        homeHeading: "La couche d’intelligence au sein de C2Acct",
        signInHeading: "CONNEXION",
        patHeading: "PAT est la couche d’intelligence pour l’alignement structuré de la performance.",
      },
    ] as const;

    for (const locale of locales) {
      const response = await page.request.post("/api/locale", {
        data: {
          locale: locale.code,
        },
      });

      expect(response.ok()).toBeTruthy();

      await page.goto("/");
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
      await expect(page.getByRole("heading", { level: 1, name: locale.homeHeading })).toBeVisible();

      await page.goto("/sign-in");
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
      await expect(page.getByRole("heading", { level: 1, name: locale.signInHeading })).toBeVisible();

      await page.goto("/pat");
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
      await expect(page.getByRole("heading", { level: 1, name: locale.patHeading })).toBeVisible();
    }
  });
});
