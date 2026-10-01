import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Box 3h (R58, Cam 10/01) change 1 — the insight hubs show Elite on the main page:
 * an Elite account's three live Elite cards render ABOVE the Pro cards; a Pro account
 * gets the locked previews in the same place plus the one "Elite insights" text link;
 * ?mode redirects to the hub; no Pro / Elite / Help pill anywhere on the hub.
 * Budget mode: the shell is a server component with async children, so the order and
 * the gates are pinned at the source; the card builders are exercised directly.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const shell = read("app/components/insights/InsightsModeShell.tsx");

describe("InsightsModeShell — Elite section above Pro, no modes", () => {
  it("renders the Elite section before the Pro section, once, and the Help link beside the disclaimer", () => {
    const elite = shell.indexOf('testId="insights-elite-section"');
    const pro = shell.indexOf('testId="insights-pro-section"');
    expect(elite).toBeGreaterThan(-1);
    expect(pro).toBeGreaterThan(elite);
    expect(shell).toMatch(/<OutputDisclaimer variant="note" \/>\s*<Link href=\{helpHref\}/);
    expect(shell).not.toMatch(/PatModeToggle|toggleOptions|activeMode|helpPanel|InsightsModeKey/);
  });

  it("a Pro account (locked previews) gets the one 'Elite insights' link to the Elite section; Elite gets none", () => {
    expect(shell).toContain("const proAccount = !!(elitePanel?.lockedPreviews && elitePanel.lockedPreviews.length > 0);");
    expect(shell).toMatch(/const eliteLink = proAccount \? \(\s*<Link href=\{`#\$\{ELITE_SECTION_ID\}`\}[\s\S]*?Elite insights/);
    expect(shell).toContain('const ELITE_SECTION_ID = "elite-insights";');
  });
});

describe("the hubs — ?mode redirects, no mode hrefs, Help goes to the portal help panel", () => {
  for (const [rel, hub, help] of [
    ["app/(app)/vendor/alignment-insights/page.tsx", "/vendor/alignment-insights", "/vendor?panel=help"],
    ["app/(app)/firm/insights/page.tsx", "/firm/insights", "/firm?panel=help"],
    ["app/(app)/user/insights/page.tsx", "/user/insights", "/user?panel=help"],
  ] as const) {
    it(`${rel}`, () => {
      const src = read(rel);
      expect(src).toMatch(new RegExp(`if \\(typeof resolvedSearchParams\\?\\.mode === "string"\\) \\{\\s*redirect\\("${hub}"\\);`));
      expect(src).toContain(`helpHref="${help}"`);
      expect(src).not.toMatch(/getModeHref|toggleOptions|helpPanel|activeMode|\?mode=/);
      if (!rel.includes("/user/")) {
        expect(src).toContain("elitePanel={{");
        expect(src).toContain("lockedPreviews: eliteEntitlement.allowed");
      }
    });
  }
});

describe("Elite hub cards — three live cards for an Elite account, each to its own full view; Pro stays locked", () => {
  it("vendor and firm builders", async () => {
    const { buildFirmEliteInsightCards } = await import("@/lib/firmInsightEngine");
    const firmLive = buildFirmEliteInsightCards({ elite: true });
    expect(firmLive.map((card) => card.href)).toEqual(firmLive.map((card) => `/firm/insights/${card.key}`));
    expect(firmLive).toHaveLength(3);
    expect(buildFirmEliteInsightCards({ elite: false }).every((card) => card.href === null && card.tone === "locked")).toBe(true);
    const { buildVendorAlignmentInsightBundle, buildVendorAlignmentEliteInsightCards } = await import("@/lib/vendorAlignmentInsightEngine");
    const bundle = buildVendorAlignmentInsightBundle({ sampleSize: 6, submissionCount: 6, moduleAggregates: [], capabilityAggregates: [], questionClusters: [] });
    const vendorLive = buildVendorAlignmentEliteInsightCards(bundle, { elite: true });
    expect(vendorLive).toHaveLength(3);
    expect(vendorLive.map((card) => card.href)).toEqual(vendorLive.map((card) => `/vendor/alignment-insights/${card.key}`));
    expect(buildVendorAlignmentEliteInsightCards(bundle, { elite: false }).every((card) => card.href === null)).toBe(true);
  });
});
