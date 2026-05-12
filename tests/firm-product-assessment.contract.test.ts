import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FirmProductAssessmentCatalogCard from "@/app/components/firm/FirmProductAssessmentCatalogCard";
import { FirmProductAssessmentSubmitSchema } from "@/lib/firmProductAssessmentSchemas";
import { deriveFirmProductAssessmentStatus, type FirmProductCatalogItem } from "@/lib/firmPat";
import { buildProductAssessmentPages, getProductAssessmentPlan } from "@/lib/productAssessmentRuntime";

describe("firm product assessment contracts", () => {
  it("derives accurate question counts and progress across firm product states", () => {
    const inProgress = deriveFirmProductAssessmentStatus({
      utilityKeys: ["erp_gl_core_ledger", "ap_payables_spend"],
      latestDraft: {
        answeredCount: 11,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    });
    const notReady = deriveFirmProductAssessmentStatus({
      utilityKeys: [],
      latestSubmission: null,
    });

    expect(inProgress.questionCount).toBe(40);
    expect(inProgress.completedCount).toBe(11);
    expect(inProgress.progressLabel).toBe("11/40");
    expect(inProgress.statusLabel).toBe("In progress");
    expect(notReady.questionCount).toBe(0);
    expect(notReady.statusLabel).toBe("Needs utility declaration");
  });

  it("renders alignment-style catalog progress clearly", () => {
    const product: FirmProductCatalogItem = {
      id: "product-1",
      name: "Ledger Flow",
      vendorName: "Vendor One",
      summary: "Utility-aligned review target.",
      utilityKeys: ["erp_gl_core_ledger", "ap_payables_spend"],
      href: "/firm/product-assessments/product-1",
      questionCount: 40,
      completedCount: 11,
      latestScore: null,
      latestSubmittedAt: null,
      statusLabel: "In progress",
      progressLabel: "11/40",
      description: "A saved firm review draft exists for the current vendor-declared utility scope.",
    };

    const html = renderToStaticMarkup(FirmProductAssessmentCatalogCard({ product }));

    expect(html).toContain("Questions:");
    expect(html).toContain("40");
    expect(html).toContain("Progress:");
    expect(html).toContain("11/40");
    expect(html).toContain("Latest score:");
    expect(html).toContain("Not started");
  });

  it("submit validation accepts zero-valued answers on the canonical 0-5 scale", () => {
    const parsed = FirmProductAssessmentSubmitSchema.safeParse({
      productId: "product-1",
      answers: {
        q1: 0,
        q2: 5,
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("keeps firm product detail paging at 10 questions per page", () => {
    const plan = getProductAssessmentPlan({
      perspective: "firm",
      selectedUtilityKeys: ["erp_gl_core_ledger", "ap_payables_spend", "tax_workflow_compliance"],
    });
    const pages = buildProductAssessmentPages(plan);

    expect(pages.map((page) => page.questionCount)).toEqual([10, 10, 10, 10, 10, 10]);
    expect(pages.every((page) => page.questionCount <= 10)).toBe(true);
  });

  it("keeps list-state copy readable for resumed drafts and completed submissions", () => {
    const inProgress = deriveFirmProductAssessmentStatus({
      utilityKeys: ["erp_gl_core_ledger"],
      latestDraft: {
        answeredCount: 10,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      },
    });
    const complete = deriveFirmProductAssessmentStatus({
      utilityKeys: ["erp_gl_core_ledger"],
      latestSubmission: {
        score: 74,
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
        answeredCount: 20,
      },
    });

    expect(inProgress.description).toMatch(/saved firm review draft/i);
    expect(inProgress.progressLabel).toBe("10/20");
    expect(complete.statusLabel).toBe("Assessment recorded");
    expect(complete.latestScore).toBe(74);
  });
});
