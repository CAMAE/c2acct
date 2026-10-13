import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sampleRecentResponses } from "@/lib/recentResponsesSample";

/** box-c (R65, item 7): recent responses sampled across firms and products; the picks panel explains differing firm counts. */
const ROOT = path.resolve(__dirname, "..");
type R = { id: number; firmCompanyId: string; productId: string };
const rows: R[] = [];
let id = 0;
for (const firm of ["aldermere", "brook", "cobalt", "dune", "elm"]) {
  for (const product of ["portal", "tax", "payroll"]) {
    for (let k = 0; k < 3; k += 1) rows.push({ id: id++, firmCompanyId: firm, productId: product });
  }
}

describe("Recent firm responses sampling (box-c item 7a)", () => {
  it("at most two per firm and three per product, newest first, up to ten", () => {
    const picked = sampleRecentResponses(rows, { max: 10, perFirm: 2, perProduct: 3 });
    expect(picked.length).toBe(9); // 3 products × 3 = 9 is the ceiling before the per-product caps bind
    const byFirm = new Map<string, number>();
    const byProduct = new Map<string, number>();
    for (const r of picked) {
      byFirm.set(r.firmCompanyId, (byFirm.get(r.firmCompanyId) ?? 0) + 1);
      byProduct.set(r.productId, (byProduct.get(r.productId) ?? 0) + 1);
    }
    expect([...byFirm.values()].every((n) => n <= 2)).toBe(true);
    expect([...byProduct.values()].every((n) => n <= 3)).toBe(true);
    expect(picked.map((r) => r.id)).toEqual([...picked.map((r) => r.id)].sort((a, b) => a - b)); // input order kept (newest first)
    expect(picked[0]!.id).toBe(0);
  });
  it("with one product in view the per-product cap is off and the per-firm cap still spreads firms", () => {
    const one = rows.filter((r) => r.productId === "portal");
    const picked = sampleRecentResponses(one, { max: 10, perFirm: 2, perProduct: null });
    expect(picked.length).toBe(10);
    expect(new Set(picked.map((r) => r.firmCompanyId)).size).toBe(5);
  });
  it("the panel reads the sampler and the picks panel carries the count note", () => {
    const panel = readFileSync(path.join(ROOT, "app/(app)/consultants/ecosystems/[ecosystemId]/_components/OpenEndedPanel.tsx"), "utf8");
    expect(panel).toContain("sampleRecentResponses(filteredResponses");
    const picks = readFileSync(path.join(ROOT, "app/components/assessment/FollowUpAggregatePanel.tsx"), "utf8");
    expect(picks).toContain("Firm counts differ by module where a firm has not completed that module.");
  });
});
