import { expect, test } from "@playwright/test";

test("PAT shell shows release fingerprint and blocks historical AAE markers", async ({ page, request }) => {
  await page.goto("/");

  // exact:true pins the hero lockup; the footer's "PAT — Performance Alignment
  // Technology · a Patalign™ product" (commit 6544e80e) also contains the phrase.
  await expect(page.getByText("Performance Alignment Technology", { exact: true })).toBeVisible();
  await expect(page.getByText("The intelligence layer inside C2Acct")).toBeVisible();
  await expect(page.getByText("Meet PAT")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create an account", exact: true })).toBeVisible();
  await expect(page.getByText("Release", { exact: false })).toBeVisible();
  await expect(page.locator("[data-release-fingerprint]")).toBeVisible();
  await expect(page.getByText("Autonomous Alignment Infrastructure for Accounting Firms.")).toHaveCount(0);
  await expect(page.getByText("Top Seven Outputs")).toHaveCount(0);
  await expect(page.getByText("Alignment Survey")).toHaveCount(0);
  await expect(page.getByText("EXECUTIVE DASHBOARD SYSTEM")).toHaveCount(0);
  await expect(page.getByText("Premium top-level routing with local drilldowns")).toHaveCount(0);
  await expect(page.getByText("Quick Actions")).toHaveCount(0);
  await expect(page.getByText("Insights Bridge")).toHaveCount(0);

  const homeHtml = await page.content();
  expect(homeHtml).toContain("Performance Alignment Technology");
  expect(homeHtml).toContain("The intelligence layer inside C2Acct");
  expect(homeHtml).toContain("Meet PAT");
  expect(homeHtml).toContain("Choose your path");
  expect(homeHtml).not.toContain("Autonomous Alignment Infrastructure for Accounting Firms.");
  expect(homeHtml).not.toContain("Top Seven Outputs");
  expect(homeHtml).not.toContain("EXECUTIVE DASHBOARD SYSTEM");
  expect(homeHtml).not.toContain("Premium top-level routing with local drilldowns");
  expect(homeHtml).not.toContain("Quick Actions");
  expect(homeHtml).not.toContain("Insights Bridge");

  const fingerprintResponse = await request.get("/api/release-fingerprint");
  expect(fingerprintResponse.ok()).toBeTruthy();
  const fingerprintPayload = await fingerprintResponse.json();
  expect(fingerprintPayload.fingerprint.canonicalRootName).toBe("c2acct-live");
  expect(fingerprintPayload.fingerprint.buildSourceType).toBe("standalone-build");
  expect(fingerprintPayload.fingerprint.startCommand).toBe("node .next/standalone/server.js");
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
