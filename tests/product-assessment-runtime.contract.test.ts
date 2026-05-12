import { describe, expect, it } from "vitest";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
  PRODUCT_ASSESSMENT_FINAL_SCORE_VERSION,
  PRODUCT_ASSESSMENT_PAGE_SIZE,
  buildProductAssessmentDraftPayload,
  buildProductAssessmentPages,
  buildProductAssessmentResumeState,
  computeProductAssessmentMetrics,
  countRequiredProductPageAnswers,
  getProductAssessmentPlan,
} from "@/lib/productAssessmentRuntime";
import { buildVendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

describe("product assessment runtime contracts", () => {
  it("builds section-aware 10-question pages from the canonical plan", () => {
    const vendorPlan = getProductAssessmentPlan({
      perspective: "vendor",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });
    const firmPlan = getProductAssessmentPlan({
      perspective: "firm",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });

    expect(buildProductAssessmentPages(vendorPlan).map((page) => page.questionCount)).toEqual([10, 10, 10, 10]);
    expect(buildProductAssessmentPages(firmPlan).map((page) => page.questionCount)).toEqual([10, 10]);
    expect(PRODUCT_ASSESSMENT_PAGE_SIZE).toBe(10);
  });

  it("treats 0 as answered and keeps new product scores on the 0-5 scale", () => {
    const score = computeProductAssessmentMetrics({
      q1: 0,
      q2: 5,
    }).score;

    expect(score.answeredCount).toBe(2);
    expect(score.rawWeightedAvg).toBe(2.5);
    expect(score.rawScorePct).toBe(50);
    expect(score.scaleMin).toBe(PRODUCT_ASSESSMENT_SCALE_MIN);
    expect(score.scaleMax).toBe(PRODUCT_ASSESSMENT_SCALE_MAX);
  });

  it("does not silently treat unanswered product questions as 1", () => {
    const plan = getProductAssessmentPlan({
      perspective: "firm",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });
    const firstPage = buildProductAssessmentPages(plan)[0]!;

    const completion = countRequiredProductPageAnswers({
      page: firstPage,
      responses: {},
      openEndedResponses: {},
      profile: null,
    });

    expect(completion.present).toBe(0);
    expect(completion.required).toBe(10);
    expect(computeProductAssessmentMetrics({}).score.answeredCount).toBe(0);
    expect(computeProductAssessmentMetrics({}).score.rawWeightedAvg).toBeNull();
    expect(computeProductAssessmentMetrics({}).score.rawScorePct).toBe(0);
  });

  it("preserves zero-valued answers in saved draft payloads for later resume", () => {
    const plan = getProductAssessmentPlan({
      perspective: "firm",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });
    const firstTwoIds = plan.modules[0]!.questions.slice(0, 2).map((question) => question.id);
    const payload = buildProductAssessmentDraftPayload({
      perspective: "firm",
      productId: "product-1",
      registryVersion: plan.version,
      selectedUtilityKeys: ["erp_gl_core_ledger"],
      responses: {
        [firstTwoIds[0]!]: 0,
        [firstTwoIds[1]!]: 5,
      },
    });

    expect(payload.responses[firstTwoIds[0]!]).toBe(0);
    expect(payload.responses[firstTwoIds[1]!]).toBe(5);
  });

  it("drops stale draft answers and clamps the saved page when the plan shape changes", () => {
    const oldPlan = getProductAssessmentPlan({
      perspective: "firm",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });
    const oldQuestionIds = oldPlan.modules.flatMap((module) => module.questions.map((question) => question.id));

    const resumeState = buildProductAssessmentResumeState({
      perspective: "firm",
      selectedUtilityKeys: ["ap_payables_spend"],
      draftAnswers: {
        responses: {
          [oldQuestionIds[0]!]: 0,
          [oldQuestionIds[1]!]: 5,
        },
      },
      draftCurrentPage: 9,
    });

    expect(Object.keys(resumeState.responses)).toHaveLength(0);
    expect(resumeState.currentPage).toBe(2);
    expect(resumeState.staleDraft).toBe(true);
    expect(resumeState.droppedResponseIds).toHaveLength(2);
  });

  it("keeps draft resume state on the saved page when the current plan still matches", () => {
    const plan = getProductAssessmentPlan({
      perspective: "firm",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });
    const pages = buildProductAssessmentPages(plan);
    const questionIds = plan.modules.flatMap((module) => module.questions.map((question) => question.id));

    const resumeState = buildProductAssessmentResumeState({
      perspective: "firm",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
      draftAnswers: buildProductAssessmentDraftPayload({
        perspective: "firm",
        productId: "product-1",
        registryVersion: plan.version,
        selectedUtilityKeys: ["erp_gl_core_ledger"],
        responses: {
          [questionIds[0]!]: 0,
          [questionIds[1]!]: 4,
          [questionIds[10]!]: 5,
        },
      }),
      draftCurrentPage: 2,
    });

    expect(pages).toHaveLength(2);
    expect(resumeState.currentPage).toBe(2);
    expect(resumeState.responses[questionIds[0]!]).toBe(0);
    expect(resumeState.responses[questionIds[10]!]).toBe(5);
    expect(resumeState.staleDraft).toBe(false);
  });

  it("keeps final score version and 0-5 scale constants stable for product paths", () => {
    expect(PRODUCT_ASSESSMENT_FINAL_SCORE_VERSION).toBe(2);
    expect(PRODUCT_ASSESSMENT_SCALE_MIN).toBe(0);
    expect(PRODUCT_ASSESSMENT_SCALE_MAX).toBe(5);
  });

  it("keeps mixed historical product scales interpretable in product insight aggregation", () => {
    const plan = getProductAssessmentPlan({
      perspective: "firm",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });
    const firstQuestionId = plan.modules[0]!.questions[0]!.id;

    const snapshot = buildVendorProductInsightSnapshot({
      product: {
        id: "product-1",
        name: "Ledger Test",
        summary: null,
        utilityKeys: ["erp_gl_core_ledger"],
      },
      vendorSelfReported: {
        latestScore: 100,
        submittedAt: new Date("2026-03-31T00:00:00.000Z"),
        responses: {
          answers: { [firstQuestionId]: 5 },
          scaleMin: 0,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 2,
        latestSubmittedAt: new Date("2026-03-31T00:00:00.000Z"),
        responseSets: [
          {
            answers: { [firstQuestionId]: 5 },
            scaleMin: 0,
            scaleMax: 5,
          },
          {
            answers: { [firstQuestionId]: 5 },
            scaleMin: 1,
            scaleMax: 5,
          },
        ],
      },
    });

    expect(snapshot.vendorSelfReported.sectionEvidence[0]?.averageScore).toBe(100);
    expect(snapshot.firmReviewed.utilityEvidence[0]?.averageScore).toBe(100);
  });

  it("keeps vendor utility-change resumes deterministic against the new scope", () => {
    const oldPlan = getProductAssessmentPlan({
      perspective: "vendor",
      selectedUtilityKeys: ["erp_gl_core_ledger"],
    });
    const oldQuestionId = oldPlan.modules
      .find((module) => module.kind === "utility")
      ?.questions[0]?.id;

    const resumeState = buildProductAssessmentResumeState({
      perspective: "vendor",
      selectedUtilityKeys: ["ap_payables_spend"],
      draftAnswers: buildProductAssessmentDraftPayload({
        perspective: "vendor",
        productId: "product-1",
        registryVersion: oldPlan.version,
        selectedUtilityKeys: ["ap_payables_spend"],
        responses: oldQuestionId ? { [oldQuestionId]: 4 } : {},
        openEndedResponses: {},
        profile: {
          productName: "A",
          productDescription: "B",
          logoReference: "C",
          positioning: "D",
          targetCustomer: "E",
          targetUseContext: "F",
          implementationStyle: "G",
          operatingModelFit: "H",
          primaryBuyer: "I",
          integrationPosture: "J",
        },
      }),
      draftCurrentPage: 3,
    });

    expect(resumeState.selectedUtilityKeys).toEqual(["ap_payables_spend"]);
    expect(Object.keys(resumeState.responses)).toHaveLength(0);
  });
});
