import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VendorProductAssessmentDashboard from "@/app/components/vendor/VendorProductAssessmentDashboard";
import { deriveProductStatus } from "@/lib/vendorPat";
import {
  buildVendorProductAssessmentPlan,
  serializeVendorProductAssessmentPlan,
} from "@/lib/vendorProductAssessmentPlan";

describe("vendor product assessment contracts", () => {
  it("builds the product-general module, utility-driven scored modules, and final open-ended module", () => {
    const plan = buildVendorProductAssessmentPlan(["erp_gl_core_ledger", "ap_payables_spend"]);
    const generalModule = plan.modules.find((module) => module.kind === "general");
    const utilityModules = plan.modules.filter((module) => module.kind === "utility");
    const openEndedModule = plan.modules.find((module) => module.kind === "open-ended");

    expect(generalModule?.questions).toHaveLength(10);
    expect(utilityModules).toHaveLength(2);
    expect(utilityModules.every((module) => module.questions.length === 20)).toBe(true);
    expect(utilityModules.every((module) => module.sections.length === 4)).toBe(true);
    expect(utilityModules.every((module) => module.sections.every((section) => section.questionIds.length === 5))).toBe(
      true
    );
    expect(openEndedModule?.questions).toHaveLength(10);
    expect(generalModule?.sections.map((section) => section.questionIds.length)).toEqual([5, 5]);
    expect(openEndedModule?.sections.map((section) => section.questionIds.length)).toEqual([5, 5]);
  });

  it("serializes a stable generated question plan for resume and review", () => {
    const snapshot = serializeVendorProductAssessmentPlan(["erp_gl_core_ledger"]);

    expect(snapshot.selectedUtilityKeys).toEqual(["erp_gl_core_ledger"]);
    expect(snapshot.profileQuestionIds).toHaveLength(10);
    expect(snapshot.scoredQuestionIds).toHaveLength(20);
    expect(snapshot.openEndedQuestionIds).toHaveLength(10);
    expect(snapshot.generatedQuestionIds).toHaveLength(40);
    expect(snapshot.moduleOrder).toEqual([
      "product_general_v1",
      "erp_gl_core_ledger",
      "product_open_ended_v1",
    ]);
    expect(snapshot.sectionOrder).toHaveLength(8);
    expect(snapshot.sectionPlan).toHaveLength(8);
    expect(snapshot.sectionPlan[2]).toMatchObject({
      moduleKey: "erp_gl_core_ledger",
      subcategoryKey: "journal_processing",
    });
  });

  it("reports workspace card state against the full generated question set", () => {
    const readyStatus = deriveProductStatus({
      utilityKeys: ["erp_gl_core_ledger"],
      latestSubmission: null,
    });

    const recordedStatus = deriveProductStatus({
      utilityKeys: ["erp_gl_core_ledger"],
      latestSubmission: {
        id: "submission-1",
        score: 82,
        createdAt: new Date("2026-03-31T00:00:00.000Z"),
        answeredCount: 20,
      },
    });

    expect(readyStatus.questionCount).toBe(40);
    expect(readyStatus.statusLabel).toBe("Ready for assessment");
    expect(readyStatus.progressLabel).toBe("0 of 40 generated questions completed");
    expect(recordedStatus.statusLabel).toBe("Assessment recorded");
    expect(recordedStatus.latestScore).toBe(82);
    expect(recordedStatus.progressLabel).toBe("20 of 40 generated questions captured in the latest assessment");
  });

  it("scales question counts beyond the old four-utility shortcut", () => {
    const utilityKeys = [
      "erp_gl_core_ledger",
      "ap_payables_spend",
      "ar_billing_collections",
      "expense_management",
      "tax_workflow_compliance",
    ];
    const plan = buildVendorProductAssessmentPlan(utilityKeys);
    const status = deriveProductStatus({
      utilityKeys,
      latestSubmission: null,
    });

    expect(plan.modules.filter((module) => module.kind === "utility")).toHaveLength(5);
    expect(status.utilityKeys).toHaveLength(5);
    expect(status.questionCount).toBe(120);
    expect(status.progressLabel).toBe("0 of 120 generated questions completed");
  });

  it("renders meaningful completed, new, and help panels", async () => {
    const dashboardHtml = renderToStaticMarkup(
      VendorProductAssessmentDashboard({
        activePanel: "completed",
        signedIntoVendor: true,
        createProduct: async () => {},
        products: [
          {
            id: "product-1",
            name: "Ledger Flow",
            summary: "Core finance workflow product.",
            website: null,
            utilityCount: 5,
            status: deriveProductStatus({
              utilityKeys: [
                "erp_gl_core_ledger",
                "ap_payables_spend",
                "ar_billing_collections",
                "expense_management",
                "tax_workflow_compliance",
              ],
              latestSubmission: {
                id: "submission-1",
                score: 82,
                createdAt: new Date("2026-03-31T00:00:00.000Z"),
                answeredCount: 120,
              },
            }),
          },
        ],
      })
    );
    const newHtml = renderToStaticMarkup(
      VendorProductAssessmentDashboard({
        activePanel: "new",
        signedIntoVendor: true,
        createProduct: async () => {},
        products: [],
      })
    );
    const helpHtml = renderToStaticMarkup(
      VendorProductAssessmentDashboard({
        activePanel: "help",
        signedIntoVendor: true,
        createProduct: async () => {},
        products: [],
      })
    );

    expect(dashboardHtml).toContain("Completed");
    expect(dashboardHtml).toContain("Open assessment");
    expect(dashboardHtml).toContain("Question count");
    expect(dashboardHtml).toContain("Status");
    expect(newHtml).toContain("Create a product");
    expect(newHtml).toContain("Utility declaration entry point");
    expect(newHtml).toContain("What happens next");
    expect(helpHtml).toContain("How this workspace works");
    expect(helpHtml).toContain("Why utilities matter");
  });
});
