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
const ELITE_BOUNDARY = "Locked Elite boundary";

const SURFACES = [
  { name: "firm", email: "review.firm@pat.local", redirect: "/firm", index: "/firm/insights", prefix: "/firm/insights/", proReadout: "Current readout" },
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

async function collectInsightKeys(page: Page, indexUrl: string, prefix: string): Promise<string[]> {
  await page.goto(indexUrl, { waitUntil: "domcontentloaded" });
  const hrefs = await page
    .locator(`a[href*="${prefix}"]`)
    .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute("href") ?? ""));
  const keys = new Set<string>();
  for (const href of hrefs) {
    const at = href.indexOf(prefix);
    if (at === -1) continue;
    const key = href.slice(at + prefix.length).split(/[/?#]/)[0];
    if (key) keys.add(key);
  }
  return [...keys];
}

for (const surface of SURFACES) {
  test(`${surface.name} insights: elite surface never stacks the Pro readout (every key)`, async ({ page }) => {
    await signIn(page, surface.email, surface.redirect);

    const keys = await collectInsightKeys(page, surface.index, surface.prefix);
    expect(keys.length, `${surface.name} index should expose insight keys`).toBeGreaterThan(0);

    // Positive control: the Pro readout DOES render on the Pro surface, so the
    // elite-absence assertions below are meaningful rather than trivially true.
    await page.goto(`${surface.prefix}${keys[0]}?surface=pro`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(surface.proReadout).first(),
      `Pro readout "${surface.proReadout}" should render on the Pro surface`
    ).toBeVisible();

    for (const key of keys) {
      await page.goto(`${surface.prefix}${key}?surface=elite`, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByText(ELITE_BOUNDARY).first(),
        `${ELITE_BOUNDARY} must be present on ${key}`
      ).toBeVisible();
      await expect(
        page.getByText(surface.proReadout),
        `Pro readout "${surface.proReadout}" must not stack on the elite surface for ${key}`
      ).toHaveCount(0);
    }
  });
}
