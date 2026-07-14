import { expect, test, type Page } from "@playwright/test";

/**
 * Elite-stacking regression (component-level fix, key-level proof).
 *
 * On the locked Elite boundary surface (?surface=elite) the shared
 * InsightDetailShell must NOT render the Pro visual lead ("Current readout" on
 * firm, "Firm-side signal" on vendor) — stacking the real Pro readout behind the
 * locked Elite teaser leaks paywalled content. This DISCOVERS every insight key
 * from each surface's index and asserts, per key, that the Pro readout is absent
 * while the "Locked Elite boundary" is present. A positive control confirms the
 * readout DOES render on the Pro surface, so the elite-absence checks are real.
 */

const localReviewPassword = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";
// A non-entitled account's locked Elite surface renders one of these — the firm
// boundary prose ("Locked Elite boundary") and/or the blurred-preview CTA ("Live
// with Elite membership"). Either proves a locked Elite surface loaded.
const LOCKED_ELITE_MARKERS = ["Locked Elite boundary", "Live with Elite membership"] as const;

// proReadout: a Pro visual-lead marker that PROVABLY renders today (Block 12a
// detail bodies). It must appear when the Pro readout is present (inline
// expansion or ?surface=pro) and be ABSENT on the locked ?surface=elite boundary.
const SURFACES = [
  { name: "firm", email: "review.firm@pat.local", redirect: "/firm", index: "/firm/insights", prefix: "/firm/insights/", proReadout: "Module evidence" },
  { name: "vendor", email: "review.vendor@pat.local", redirect: "/vendor", index: "/vendor/alignment-insights", prefix: "/vendor/alignment-insights/", proReadout: "Firm-side signal" },
] as const;

async function signIn(page: Page, email: string, redirect: string) {
  const csrf = await page.context().request.get("/api/auth/csrf");
  const { csrfToken } = (await csrf.json()) as { csrfToken?: string };
  const res = await page.context().request.post("/api/auth/callback/credentials", {
    form: { csrfToken: csrfToken ?? "", email, password: localReviewPassword, callbackUrl: redirect, json: "true" },
  });
  expect(res.ok()).toBeTruthy();
}

// Block 12a: Pro face cards expand INLINE (a button, not an anchor) — key
// discovery reads the stable data-insight-key attribute the grid now emits.
async function collectInsightKeys(page: Page, indexUrl: string): Promise<string[]> {
  await page.goto(indexUrl, { waitUntil: "domcontentloaded" });
  const attrs = await page
    .locator("[data-insight-key]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-insight-key") ?? ""));
  return [...new Set(attrs.filter(Boolean))];
}

for (const surface of SURFACES) {
  test(`${surface.name} insights: elite surface never stacks the Pro readout (every key)`, async ({ page }) => {
    await signIn(page, surface.email, surface.redirect);

    const keys = await collectInsightKeys(page, surface.index);
    expect(keys.length, `${surface.name} index should expose insight keys`).toBeGreaterThan(0);

    // (A) Block 12a inline expansion: clicking a Pro card expands the FULL Pro
    // readout in place — the real Pro visual lead renders (positive control that
    // provably fires today), and NO Elite-boundary content leaks into that pane.
    await page.goto(surface.index, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Open readout/i }).first().click();
    await expect(
      page.getByText(surface.proReadout).first(),
      `Pro readout "${surface.proReadout}" should render in the inline expansion`
    ).toBeVisible();
    for (const marker of LOCKED_ELITE_MARKERS) {
      await expect(
        page.getByText(marker),
        `locked-Elite copy "${marker}" must not appear inside the Pro inline expansion`
      ).toHaveCount(0);
    }

    // (B) Detail route: on ?surface=elite, InsightDetailShell hides the Pro visual
    // lead (activeKey==="elite") so paywalled content never stacks behind the Elite
    // surface. The LOAD-BEARING assertion is per-key Pro-readout-absent. The locked
    // "boundary" copy is NOT on every elite surface — a Pro vendor's Demand Signals
    // (forward-projection) surfaces counts-only by design — so boundary presence is
    // a positive control that at least one locked surface renders (not an error).
    let sawLockedElite = false;
    for (const key of keys) {
      await page.goto(`${surface.prefix}${key}?surface=elite`, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByText(surface.proReadout),
        `Pro readout "${surface.proReadout}" must not stack on the elite surface for ${key}`
      ).toHaveCount(0);
      for (const marker of LOCKED_ELITE_MARKERS) {
        if ((await page.getByText(marker).count()) > 0) sawLockedElite = true;
      }
    }
    expect(
      sawLockedElite,
      `at least one ${surface.name} elite surface must render a locked-Elite marker`
    ).toBe(true);
  });
}
