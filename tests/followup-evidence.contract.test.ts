import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFollowUpEvidenceFromAnswers,
  buildFollowUpEvidenceItems,
  summarizeFollowUpAggregate,
  summarizeFollowUpOtherTexts,
} from "@/lib/assessment/followUpEvidence";

/**
 * MC follow-on box (Part B) — consumer read models are pure and tested; every
 * mount is behind PAT_ENABLE_FOLLOWUP_MC (source pins), so flag-off brief pages
 * are byte-identical (rendered diff at commit time).
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const OPS = "firm_alignment_operating_model_v1";

describe("firm follow-up evidence — rows first, JSON fallback, legacy text as written", () => {
  it("renders a selection as chosen options with consequences, Other text, and none as its own row", () => {
    const items = buildFollowUpEvidenceItems(OPS, [
      { questionKey: "operating-model_open_1", selectionMode: "SINGLE", optionKey: "ops.q1.c", otherText: null },
      { questionKey: "operating-model_open_2", selectionMode: "MULTI", optionKey: "ops.q2.a", otherText: null },
      { questionKey: "operating-model_open_2", selectionMode: "MULTI", optionKey: "ops.q2.other", otherText: "Outsourced prep handoff" },
      { questionKey: "operating-model_open_3", selectionMode: "SINGLE", optionKey: "ops.q3.none", otherText: null },
      { questionKey: "operating-model_open_4", selectionMode: "TEXT", optionKey: null, otherText: "Legacy free text" },
    ]);
    expect(items.map((item) => item.kind)).toEqual(["selection", "selection", "selection", "text", "none"]);
    expect(items[0].options).toEqual([expect.objectContaining({ key: "ops.q1.c", label: "Slow review cycles", kind: "choice" })]);
    expect(items[0].options[0].consequence).toContain("manager/partner queues");
    expect(items[1].options.map((o) => o.key)).toEqual(["ops.q2.a", "ops.q2.other"]);
    expect(items[1].otherText).toBe("Outsourced prep handoff");
    expect(items[2].options).toEqual([expect.objectContaining({ key: "ops.q3.none", kind: "not_significant", label: "Not a significant issue here" })]);
    expect(items[3].text).toBe("Legacy free text");
    expect(items[4]).toMatchObject({ kind: "none", options: [], text: null, otherText: null });
    expect(items.map((item) => item.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it("option rows win over a TEXT row for the same question; Other text only when Other is picked", () => {
    const items = buildFollowUpEvidenceItems(OPS, [
      { questionKey: "operating-model_open_1", selectionMode: "TEXT", optionKey: null, otherText: "old text" },
      { questionKey: "operating-model_open_1", selectionMode: "SINGLE", optionKey: "ops.q1.a", otherText: "stray" },
    ]);
    expect(items[0]).toMatchObject({ kind: "selection", otherText: null, text: null });
  });

  it("JSON fallback: selection objects and strings map the same way; other modules' keys are ignored", () => {
    const items = buildFollowUpEvidenceFromAnswers(OPS, {
      "operating-model_open_1": { optionKeys: ["ops.q1.b"], otherText: null },
      "operating-model_open_2": "Written answer",
      "strategy_open_1": { optionKeys: ["strat.q1.a"], otherText: null },
    });
    expect(items[0]).toMatchObject({ kind: "selection" });
    expect(items[1]).toMatchObject({ kind: "text", text: "Written answer" });
    expect(items[2].kind).toBe("none");
    expect(items).toHaveLength(5);
  });
});

describe("ecosystem aggregate — top pick per question with n; none/Other excluded", () => {
  it("counts only named options and reports firms and excluded picks", () => {
    const rows = [
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.a", submissionId: "s1" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.a", submissionId: "s2" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.c", submissionId: "s3" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.none", submissionId: "s4" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.other", submissionId: "s5" },
      { questionKey: "operating-model_open_2", optionKey: "ops.q2.none", submissionId: "s1" },
    ];
    const summary = summarizeFollowUpAggregate(rows);
    const q1 = summary.find((row) => row.questionKey === "operating-model_open_1")!;
    expect(q1.topOption).toEqual({ key: "ops.q1.a", label: "Unclear ownership in handoffs", count: 2 });
    expect(q1).toMatchObject({ includedPicks: 3, excludedPicks: 2, firmsAnswered: 5 });
    const q2 = summary.find((row) => row.questionKey === "operating-model_open_2")!;
    expect(q2.topOption).toBeNull();
    expect(q2).toMatchObject({ includedPicks: 0, excludedPicks: 1, firmsAnswered: 1 });
    expect(summary).toHaveLength(25);
  });
});

describe("Other-rate gauge — write-ins per question with counts and rate", () => {
  it("groups Other texts per question, newest first, with rate over all picks", () => {
    const d = (day: number) => new Date(Date.UTC(2026, 8, day));
    const rows = [
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.other", otherText: "Intake", companyId: "c1", createdAt: d(1) },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.other", otherText: "Partner queue", companyId: "c2", createdAt: d(3) },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.a", otherText: null, companyId: "c3", createdAt: d(2) },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.none", otherText: null, companyId: "c4", createdAt: d(2) },
    ];
    const group = summarizeFollowUpOtherTexts(rows).find((g) => g.questionKey === "operating-model_open_1")!;
    expect(group).toMatchObject({ otherCount: 2, totalPicks: 4, otherRate: 0.5 });
    expect(group.texts.map((t) => t.text)).toEqual(["Partner queue", "Intake"]);
    const empty = summarizeFollowUpOtherTexts(rows).find((g) => g.questionKey === "strategy_open_5")!;
    expect(empty).toMatchObject({ otherCount: 0, totalPicks: 0, otherRate: null, texts: [] });
  });
});

describe("source pins — every consumer mount is flag-gated; option copy lives in the registry only", () => {
  const firmPage = read("app/(app)/consultants/ecosystems/[ecosystemId]/firm/[firmCompanyId]/page.tsx");
  const briefingPage = read("app/(app)/consultants/briefings/[companyId]/page.tsx");
  const adminBriefingPage = read("app/(app)/admin/briefings/[companyId]/page.tsx");
  const ecosystemPage = read("app/(app)/consultants/ecosystems/[ecosystemId]/page.tsx");
  const otherPage = read("app/(app)/admin/followup-other/page.tsx");
  const nav = read("lib/adminControlPlane.ts");
  const evidencePanel = read("app/components/assessment/FollowUpEvidencePanel.tsx");

  it("firm brief, consultant briefing, admin briefing: evidence panel only when isFollowUpMcEnabled()", () => {
    for (const source of [firmPage, briefingPage, adminBriefingPage]) {
      expect(source).toContain('from "@/lib/followUpMc"');
      expect(source).toMatch(/isFollowUpMcEnabled\(\)/);
      expect(source).toMatch(/followUpMcEnabled && [\s\S]{0,80}\? \(?[\s\S]{0,120}<FollowUpEvidencePanel/);
    }
    // The firm brief adds a "follow-ups" panel option only behind the flag.
    expect(firmPage).toMatch(/\.\.\.\(followUpMcEnabled\s*\?\s*\[\{ key: "follow-ups"/);
  });

  it("ecosystem view: aggregate panel only when isFollowUpMcEnabled()", () => {
    expect(ecosystemPage).toMatch(/followUpMcEnabled && followUpAggregate \? \(\s*<FollowUpAggregatePanel/);
    expect(ecosystemPage).toContain("getEcosystemFollowUpAggregate(");
  });

  it("admin Other page 404s flag-off and the nav item exists only flag-on", () => {
    expect(otherPage).toMatch(/if \(!isFollowUpMcEnabled\(\)\) \{\s*notFound\(\);/);
    expect(nav).toMatch(/isFollowUpMcEnabled\(\)[\s\S]{0,120}\/admin\/followup-other/);
  });

  it("panels carry no option copy; the evidence panel renders none/Other as distinct kinds", () => {
    for (const source of [evidencePanel, read("app/components/assessment/FollowUpAggregatePanel.tsx")]) {
      expect(source).not.toContain("Unclear ownership in handoffs");
    }
    expect(evidencePanel).toContain('data-option-kind={option.kind}');
    expect(evidencePanel).toContain("&ldquo;{item.otherText}&rdquo;");
  });
});
