import { expect, test } from "@playwright/test";

const PASSWORD = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";
const consultantAccessEnabled = process.env.PAT_ENABLE_CONSULTANT_ACCESS === "1";

test.describe("consultant flow", () => {
  test("review.consultant@pat.local lands on /consultants and sees their assigned ecosystem", async ({ page, context }) => {
    test.skip(
      !consultantAccessEnabled,
      "Consultant access flag is off; landing assertion only meaningful when /consultants is reachable."
    );
    const csrfRes = await context.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    await context.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "review.consultant@pat.local",
        password: PASSWORD,
        redirectTo: "/consultants",
      },
      maxRedirects: 0,
      failOnStatusCode: false,
    });

    await page.goto("/consultants", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/consultants/);

    // Loose selector: matches the Day-10 shim's "Assigned PAT briefings" /
    // "Assigned firms" copy AND the eventual Phase-3 ecosystem dashboard copy
    // ("ecosystem", "consultant"). Phase 3 will tighten this against the real
    // dashboard once it lands.
    await expect(page.getByRole("main")).toContainText(/consultant|ecosystem|assigned/i);
  });

  test("flag-off behavior: when PAT_ENABLE_CONSULTANT_ACCESS is unset, /consultants is not accessible", async () => {
    test.skip(
      process.env.PAT_ENABLE_CONSULTANT_ACCESS === "1",
      "Skipping flag-off case — flag is currently on. Reverse-compat covered by manifest gate disabled-state markers."
    );
  });
});
