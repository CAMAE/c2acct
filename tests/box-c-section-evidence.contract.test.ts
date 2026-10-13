import { describe, expect, it } from "vitest";
import { buildProductFitDimensions, resolveVersionedAnswerQuestions } from "@/lib/vendorProductInsightEngine";
import { buildVendorProductQuestions } from "@/lib/vendorPat";
import { accountingCompanyContext } from "@/lib/verticals/companyBoundary";

/**
 * box-c (R65, item 1): a final submitted under an earlier bank version keeps its
 * per-section and per-dimension evidence. One v2 final and one v3 final for the
 * same product both yield section evidence; a v2 subcategory with no v3
 * counterpart reads under its own name with the version noted.
 */
const registry = accountingCompanyContext().registry!;
const V2 = "2026-03-product-utility-v2";
const UTILITIES = ["client_collaboration_portal_requests", "payroll_workforce_support"];

const v3Questions = buildVendorProductQuestions(UTILITIES, registry);
const v3Answers: Record<string, number> = Object.fromEntries(v3Questions.map((q) => [q.id, 4]));
// The same answers as the v2 bank would have stored them: v2 ids, one subcategory renamed to a v2-only key.
const v2Answers: Record<string, number> = Object.fromEntries(
  v3Questions.map((q, index) => {
    const [, utility, subcategory, key] = q.id.split("__");
    const v2Subcategory = index < 4 ? "portal_requests_and_tracking_v2_only" : subcategory;
    return [`${V2}__${utility}__${v2Subcategory}__${key}`, 3];
  })
);

describe("section evidence for pre-bump finals (box-c item 1)", () => {
  it("v3 answers resolve to no versioned questions (unchanged path)", () => {
    expect(resolveVersionedAnswerQuestions(v3Answers, UTILITIES, "vendor", registry)).toEqual([]);
  });

  it("v2 answers resolve through utility + subcategory to the v3 section, and a v2-only subcategory keeps its own name with the version", () => {
    const resolved = resolveVersionedAnswerQuestions(v2Answers, UTILITIES, "vendor", registry);
    expect(resolved.length).toBe(v3Questions.length);
    const v3SectionKeys = new Set(v3Questions.map((q) => q.section.key));
    const mapped = resolved.filter((q) => v3SectionKeys.has(q.section.key));
    const kept = resolved.filter((q) => !v3SectionKeys.has(q.section.key));
    expect(mapped.length).toBe(v3Questions.length - 4);
    expect(kept.length).toBe(4);
    expect(kept[0]!.section.title).toBe(`Portal requests and tracking v2 only (bank ${V2})`);
    expect(kept[0]!.section.key.startsWith(`${V2}__`)).toBe(true);
    // every resolved question carries a basis through its question key
    expect(resolved.every((q) => q.basisKey !== null)).toBe(true);
  });

  it("dimension evidence is non-empty for a v2 final and for a v3 final alike", () => {
    const scale = { scaleMin: 1, scaleMax: 5 };
    const v3 = buildProductFitDimensions(UTILITIES, [{ answers: v3Answers, ...scale }], "vendor", registry);
    const v2 = buildProductFitDimensions(UTILITIES, [{ answers: v2Answers, ...scale }], "vendor", registry);
    expect(v3.filter((d) => d.sampleSize > 0).length).toBeGreaterThan(0);
    expect(v2.map((d) => d.sampleSize)).toEqual(v3.map((d) => d.sampleSize));
    expect(v2.filter((d) => d.score !== null).length).toBe(v3.filter((d) => d.score !== null).length);
  });
});
