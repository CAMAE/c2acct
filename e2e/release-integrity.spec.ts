import { expect, test } from "@playwright/test";

test("PAT shell shows release fingerprint and blocks historical AAE markers", async ({ page, request }) => {
  await page.goto("/");

  await expect(page.getByText("Release", { exact: false })).toBeVisible();
  await expect(page.locator("[data-release-fingerprint]")).toBeVisible();
  await expect(page.getByText("Autonomous Alignment Infrastructure for Accounting Firms.")).toHaveCount(0);
  await expect(page.getByText("Top Seven Outputs")).toHaveCount(0);
  await expect(page.getByText("Alignment Survey")).toHaveCount(0);

  const fingerprintResponse = await request.get("/api/release-fingerprint");
  expect(fingerprintResponse.ok()).toBeTruthy();
  const fingerprintPayload = await fingerprintResponse.json();
  await expect(page.locator("[data-release-fingerprint]")).toContainText(
    fingerprintPayload.fingerprint.releaseId
  );
});

test("/login remains compatibility-only and forwards to /sign-in", async ({ page }) => {
  const response = await page.goto("/login?callbackUrl=%2Fvendor");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByText("Continue with GitHub")).toHaveCount(0);
  await expect(page.getByText("pre-approved GitHub accounts")).toHaveCount(0);
});
