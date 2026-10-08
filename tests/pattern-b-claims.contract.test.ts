import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LockedElitePreview, { LOCKED_ELITE_BUTTON, LOCKED_ELITE_LINE } from "@/app/components/insights/LockedElitePreview";
import { CAPABILITY_ROWS, capabilitiesFor, capabilityBullets, type CapabilityAudience } from "@/lib/capabilities";
import { buildVendorGapMap } from "@/lib/eliteInsightsV2";
import { quartileWord } from "@/lib/lexicon";
import { NO_MEMBERSHIP } from "@/lib/membership";
import { getMembershipPageModel } from "@/lib/membershipContent";
import { getLocaleMessages } from "@/lib/locale";
import { TRUST_SURFACES } from "@/lib/trustContent";

/**
 * pattern box B2 (R61, R-Q): every claim has a route. The membership bullets and
 * the comparison table render from lib/capabilities.ts; each row's route exists in
 * the app tree; a Pro locked Elite card says one line and one button; public
 * claims are true; Elite pages say quartiles and shortfalls in words.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/** Resolve a route against app/(app) or app/(public): a bracket segment matches a [param] directory. */
function routeExists(route: string): boolean {
  for (const group of ["app/(app)", "app/(public)"]) {
    let dir = path.join(ROOT, group);
    let ok = true;
    for (const segment of route.split("/").filter(Boolean)) {
      if (!existsSync(dir)) { ok = false; break; }
      const entries = readdirSync(dir);
      const match = entries.find((entry) => entry === segment) ?? (segment.startsWith("[") ? entries.find((entry) => entry.startsWith("[")) : undefined);
      if (!match) { ok = false; break; }
      dir = path.join(dir, match);
    }
    if (ok && existsSync(path.join(dir, "page.tsx"))) return true;
  }
  return false;
}

describe("R-Q — the capability table", () => {
  it("every row's route exists in the app tree", () => {
    for (const row of CAPABILITY_ROWS) {
      expect(routeExists(row.route), `${row.key} → ${row.route}`).toBe(true);
      expect(row.sentence.length).toBeGreaterThan(10);
    }
  });

  it("every bullet on the vendor and firm pages maps to a row, and the comparison table is the row list", () => {
    for (const audience of ["vendor", "firm"] as const) {
      const model = getMembershipPageModel({ audience, currentPlan: NO_MEMBERSHIP });
      const rows = capabilitiesFor(audience);
      const labels = new Set(rows.map((row) => row.label));
      expect(model.comparisonTable.map((row) => row.feature)).toEqual(rows.map((row) => row.label));
      for (const tier of model.tiers) {
        if (tier.plan === "ENTERPRISE") continue; // the Enterprise card carries the locale bullets (membership-enterprise box)
        expect(tier.features.length).toBeGreaterThan(0);
        for (const bullet of tier.features) {
          const label = bullet.split(": ")[0];
          expect(labels.has(label), `${audience} ${tier.plan} bullet "${bullet}"`).toBe(true);
        }
      }
    }
  });

  it("a locked preview is never a bullet; a qualified inclusion reads Label: qualifier", () => {
    const cells = getLocaleMessages("en").membership.cells;
    for (const audience of ["vendor", "firm", "individual"] as CapabilityAudience[]) {
      for (const tier of ["pro", "elite"] as const) {
        for (const bullet of capabilityBullets(audience, tier)) expect(bullet).not.toContain(cells.lockedPreview);
      }
    }
    expect(capabilityBullets("firm", "pro")).toContain(`${getLocaleMessages("en").membership.rows.firm.peerBenchmark}: ${cells.cohortBands}`);
    expect(capabilityBullets("vendor", "enterprise")).toContain(getLocaleMessages("en").membership.rows.vendor.channelView);
  });

  it("the hand-written bullet strings are gone from lib/membershipContent.ts", () => {
    const source = read("lib/membershipContent.ts");
    for (const old of ["Hot-divergence alerts", "Dedicated success manager", "Six-quarter roadmap", "Custom assessment templates", "Coaching session credits"]) {
      expect(source, old).not.toContain(`"${old}"`);
    }
    expect(source).toContain('import { capabilitiesFor, capabilityBullets');
  });
});

describe("V6 — a Pro locked Elite card", () => {
  it("says 'Live with Elite membership' once and its button says 'Upgrade to Elite'", () => {
    const html = renderToStaticMarkup(createElement(LockedElitePreview, { title: "Category Position", description: "Where you rank.", upgradeHref: "/vendor/membership" }));
    expect((html.match(new RegExp(LOCKED_ELITE_LINE, "g")) ?? []).length).toBe(1);
    expect(html).toContain(`href="/vendor/membership"`);
    expect(html).toContain(`>${LOCKED_ELITE_BUTTON}<`);
    expect(LOCKED_ELITE_BUTTON).toBe("Upgrade to Elite");
  });
});

describe("public claims", () => {
  it("the trust page no longer claims provider-backed billing; the support address is cam@patalignhq.com", () => {
    const trust = read("lib/trustContent.ts");
    expect(trust).not.toContain("provider-backed billing");
    expect(JSON.stringify(TRUST_SURFACES)).not.toContain("provider-backed billing");
    for (const rel of ["app/components/pat/PatTopBar.tsx", "app/(public)/support/page.tsx", "app/(public)/sign-in/page.tsx", "lib/locale.ts"]) {
      const source = read(rel);
      expect(source, rel).not.toContain("support@patalign.com");
      expect(source, rel).toContain("cam@patalignhq.com");
    }
  });
});

describe("Elite page words", () => {
  it("quartiles are words, never Q1 to Q4", () => {
    // enforce-core: 4 = top (the quartileOf convention, from the percentile shown)
    expect(quartileWord(4)).toBe("top quartile");
    expect(quartileWord(3)).toBe("upper middle");
    expect(quartileWord(2)).toBe("lower middle");
    expect(quartileWord(1)).toBe("bottom quartile");
    const card = read("app/components/insights/elite/VendorCategoryPositionCard.tsx");
    expect(card).toContain("quartileWord(cat.quartile");
    expect(card).not.toMatch(/Q\{cat\.quartile\}/);
  });

  it("the Gap Map says 'firms N lower' in orange and 'firms N higher' in green, never a bare plus for a shortfall", () => {
    const card = read("app/components/insights/elite/VendorGapMapCard.tsx");
    expect(card).toContain("`firms ${delta} lower`");
    expect(card).toContain("`firms ${-delta} higher`");
    expect(card).not.toContain("`firms +${");
    expect(card).not.toContain("`firms −${");
    expect(card).toMatch(/delta > 0 \? "text-\[var\(--brand-orange\)\]" : "text-\[var\(--shell-positive\)\]"/);
    // the matrix cells (built in the engine) say the same words
    const map = buildVendorGapMap([
      { productId: "p1", productName: "Ledger", firmAssessmentCount: 5, firmDimensions: [{ key: "w", title: "Workflow", score: 41 }, { key: "s", title: "Support", score: 80 }], vendorDimensions: [{ key: "w", title: "Workflow", score: 80 }, { key: "s", title: "Support", score: 78 }] },
    ]);
    const cells = map.rows[0].cells;
    expect(cells.find((cell) => cell.key === "w")?.display).toBe("firms 39 lower");
    expect(cells.find((cell) => cell.key === "s")?.display).toBe("firms 2 higher");
    expect(cells.find((cell) => cell.key === "w")?.tone).toBe("dispute");
    for (const cell of cells) expect(cell.display).not.toMatch(/^[+−-]\d+$/);
  });

  it("the three vendor Elite pages carry the insight name, in the live and the locked view", () => {
    const page = read("app/(app)/vendor/alignment-insights/[key]/page.tsx");
    for (const title of ["Category Position", "Demand Signals", "Alignment Gap Map"]) expect(page).toContain(`title="${title}"`);
    expect(page).toContain("title={(report.locked && VENDOR_ELITE_V2_META[report.key as keyof typeof VENDOR_ELITE_V2_META]?.title) || report.title}");
  });
});
