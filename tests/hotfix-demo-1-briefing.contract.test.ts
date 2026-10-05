import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EnterpriseLowestEngagementFirmsCard from "@/app/(app)/enterprise/ecosystems/[ecosystemId]/_components/LowestEngagementFirmsCard";
import GuideLowestEngagementFirmsCard from "@/app/(app)/consultants/ecosystems/[ecosystemId]/_components/LowestEngagementFirmsCard";
import { PortalBriefingView, countFirmFollowUpAnswers } from "@/app/components/admin/briefings/BriefingBoard";
import type { AdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import type { FirmFollowUpEvidenceModule } from "@/lib/assessment/followUpEvidence";
import { nextQuarterCutoffLabel } from "@/lib/consultantFreshness";
import type { EcosystemDetailData } from "@/lib/ecosystem";

/**
 * hotfix-demo-1 (R59, 2026-10-05) changes 6 and 7: no literal goal dates on the
 * engagement cards; the Enterprise and Guide briefing pages lead with Risks,
 * Opportunities and 30/60/90 and fold the follow-up answers and the appendix into
 * closed disclosures whose titles carry the list lengths.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const render = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe("G4 — the goal due date is the next quarter cutoff computed from today", () => {
  it("clock test: the label is the last day of the quarter `now` falls in, in UTC", () => {
    expect(nextQuarterCutoffLabel(new Date("2026-10-05T14:00:00.000Z"))).toBe("2026-12-31");
    expect(nextQuarterCutoffLabel(new Date("2026-01-15T00:00:00.000Z"))).toBe("2026-03-31");
    expect(nextQuarterCutoffLabel(new Date("2026-06-30T23:59:59.000Z"))).toBe("2026-06-30");
    expect(nextQuarterCutoffLabel(new Date("2027-07-01T00:00:00.000Z"))).toBe("2027-09-30");
  });

  const data = {
    firmGrid: [
      { firmCompanyId: "f1", firmCompanyName: "Quarry Lane Tax", moduleCompletionPercent: 40, productReviewCount: 1, thirtyDayActionCount: 2 },
      { firmCompanyId: "f2", firmCompanyName: "Boltway", moduleCompletionPercent: 60, productReviewCount: 0, thirtyDayActionCount: 1 },
      { firmCompanyId: "f3", firmCompanyName: "Ceiling Co", moduleCompletionPercent: 100, productReviewCount: 3, thirtyDayActionCount: 0 },
    ],
  } as unknown as EcosystemDetailData;

  it.each([
    ["enterprise", EnterpriseLowestEngagementFirmsCard],
    ["guide", GuideLowestEngagementFirmsCard],
  ] as const)("%s card: computed date, the new header, no persistence sentence", (_portal, Card) => {
    const html = render(createElement(Card, { data, now: new Date("2026-10-05T14:00:00.000Z") }));
    expect(html).toContain("by 2026-12-31");
    expect(html).not.toContain("2026-06-01");
    expect(html).toContain("The lowest-engaged quartile of the ecosystem, ranked by module completion.");
    expect(html).not.toContain("Firms below median engagement");
    expect(html).not.toContain("Goal text is suggested");
    expect((html.match(/data-testid="lowest-engagement-firm-row"/g) || []).length).toBe(2);
  });

  it("neither card carries a date literal in source", () => {
    for (const portal of ["enterprise", "consultants"]) {
      const source = read(`app/(app)/${portal}/ecosystems/[ecosystemId]/_components/LowestEngagementFirmsCard.tsx`);
      expect(source).not.toMatch(/GOAL_DUE_DATE\s*=\s*"\d{4}-\d{2}-\d{2}"/);
      expect(source).toContain('import { nextQuarterCutoffLabel } from "@/lib/consultantFreshness";');
    }
  });
});

const briefing = {
  company: { id: "firm-1", name: "Quarry Lane Tax", type: "FIRM", userCount: 4, reviewedProductCount: 2, latestUpdatedAt: new Date("2026-09-30T00:00:00.000Z") },
  executiveSummary: { headline: "Headline", summary: "Summary.", canonicalFirmScore: 71, confidenceLabel: "Grounded", confidenceSummary: "Grounded summary." },
  individualLayer: { summary: "People summary.", peopleAssessed: 1, totalUsers: 4, averageScore: 55, latestUpdatedAt: null, confidenceLabel: "Early signal", confidenceSummary: "", evidence: [] },
  firmLayer: { summary: "Firm summary.", averageScore: 71, completedModuleCount: 5, moduleHeatmap: [], evidence: [] },
  productLayer: {
    summary: "Product summary.",
    averageFirmReviewScore: 64,
    reviewedProductCount: 2,
    products: [],
    openEndedResponses: [
      { productId: "p1", productName: "Meridian Tax", vendorName: "Meridian", questionId: "q1", questionKey: "prod.q1", questionPrompt: "Prompt one", sectionTitle: "Section", sectionDescription: "", responseText: "Answer one", submittedAt: null },
      { productId: "p2", productName: "Meridian CAS", vendorName: "Meridian", questionId: "q2", questionKey: "prod.q2", questionPrompt: "Prompt two", sectionTitle: "Section", sectionDescription: "", responseText: "Answer two", submittedAt: null },
    ],
    evidence: [],
  },
  ecosystemLayer: { summary: "Ecosystem summary.", confidenceLabel: "Grounded", confidenceSummary: "Ecosystem confidence.", averageModuleScore: 60, sampleSize: 18, latestUpdatedAt: null, evidence: [] },
  insightNarrative: "Narrative.",
  risks: [{ layer: "firm", title: "Risk one", detail: "Risk detail." }],
  opportunities: [{ layer: "product", title: "Opportunity one", detail: "Opportunity detail." }],
  nextActions: [
    { window: "30 days", title: "Act now", detail: "Detail.", evidence: "Evidence." },
    { window: "60 days", title: "Act soon", detail: "Detail.", evidence: "Evidence." },
    { window: "90 days", title: "Act later", detail: "Detail.", evidence: "Evidence." },
  ],
  confidenceAppendix: [
    { layer: "Executive", sampleSize: 8, confidenceLabel: "Grounded", confidenceSummary: "x", latestUpdatedAt: null, canonicalScore: 71, caveats: [] },
    { layer: "Individual", sampleSize: 1, confidenceLabel: "Early signal", confidenceSummary: "x", latestUpdatedAt: null, canonicalScore: 55, caveats: [] },
    { layer: "Firm", sampleSize: 5, confidenceLabel: "Grounded", confidenceSummary: "x", latestUpdatedAt: null, canonicalScore: 71, caveats: [] },
    { layer: "Ecosystem", sampleSize: 18, confidenceLabel: "Grounded", confidenceSummary: "x", latestUpdatedAt: null, canonicalScore: 60, caveats: [] },
  ],
} as unknown as AdminCompanyBriefing;

const followUps: FirmFollowUpEvidenceModule[] = [
  {
    moduleKey: "firm_alignment_strategy_v1",
    title: "Strategy",
    pillar: "Strategy",
    submissionId: "s1",
    submittedAt: "2026-09-30T00:00:00.000Z",
    items: [
      { questionKey: "strategy_open_1", index: 1, stem: "Stem", selectionMode: "single", kind: "selection", options: [{ key: "a", label: "Option A", consequence: null, kind: "choice" }], otherText: null, text: null },
      { questionKey: "strategy_open_2", index: 2, stem: "Stem", selectionMode: "single", kind: "text", options: [], otherText: null, text: "Written." },
      { questionKey: "strategy_open_3", index: 3, stem: "Stem", selectionMode: "single", kind: "none", options: [], otherText: null, text: null },
    ],
  },
  {
    moduleKey: "firm_alignment_data_flow_v1",
    title: "Data Flow",
    pillar: "Data",
    submissionId: "s2",
    submittedAt: "2026-09-29T00:00:00.000Z",
    items: [{ questionKey: "data_open_1", index: 1, stem: "Stem", selectionMode: "single", kind: "selection", options: [{ key: "b", label: "Option B", consequence: null, kind: "choice" }], otherText: null, text: null }],
  },
  { moduleKey: "firm_alignment_governance_v1", title: "Governance", pillar: "Governance", submissionId: null, submittedAt: null, items: [] },
] as FirmFollowUpEvidenceModule[];

function renderPortal(overrides: Partial<Parameters<typeof PortalBriefingView>[0]> = {}) {
  return render(
    createElement(PortalBriefingView, {
      briefing,
      basePath: "/enterprise/briefings/firm-1",
      followUpModules: followUps,
      individualSurfacesEnabled: false,
      ...overrides,
    })
  );
}

function orderOf(html: string, markers: string[]) {
  return markers.map((marker) => {
    const at = html.indexOf(marker);
    expect(at, `missing ${marker}`).toBeGreaterThan(-1);
    return at;
  });
}

describe("B — the Enterprise and Guide briefing pages", () => {
  it("section order: Executive summary; Risks; Opportunities; 30/60/90; Module heatmap; Product stack summary; three disclosures", () => {
    const html = renderPortal();
    const positions = orderOf(html, [
      "Executive summary",
      ">Risks<",
      ">Opportunities<",
      "30 / 60 / 90 next actions",
      ">Module heatmap<",
      ">Product stack summary<",
      'data-key="vendor-follow-ups"',
      'data-key="firm-follow-ups"',
      'data-key="confidence-appendix"',
    ]);
    for (let index = 1; index < positions.length; index += 1) expect(positions[index]).toBeGreaterThan(positions[index - 1]);
    // the count tiles and layer tiles stay under the executive summary, before Risks
    const [exec, firmTile, layers, risks] = orderOf(html, ["Executive summary", ">Firm<", ">Layer summaries<", ">Risks<"]);
    expect(firmTile).toBeGreaterThan(exec);
    expect(layers).toBeGreaterThan(firmTile);
    expect(risks).toBeGreaterThan(layers);
  });

  it("the three disclosures are closed on first render and their titles count the lists", () => {
    const html = renderPortal();
    const details = html.match(/<details[^>]*>/g) || [];
    expect(details).toHaveLength(3);
    for (const tag of details) expect(tag).not.toMatch(/\sopen(=|>|\s)/);
    expect(html).toContain(`Vendor follow-up answers (${briefing.productLayer.openEndedResponses.length})`);
    expect(countFirmFollowUpAnswers(followUps)).toBe(3); // 2 + 1 answered items; the "none" item and the unsubmitted module do not count
    expect(html).toContain("Firm follow-up answers (3)");
    expect(html).toContain(">Confidence and evidence appendix<");
    // the existing search sits inside the vendor disclosure
    const vendor = html.slice(html.indexOf('data-key="vendor-follow-ups"'), html.indexOf('data-key="firm-follow-ups"'));
    expect(vendor).toContain('name="q"');
    expect(vendor).toContain("Search responses");
    // the module filter sits inside the firm disclosure
    const firm = html.slice(html.indexOf('data-key="firm-follow-ups"'), html.indexOf('data-key="confidence-appendix"'));
    expect(firm).toContain('data-testid="firm-follow-up-module-filter"');
    expect(firm).toContain("?module=firm_alignment_strategy_v1");
    expect(firm).toContain('data-testid="followup-evidence-panel"');
  });

  it("a search opens the vendor disclosure; a module filter opens the firm disclosure and narrows it", () => {
    const searched = renderPortal({ searchQuery: "Answer" });
    expect(searched).toMatch(/<details[^>]*data-key="vendor-follow-ups"[^>]*open/);
    const filtered = renderPortal({ moduleFilter: "firm_alignment_data_flow_v1" });
    expect(filtered).toMatch(/<details[^>]*data-key="firm-follow-ups"[^>]*open/);
    const firm = filtered.slice(filtered.indexOf('data-key="firm-follow-ups"'), filtered.indexOf('data-key="confidence-appendix"'));
    expect(firm).toContain('data-module-key="firm_alignment_data_flow_v1"');
    expect(firm).not.toContain('data-module-key="firm_alignment_strategy_v1"');
    expect(filtered).toContain("Firm follow-up answers (3)"); // the count is the firm's answers, not the filtered view
  });

  it("the Person-level tile and the Individual appendix row hide while the individual surface is disabled", () => {
    const off = renderPortal({ individualSurfacesEnabled: false });
    expect(off).not.toContain(">Person-level<");
    const appendixOff = off.slice(off.indexOf('data-key="confidence-appendix"'));
    expect(appendixOff).not.toContain(">Individual<");
    expect(appendixOff).toContain(">Firm<");
    const on = renderPortal({ individualSurfacesEnabled: true });
    expect(on).toContain(">Person-level<");
    expect(on.slice(on.indexOf('data-key="confidence-appendix"'))).toContain(">Individual<");
  });

  it("portal voice: Firm score and Completed firm modules; no firm follow-up disclosure while the flag is off", () => {
    const html = renderPortal();
    expect(html).toContain("Firm score:");
    expect(html).toContain("Completed firm modules in the current briefing.");
    expect(html).not.toContain("Canonical firm score");
    expect(html).not.toContain("Completed canonical firm alignment modules");
    const flagOff = renderPortal({ followUpModules: null });
    expect((flagOff.match(/<details/g) || []).length).toBe(2);
  });

  it("both pages mount the portal view through the ecosystem-scoped reader and carry the new header sentence", () => {
    for (const portal of ["enterprise", "consultants"]) {
      const page = read(`app/(app)/${portal}/briefings/[companyId]/page.tsx`);
      expect(page).toContain("Built from this firm's current PAT evidence. No benchmark or forecast is added here.");
      expect(page).not.toContain("reuses the same live PAT current-state briefing engine");
      expect(page).toContain("<PortalBriefingView");
      expect(page).not.toContain("<CompanyBriefingView");
      expect(page).toContain("getFirmBriefingInEcosystem({ companyId, vendorCompanyId: ecosystemScope.vendorCompanyId })");
      expect(page).toContain("followUpModules={followUpMcEnabled && followUpEvidence ? followUpEvidence : null}");
      expect(page).toContain("individualSurfacesEnabled={isIndividualSurfacesEnabled()}");
      expect(page).not.toContain("Canonical firm score");
    }
    // the admin briefing keeps its wording and its view
    const admin = read("app/(app)/admin/briefings/page.tsx");
    expect(admin).toContain("Canonical firm score");
    const board = read("app/components/admin/briefings/BriefingBoard.tsx");
    expect(board).toContain("export function CompanyBriefingView(");
  });
});
