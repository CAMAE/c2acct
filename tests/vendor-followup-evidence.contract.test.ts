import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  pickLatestFinalPerProduct,
  summarizeFollowUpAggregate,
  summarizeVendorFollowUpAggregate,
  summarizeVendorFollowUpOtherTexts,
} from "@/lib/assessment/followUpEvidence";
import { describeVendorFollowUpAnswer, encodeVendorFollowUpAnswer } from "@/lib/assessment/vendorFollowUpMcRuntime";
import { aggregateFollowUpOptionCounts } from "@/lib/assessment/firmFollowUpOptions";

/**
 * vendor-followup-mc box (change 6) — the vendor read models are pure and tested;
 * every mount is behind PAT_ENABLE_VENDOR_FOLLOWUP_MC (source pins).
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("vendor aggregate — the same exclusion helper, none and Other never count", () => {
  it("counts named options only; reports products and excluded picks; 10 rows in registry order", () => {
    const rows = [
      { questionKey: "strongest_workflow", optionKey: "prod.q1.a", submissionId: "p1" },
      { questionKey: "strongest_workflow", optionKey: "prod.q1.a", submissionId: "p2" },
      { questionKey: "strongest_workflow", optionKey: "prod.q1.c", submissionId: "p3" },
      { questionKey: "strongest_workflow", optionKey: "prod.q1.none", submissionId: "p4" },
      { questionKey: "strongest_workflow", optionKey: "prod.q1.other", submissionId: "p5" },
      { questionKey: "best_fit_customer", optionKey: "prod.q7.other", submissionId: "p1" },
      { questionKey: "operating-model_open_1", optionKey: "ops.q1.a", submissionId: "f1" }, // a firm row never lands here
    ];
    const summary = summarizeVendorFollowUpAggregate(rows);
    expect(summary).toHaveLength(10);
    expect(summary.map((row) => row.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const q1 = summary[0];
    expect(q1.topOption).toEqual({ key: "prod.q1.a", label: "Daily use by the people who own the work.", count: 2 });
    expect(q1).toMatchObject({ includedPicks: 3, excludedPicks: 2, firmsAnswered: 5, pillar: "Product" });
    const q7 = summary[6];
    expect(q7.topOption).toBeNull();
    expect(q7).toMatchObject({ includedPicks: 0, excludedPicks: 1, firmsAnswered: 1 });
    // the firm aggregate stays the firm aggregate: vendor rows are unknown to it (excluded), firm rows unchanged
    expect(summarizeFollowUpAggregate(rows)[0].topOption).toEqual({ key: "ops.q1.a", label: "Unclear ownership in handoffs", count: 1 });
    expect(aggregateFollowUpOptionCounts(rows)["strongest_workflow"]).toBeUndefined();
  });

  it("the latest final submission per product wins, whatever the order in", () => {
    const d = (day: number) => new Date(Date.UTC(2026, 8, day));
    const picked = pickLatestFinalPerProduct([
      { id: "old-a", productId: "a", createdAt: d(1) },
      { id: "new-a", productId: "a", createdAt: d(9) },
      { id: "mid-a", productId: "a", createdAt: d(5) },
      { id: "only-b", productId: "b", createdAt: d(2) },
    ]);
    expect(picked.map((submission) => submission.id).sort()).toEqual(["new-a", "only-b"]);
  });

  it("Other texts per vendor question: newest first, rate over all picks, vendor names resolved", () => {
    const d = (day: number) => new Date(Date.UTC(2026, 8, day));
    const rows = [
      { questionKey: "best_fit_customer", optionKey: "prod.q7.other", otherText: "Bookkeeping-led firms", companyId: "v1", createdAt: d(3) },
      { questionKey: "best_fit_customer", optionKey: "prod.q7.other", otherText: "Franchise groups", companyId: "v2", createdAt: d(7) },
      { questionKey: "best_fit_customer", optionKey: "prod.q7.a", otherText: null, companyId: "v1", createdAt: d(3) },
      { questionKey: "best_fit_customer", optionKey: "prod.q7.none", otherText: null, companyId: "v3", createdAt: d(1) },
    ];
    const groups = summarizeVendorFollowUpOtherTexts(rows, new Map([["v1", "Meridian Practice Cloud"]]));
    const q7 = groups.find((group) => group.questionKey === "best_fit_customer")!;
    expect(q7).toMatchObject({ otherCount: 2, totalPicks: 4, otherRate: 0.5 });
    expect(q7.texts.map((entry) => [entry.text, entry.companyName])).toEqual([["Franchise groups", null], ["Bookkeeping-led firms", "Meridian Practice Cloud"]]);
    expect(groups.find((group) => group.questionKey === "strongest_workflow")).toMatchObject({ otherCount: 0, totalPicks: 0, otherRate: null, texts: [] });
  });
});

describe("change 6a — a pick reads as its labels for the briefing readers", () => {
  it("joins the selected labels with '; ' and substitutes the Other write-in; null for free text", () => {
    expect(describeVendorFollowUpAnswer("best_fit_customer", encodeVendorFollowUpAnswer({ optionKeys: ["prod.q7.other", "prod.q7.c", "prod.q7.a"], otherText: " Bookkeeping-led firms " }))).toBe(
      "Solo and small firms, 1 to 5 people.; Mid-size firms, 21 to 100 people.; Bookkeeping-led firms"
    );
    expect(describeVendorFollowUpAnswer("control_concern", encodeVendorFollowUpAnswer({ optionKeys: ["prod.q6.none"], otherText: null }))).toBe("Not a significant issue here");
    expect(describeVendorFollowUpAnswer("control_concern", "We document data handling in the DPA.")).toBeNull();
    expect(describeVendorFollowUpAnswer("not_a_question", encodeVendorFollowUpAnswer({ optionKeys: ["prod.q1.a"], otherText: null }))).toBeNull();
  });
});

describe("source pins — every vendor mount is behind isVendorFollowUpMcEnabled()", () => {
  it("briefing engine, Guide and Enterprise ecosystem pages, admin followup-other", () => {
    expect(read("lib/adminBriefingEngine.ts")).toMatch(/isVendorFollowUpMcEnabled\(\) \? describeVendorFollowUpAnswer\(questionKey, trimmedResponse\) : null/);
    for (const rel of ["app/(app)/consultants/ecosystems/[ecosystemId]/page.tsx", "app/(app)/enterprise/ecosystems/[ecosystemId]/page.tsx"]) {
      const source = read(rel);
      expect(source).toMatch(/vendorFollowUpMcEnabled \? await getVendorFollowUpAggregate\(detail\.vendorProductIds\) : null/);
      expect(source).toMatch(/\{vendorFollowUpMcEnabled && vendorFollowUpAggregate \? \([\s\S]*?eyebrow="Vendor follow-up picks"/);
    }
    const admin = read("app/(app)/admin/followup-other/page.tsx");
    expect(admin).toContain("vendorEnabled ? await getVendorFollowUpOtherTexts() : []");
    expect(admin).toContain("if (!firmEnabled && !vendorEnabled)");
  });
});
