import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFirmInsightDetailSurfaceContent } from "@/lib/firmInsightEngine";
import { buildVendorAlignmentInsightBundle, buildVendorAlignmentInsightDetailSurfaceContent } from "@/lib/vendorAlignmentInsightEngine";

/**
 * Box 3h (R58, Cam 10/01) change 3 — a Pro insight's full view is a superset of its
 * inline panel: headline and band, the two bar lists, "What this means", then
 * "Current limits" and "Evidence provenance". Every string on the full view already
 * exists in the shared detail body (the panel) or the engine's surface output; the
 * pages add no copy of their own. Budget mode: engine output and source pins.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("engine surface output — limits then provenance, nothing else", () => {
  it("vendor: the Pro surface carries exactly Current limits and Evidence provenance, same for the default branch", () => {
    const bundle = buildVendorAlignmentInsightBundle({ sampleSize: 6, submissionCount: 6, moduleAggregates: [], capabilityAggregates: [], questionClusters: [] });
    const report = bundle.reports.find((entry) => entry.tier === 1 && !entry.locked)!;
    const pro = buildVendorAlignmentInsightDetailSurfaceContent({ report, surface: "pro" });
    expect(pro.items.map((item) => item.title)).toEqual(["Current limits", "Evidence provenance"]);
    expect(pro.items.every((item) => item.body.trim().length > 0)).toBe(true);
    const elite = buildVendorAlignmentInsightDetailSurfaceContent({ report, surface: "elite" });
    expect(elite).toEqual(pro);
    const text = [pro.intro, ...pro.items.map((item) => item.body)].join(" ");
    expect(text).not.toMatch(/Current PAT picture|Where the signal is strongest|Where the signal is under pressure|What Elite adds here/);
  });

  it("firm: the Pro surface carries exactly Current limits and Evidence provenance", () => {
    const src = read("lib/firmInsightEngine.ts");
    expect(src).not.toMatch(/title: "Current PAT picture",\s*body: `\$\{input\.report\.currentStateSummary\}/);
    expect(src).not.toContain("summarizeFirmInsightStrengths");
    expect(src).not.toContain("summarizeFirmInsightPressure");
    // the builder is exercised with the firm fixture in tests/firm-unlocks.contract.test.ts (titles pinned there)
    expect(typeof buildFirmInsightDetailSurfaceContent).toBe("function");
  });
});

describe("full view pages — the panel body first, no copy of their own", () => {
  const bodies = {
    vendor: read("app/components/insights/detail/VendorAlignmentInsightDetailBody.tsx"),
    firm: read("app/components/insights/detail/FirmInsightDetailBody.tsx"),
  };

  it("the shared bodies render the headline lockup, the two bar lists and the 'What this means' paragraph", () => {
    expect(bodies.vendor).toContain("<ScoreLockup");
    expect(bodies.vendor).toContain("Firm-side signal by area");
    expect(bodies.vendor).toContain("Supporting capability signal");
    expect(bodies.vendor).toContain("What this means for your positioning");
    expect(bodies.firm).toContain("<ScoreLockup");
    expect(bodies.firm).toContain("Module evidence");
    expect(bodies.firm).toContain("Capability evidence");
    expect(bodies.firm).toContain("What this means for your firm");
  });

  for (const [rel, body] of [
    ["app/(app)/vendor/alignment-insights/[key]/page.tsx", "<VendorAlignmentInsightDetailBody report={report} />"],
    ["app/(app)/firm/insights/[key]/page.tsx", "<FirmInsightDetailBody report={report} insightKey={key} />"],
  ] as const) {
    it(`${rel}: renders the shared body as the visual lead, the engine surface, no pill, no disclosure, no prose of its own`, () => {
      const src = read(rel);
      expect(src).toContain(body);
      expect(src).toContain("visualLead={visualLead}");
      expect(src).toContain("surfaceContent={surfaceContent}");
      expect(src).toContain('surface: "pro"');
      expect(src).not.toMatch(/toggleOptions|surfaceCollapsed|\?surface=|Open Elite Insights|What Elite adds here/);
      // the only JSX text the page adds is the locked preview fallback description
      const jsx = src.slice(src.indexOf("return (\n    <InsightDetailShell"));
      const literals = [...jsx.matchAll(/>\s*([A-Z][^<{>]{12,})\s*</g)].map((m) => m[1].trim());
      expect(literals).toEqual([]);
    });
  }
});
