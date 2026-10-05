import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MembershipComparisonTable from "@/app/components/membership/MembershipComparisonTable";
import MembershipTierGrid from "@/app/components/membership/MembershipTierGrid";
import { getLocaleMessages, SUPPORTED_LOCALES } from "@/lib/locale";
import { MEMBERSHIP_PLAN, NO_MEMBERSHIP } from "@/lib/membership";
import {
  ENTERPRISE_CONTACT_HREF,
  ENTERPRISE_TIER,
  MEMBERSHIP_COPY,
  getMembershipPageModel,
  type MembershipPageModel,
} from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";

/**
 * membership-enterprise box (R57, 2026-09-30).
 *
 * Change 1: the vendor membership page renders the Enterprise channel license as a third,
 * content-only tier card — no price number, no checkout route, a talk-to-us mailto text link.
 * The firm page keeps two tiers. No digit follows "Enterprise" anywhere on either page.
 *
 * Change 2: both pages carry the "What each membership includes" comparison table; every row
 * label and every cell phrase is in the locale file (lib/locale.ts) in all three languages.
 *
 * Rendered through the two components the page shell composes (MembershipTierGrid and
 * MembershipComparisonTable) — the shell itself adds the hero, which carries no tier copy.
 */
const ROOT = process.cwd();
const localeSource = readFileSync(path.join(ROOT, "lib/locale.ts"), "utf8");

function renderPage(model: MembershipPageModel) {
  return (
    renderToStaticMarkup(createElement(MembershipTierGrid, { model })) +
    renderToStaticMarkup(createElement(MembershipComparisonTable, { model }))
  );
}
function textOf(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
function countCards(html: string) {
  return (html.match(/data-testid="membership-tier-card"/g) ?? []).length;
}
const pages: Array<{ audience: MembershipAudience; currentPlan: Parameters<typeof getMembershipPageModel>[0]["currentPlan"]; label: string }> = [
  { audience: "vendor", currentPlan: NO_MEMBERSHIP, label: "vendor signed out" },
  { audience: "vendor", currentPlan: MEMBERSHIP_PLAN.PRO, label: "vendor Pro" },
  { audience: "vendor", currentPlan: MEMBERSHIP_PLAN.ELITE, label: "vendor Elite" },
  { audience: "firm", currentPlan: NO_MEMBERSHIP, label: "firm signed out" },
  { audience: "firm", currentPlan: MEMBERSHIP_PLAN.PRO, label: "firm Pro" },
];

describe("change 1 — the vendor page renders three tiers, the firm page two", () => {
  it("vendor: Pro, Elite, Enterprise; firm: Pro, Elite (every tab, every plan)", () => {
    for (const { audience, currentPlan } of pages) {
      for (const activeTab of [MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE, "HELP"] as const) {
        const model = getMembershipPageModel({ audience, currentPlan, activeTab });
        const html = renderPage(model);
        if (audience === "vendor") {
          expect(model.tiers.map((t) => t.plan)).toEqual([MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE, ENTERPRISE_TIER]);
          expect(countCards(html)).toBe(3);
        } else {
          expect(model.tiers.map((t) => t.plan)).toEqual([MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE]);
          expect(countCards(html)).toBe(2);
          expect(html).not.toContain("Enterprise");
        }
      }
    }
    // The individual audience is not in this box: two tiers, untouched.
    const user = getMembershipPageModel({ audience: "individual", currentPlan: MEMBERSHIP_PLAN.PRO });
    expect(user.tiers.map((t) => t.plan)).toEqual([MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE]);
  });

  it("the Enterprise card is content-only: the ruled copy, a mailto text link, no checkout, no intent, not purchasable", () => {
    const model = getMembershipPageModel({ audience: "vendor", currentPlan: MEMBERSHIP_PLAN.ELITE });
    const enterprise = model.tiers.find((t) => t.plan === ENTERPRISE_TIER)!;
    expect(enterprise.contentOnly).toBe(true);
    expect(enterprise.label).toBe("Enterprise");
    expect(enterprise.title).toBe("Enterprise. The channel license.");
    expect(enterprise.tagline).toBe(
      "Every product line at Elite depth, the aggregate view of your whole channel, and a Guide's quarterly briefing. Licensed per channel. Accounting is the first channel."
    );
    expect(enterprise.features).toEqual([
      "All of your products, each at Elite depth, under one license.",
      "Channel view: category averages, distributions, and module-level positions computed above the evidence thresholds; no firm is ever exposed.",
      "Firm-level evidence for your own ecosystem only; no other vendor sees your firms.",
      "A quarterly briefing per ecosystem, delivered by an independent Guide.",
      "Additional channels added under the same agreement as their banks are published.",
    ]);
    expect(enterprise.priceDisplay).toBe("Enterprise license");
    expect(enterprise.cadence).toBe("by agreement");
    expect(enterprise.ctaLabel).toBe("Talk to us about Enterprise");
    expect(enterprise.ctaHref).toBe(ENTERPRISE_CONTACT_HREF);
    expect(ENTERPRISE_CONTACT_HREF).toBe("mailto:cam@patalignhq.com?subject=PAT%20Enterprise");
    expect(enterprise.isCurrent).toBe(false);
    expect(enterprise.isRecommended).toBe(false);
    // An Elite member's Enterprise card is neither "Current plan" nor "Included with Elite".
    const html = renderToStaticMarkup(createElement(MembershipTierGrid, { model }));
    const card = html.slice(html.indexOf('data-plan="ENTERPRISE"'));
    expect(card).toContain('data-content-only="1"');
    expect(card).toContain('data-testid="membership-tier-contact-link"');
    expect(card).toContain('href="mailto:cam@patalignhq.com?subject=PAT%20Enterprise"');
    expect(card).not.toContain("/membership/checkout");
    expect(card).not.toMatch(/Upgrade to|Current plan|Included with|Most popular/);
    // Enterprise never becomes a checkout plan: the content model has no Enterprise panel or route.
    const source = readFileSync(path.join(ROOT, "lib/membershipContent.ts"), "utf8");
    expect(source).not.toMatch(/checkout\?plan=enterprise/i);
  });

  it("no digit follows \"Enterprise\" anywhere on the page, and the Enterprise card and column carry no digit at all", () => {
    for (const { audience, currentPlan, label } of pages) {
      for (const activeTab of [MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE, "HELP"] as const) {
        const model = getMembershipPageModel({ audience, currentPlan, activeTab });
        const html = renderPage(model);
        const text = textOf(html);
        // Within any sentence that mentions Enterprise, no digit follows the word.
        expect(text, `${label}/${activeTab}`).not.toMatch(/Enterprise[^.!?]*\d/);
        if (audience !== "vendor") continue;
        // The Enterprise card's own text has no digit.
        const cardOpen = html.indexOf('data-plan="ENTERPRISE"');
        const cardStart = html.indexOf(">", cardOpen) + 1; // past the article's own attributes
        const cardEnd = html.indexOf("</article>", cardStart);
        expect(textOf(html.slice(cardStart, cardEnd)), `${label}/${activeTab} card`).not.toMatch(/\d/);
        // Every Enterprise cell in the comparison table has no digit.
        for (const row of model.comparisonTable) {
          const value = row.enterpriseValue;
          if (typeof value === "string") expect(value).not.toMatch(/\d/);
        }
      }
    }
  });
});

describe("change 2 — \"What each membership includes\" on both pages, every phrase in the locale file", () => {
  it("the table is titled from the locale bundle and its columns follow the rendered tiers", () => {
    expect(MEMBERSHIP_COPY.comparisonTitle).toBe("What each membership includes");
    const vendor = renderToStaticMarkup(
      createElement(MembershipComparisonTable, { model: getMembershipPageModel({ audience: "vendor", currentPlan: NO_MEMBERSHIP }) })
    );
    const firm = renderToStaticMarkup(
      createElement(MembershipComparisonTable, { model: getMembershipPageModel({ audience: "firm", currentPlan: NO_MEMBERSHIP }) })
    );
    expect(vendor).toContain("What each membership includes");
    expect(firm).toContain("What each membership includes");
    const headers = (html: string) => [...html.matchAll(/<th[^>]*scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1].trim());
    expect(headers(vendor)).toEqual(["Feature", "Pro", "Elite", "Enterprise"]);
    expect(headers(firm)).toEqual(["Feature", "Pro", "Elite"]);
    // Flat lists: no category header rows.
    expect(vendor).not.toContain('scope="colgroup"');
    expect(firm).not.toContain('scope="colgroup"');
    // Nothing is "coming soon".
    expect(vendor + firm).not.toMatch(/coming soon/i);
  });

  it("the row lists are the ruled rows (R7 and R24 names applied)", () => {
    const vendor = getMembershipPageModel({ audience: "vendor", currentPlan: NO_MEMBERSHIP }).comparisonTable;
    const firm = getMembershipPageModel({ audience: "firm", currentPlan: NO_MEMBERSHIP }).comparisonTable;
    expect(vendor.map((r) => r.feature)).toEqual([
      "Product assessment (own scoring)",
      "Firm product reviews on file",
      "Alignment insight (self-reported vs firm-reviewed, divergence by module)",
      "Product fit (firms in your ecosystem ranked by fit)",
      "Benchmark position and demand signals",
      "Product Fit Card brief (one ranked firm at a time)",
      "Products covered",
      "Channel view",
      "Quarterly Guide briefing",
      "Firm-level evidence",
    ]);
    expect(firm.map((r) => r.feature)).toEqual([
      "Alignment assessment, five modules",
      "Insights hub and drill-down",
      "Product assessments the firm reviews",
      "Tech Stack Sandbox",
      "Peer benchmark",
      "Elite insights (peer position, gap plan, trajectory)",
    ]);
    // Enterprise-only rows; "your ecosystem only" on Elite and Enterprise.
    const byFeature = Object.fromEntries(vendor.map((r) => [r.feature, r]));
    expect(byFeature["Channel view"]).toMatchObject({ proValue: false, eliteValue: false, enterpriseValue: true });
    expect(byFeature["Quarterly Guide briefing"]).toMatchObject({ proValue: false, eliteValue: false, enterpriseValue: true });
    expect(byFeature["Firm-level evidence"]).toMatchObject({ proValue: false, eliteValue: "Your ecosystem only", enterpriseValue: "Your ecosystem only" });
    expect(byFeature["Products covered"]).toMatchObject({ proValue: "Declared products", eliteValue: "Declared products", enterpriseValue: "All product lines" });
    // R7: no "BattleCard" / "Battlecard" label anywhere in the membership copy.
    expect(JSON.stringify([vendor, firm])).not.toMatch(/battle ?card/i);
  });

  it("every table cell phrase and row label appears in lib/locale.ts, and all three locales carry the same keys", () => {
    const phrases = new Set<string>();
    for (const audience of ["vendor", "firm"] as const) {
      for (const row of getMembershipPageModel({ audience, currentPlan: NO_MEMBERSHIP }).comparisonTable) {
        phrases.add(row.feature);
        for (const value of [row.proValue, row.eliteValue, row.enterpriseValue]) {
          if (typeof value === "string") phrases.add(value);
        }
      }
    }
    phrases.add(MEMBERSHIP_COPY.comparisonTitle);
    expect(phrases.size).toBeGreaterThan(16);
    for (const phrase of phrases) {
      expect(localeSource, `locale file carries "${phrase}"`).toContain(JSON.stringify(phrase).slice(1, -1));
    }
    // The Enterprise card copy is in the locale file too (change 4: three languages).
    const en = getLocaleMessages("en").membership;
    for (const text of [en.enterprise.title, en.enterprise.summary, ...en.enterprise.bullets, en.enterprise.priceDisplay, en.enterprise.cadence, en.enterprise.cta]) {
      expect(localeSource).toContain(JSON.stringify(text).slice(1, -1));
    }
    const shape = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.length
        : value && typeof value === "object"
          ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort().map(([k, v]) => [k, shape(v)]))
          : typeof value;
    const enShape = shape(en);
    for (const locale of SUPPORTED_LOCALES) {
      const bundle = getLocaleMessages(locale).membership;
      expect(shape(bundle), `${locale} membership bundle shape`).toEqual(enShape);
      const strings = JSON.stringify(bundle).match(/"[^"]*"/g) ?? [];
      expect(strings.every((s) => s.length > 2), `${locale}: no empty string`).toBe(true);
      // No price number in any language.
      expect(JSON.stringify(bundle.enterprise)).not.toMatch(/\d/);
    }
    expect(SUPPORTED_LOCALES).toEqual(["en", "es", "fr"]);
  });
});
