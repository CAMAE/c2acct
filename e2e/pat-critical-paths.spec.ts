import { expect, test } from "@playwright/test";

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
      await page.goto(route);
      expect(page.url()).toContain(`/sign-in?callbackUrl=${encodeURIComponent(route)}`);
    }

    const response = await request.post("/api/survey/submit", {
      data: {
        moduleKey: "firm_alignment_operating_model_v1",
        answers: {},
      },
    });

    expect(response.status()).toBe(401);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test.skip(process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH === "1", "local review auth is intentionally enabled for e2e");

  test("keeps local review controls hidden in production-style e2e mode", async ({ page }) => {
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
