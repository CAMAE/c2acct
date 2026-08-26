import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDemoProducts } from "@/data/demoPatEcosystem";
import {
  PRODUCT_GENERAL_QUESTION_COUNT,
  PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  PRODUCT_UTILITY_REGISTRY,
  PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
} from "@/lib/productUtilityRegistry";
import {
  bucketVendorProductsByAssessmentStatus,
  buildVendorProductQuestions,
  computeVendorAssessmentMetrics,
  deriveProductStatus,
  deriveVendorProductAssessmentCompletionStatus,
  deriveVendorProductOverviewStatus,
  getRequestedVendorProductAssessmentOverviewMode,
  sortVendorProductAssessmentEntries,
  VENDOR_PRODUCT_UTILITY_SELECTION_LIMIT,
} from "@/lib/vendorPat";
import { PAT_PRODUCT_NAME } from "@/lib/displayCopy";
import {
  VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE,
  VENDOR_PRODUCT_MAX_BROWSER_SESSION_QUESTIONS,
  buildVendorAdaptiveOpenEndedQuestions,
  buildVendorProductAssessmentPagePlan,
  buildVendorProductAssessmentPlan,
  getVendorProductAssessmentQuestionLoad,
  serializeVendorAdaptiveOpenEndedQuestionSnapshot,
  serializeVendorProductAssessmentPlan,
} from "@/lib/vendorProductAssessmentPlan";

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();

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

  it("proves all registry features can be selected without restoring the old four-feature cap", () => {
    const selectedUtilityKeys = PRODUCT_UTILITY_REGISTRY.map((utility) => utility.key);
    const plan = buildVendorProductAssessmentPlan(selectedUtilityKeys);
    const snapshot = serializeVendorProductAssessmentPlan(selectedUtilityKeys);
    const utilityModules = plan.modules.filter((module) => module.kind === "utility");
    const expectedScoredQuestionCount =
      PRODUCT_UTILITY_REGISTRY.length * PRODUCT_UTILITY_SCORED_QUESTION_COUNT;
    const expectedGeneratedQuestionCount =
      PRODUCT_GENERAL_QUESTION_COUNT +
      expectedScoredQuestionCount +
      PRODUCT_OPEN_ENDED_QUESTION_COUNT;

    expect(PRODUCT_UTILITY_REGISTRY.length).toBeGreaterThan(4);
    expect(VENDOR_PRODUCT_UTILITY_SELECTION_LIMIT).toBe(PRODUCT_UTILITY_REGISTRY.length);
    expect(utilityModules).toHaveLength(selectedUtilityKeys.length);
    expect(utilityModules.every((module) => module.questions.length === PRODUCT_UTILITY_SCORED_QUESTION_COUNT)).toBe(true);
    expect(buildVendorProductQuestions(selectedUtilityKeys)).toHaveLength(expectedScoredQuestionCount);
    expect(snapshot.selectedUtilityKeys).toEqual(selectedUtilityKeys);
    expect(snapshot.scoredQuestionIds).toHaveLength(expectedScoredQuestionCount);
    expect(snapshot.generatedQuestionIds).toHaveLength(expectedGeneratedQuestionCount);
    expect(expectedGeneratedQuestionCount).toBeLessThanOrEqual(VENDOR_PRODUCT_MAX_BROWSER_SESSION_QUESTIONS);
  });

  it("builds a navigable ten-question page plan for all registry features with bounded page sizes", () => {
    const selectedUtilityKeys = PRODUCT_UTILITY_REGISTRY.map((utility) => utility.key);
    const assessmentPlan = buildVendorProductAssessmentPlan(selectedUtilityKeys);
    const pagePlan = buildVendorProductAssessmentPagePlan({ assessmentPlan });
    const scorePages = pagePlan.pages.filter((page) => page.kind === "score");
    const openEndedPages = pagePlan.pages.filter((page) => page.kind === "open-ended");
    const questionLoad = getVendorProductAssessmentQuestionLoad(pagePlan);

    expect(pagePlan.pageSize).toBe(VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE);
    expect(pagePlan.pages[0]?.kind).toBe("profile");
    expect(pagePlan.pages[0]?.questionCount).toBe(PRODUCT_GENERAL_QUESTION_COUNT);
    expect(pagePlan.pages[0]?.entries.some((entry) => entry.kind === "utility-declaration")).toBe(true);
    expect(scorePages).toHaveLength(
      Math.ceil((selectedUtilityKeys.length * PRODUCT_UTILITY_SCORED_QUESTION_COUNT) / VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE)
    );
    expect(scorePages.every((page) => page.questionCount <= VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE)).toBe(true);
    expect(openEndedPages).toHaveLength(
      Math.ceil(PRODUCT_OPEN_ENDED_QUESTION_COUNT / VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE)
    );
    expect(openEndedPages.every((page) => page.questionCount <= VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE)).toBe(true);
    expect(pagePlan.pages.every((page) => page.questionCount <= VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE)).toBe(true);
    expect(questionLoad).toMatchObject({
      totalQuestionCount:
        PRODUCT_GENERAL_QUESTION_COUNT +
        PRODUCT_UTILITY_REGISTRY.length * PRODUCT_UTILITY_SCORED_QUESTION_COUNT +
        PRODUCT_OPEN_ENDED_QUESTION_COUNT,
      maxBrowserSessionQuestionCount: VENDOR_PRODUCT_MAX_BROWSER_SESSION_QUESTIONS,
      safeForBrowserSession: true,
    });
  });

  it("marks oversized generated question loads unsafe without capping feature selection", () => {
    const overloadedLoad = getVendorProductAssessmentQuestionLoad({
      profileQuestions: Array.from({
        length: PRODUCT_GENERAL_QUESTION_COUNT,
      }) as never[],
      scoredQuestions: Array.from({
        length: VENDOR_PRODUCT_MAX_BROWSER_SESSION_QUESTIONS + 1,
      }) as never[],
      openEndedQuestions: Array.from({
        length: PRODUCT_OPEN_ENDED_QUESTION_COUNT,
      }) as never[],
      pages: [],
      pageSize: VENDOR_PRODUCT_ASSESSMENT_PAGE_SIZE,
    });

    expect(VENDOR_PRODUCT_UTILITY_SELECTION_LIMIT).toBe(PRODUCT_UTILITY_REGISTRY.length);
    expect(overloadedLoad.totalQuestionCount).toBeGreaterThan(VENDOR_PRODUCT_MAX_BROWSER_SESSION_QUESTIONS);
    expect(overloadedLoad.safeForBrowserSession).toBe(false);
  });

  it("builds deterministic adaptive open-ended prompts from selected features, scored outcomes, and profile context", () => {
    const selectedUtilityKeys = ["erp_gl_core_ledger", "ap_payables_spend"];
    const basePlan = buildVendorProductAssessmentPlan(selectedUtilityKeys);
    const scoredQuestions = basePlan.modules
      .filter((module) => module.kind === "utility")
      .flatMap((module) => module.questions);
    const answers = Object.fromEntries(
      scoredQuestions.map((question) => {
        let score = question.utilityKey === "erp_gl_core_ledger" ? 4 : 2;

        if (
          question.utilityKey === "ap_payables_spend" &&
          question.section.basisKey === "integration-readiness"
        ) {
          score = 0;
        }

        if (
          question.utilityKey === "ap_payables_spend" &&
          question.section.basisKey === "adoption-ease"
        ) {
          score = 1;
        }

        return [question.id, score];
      })
    );
    const profile = {
      productName: "LedgerFlow",
      productDescription: "Grounded product description.",
      logoReference: "https://example.com/logo.png",
      positioning: "Grounded positioning",
      targetCustomer: "Controller-led finance teams",
      targetUseContext: "Month-end close and payables execution",
      implementationStyle: "Guided rollout",
      operatingModelFit: "Teams with documented close discipline",
      primaryBuyer: "Controller or VP Finance",
      integrationPosture: "ERP-connected with controlled connector depth",
    };

    const adaptiveQuestions = buildVendorAdaptiveOpenEndedQuestions({
      selectedUtilityKeys,
      profile,
      answers,
    });
    const clonedAdaptiveQuestions = buildVendorAdaptiveOpenEndedQuestions({
      selectedUtilityKeys: [...selectedUtilityKeys],
      profile: { ...profile },
      answers: { ...answers },
    });
    const adaptiveSnapshot = serializeVendorAdaptiveOpenEndedQuestionSnapshot({
      selectedUtilityKeys,
      profile,
      answers,
    });

    expect(buildVendorAdaptiveOpenEndedQuestions({ selectedUtilityKeys, profile, answers })).toEqual(adaptiveQuestions);
    expect(clonedAdaptiveQuestions).toEqual(adaptiveQuestions);
    expect(adaptiveQuestions).toHaveLength(PRODUCT_OPEN_ENDED_QUESTION_COUNT);
    expect(adaptiveQuestions.find((question) => question.key === "strongest_workflow")?.prompt).toContain(
      "ERP / GL / core ledger"
    );
    expect(adaptiveQuestions.find((question) => question.key === "weakest_workflow")?.prompt).toContain(
      "AP / payables / spend"
    );
    expect(adaptiveQuestions.find((question) => question.key === "change_management_risk")?.prompt).toContain(
      "Controller or VP Finance"
    );
    expect(adaptiveQuestions.find((question) => question.key === "integration_gap")?.prompt).toContain(
      "integration readiness scored 0/5"
    );
    expect(adaptiveQuestions.find((question) => question.key === "recommended_next_action")?.prompt).toContain(
      "narrow scope"
    );
    expect(adaptiveSnapshot.map((question) => question.prompt)).toEqual(
      adaptiveQuestions.map((question) => question.prompt)
    );
  });

  it("uses explicit insufficient-evidence fallback prompts without inventing product claims", () => {
    const selectedUtilityKeys = ["erp_gl_core_ledger", "ap_payables_spend"];
    const profile = {
      productName: "LedgerFlow",
      productDescription: "",
      logoReference: "",
      positioning: "controller close workspace",
      targetCustomer: "mid-market finance teams",
      targetUseContext: "month-end close and payables execution",
      implementationStyle: "",
      operatingModelFit: "",
      primaryBuyer: "Controller",
      integrationPosture: "",
    };

    const fallbackQuestions = buildVendorAdaptiveOpenEndedQuestions({
      selectedUtilityKeys,
      profile,
      answers: {},
    });
    const repeatedFallbackQuestions = buildVendorAdaptiveOpenEndedQuestions({
      selectedUtilityKeys: [...selectedUtilityKeys],
      profile: { ...profile },
      answers: {},
    });
    const prompts = fallbackQuestions.map((question) => question.prompt);

    expect(repeatedFallbackQuestions).toEqual(fallbackQuestions);
    expect(prompts.every((prompt) => prompt.includes("insufficient scored evidence"))).toBe(true);
    expect(prompts.join(" ")).toContain("ERP / GL / core ledger");
    expect(prompts.join(" ")).toContain("AP / payables / spend");
    expect(prompts.join(" ")).toContain("LedgerFlow");
    expect(prompts.join(" ")).toContain("controller close workspace");
    expect(prompts.join(" ")).toContain("Controller");
    expect(prompts.join(" ")).not.toMatch(/\bcurrently scores\b/i);
    expect(prompts.join(" ")).not.toMatch(/\bstrongest active feature section\b/i);
    expect(prompts.join(" ")).not.toMatch(/\bweakest active feature section\b/i);
  });

  it("shapes partial-evidence prompts around missing scored answers before recommending a next action", () => {
    const selectedUtilityKeys = ["erp_gl_core_ledger"];
    const basePlan = buildVendorProductAssessmentPlan(selectedUtilityKeys);
    const scoredQuestions = basePlan.modules
      .filter((module) => module.kind === "utility")
      .flatMap((module) => module.questions);
    const partialAnswers = Object.fromEntries(
      scoredQuestions.slice(0, 3).map((question, index) => [question.id, index + 2])
    );
    const profile = {
      productName: "LedgerFlow",
      productDescription: "Grounded product description.",
      logoReference: "https://example.com/logo.png",
      positioning: "Controller close workspace",
      targetCustomer: "Controller-led finance teams",
      targetUseContext: "Month-end close",
      implementationStyle: "Guided rollout",
      operatingModelFit: "Teams with documented close discipline",
      primaryBuyer: "Controller",
      integrationPosture: "ERP-connected",
    };

    const partialQuestions = buildVendorAdaptiveOpenEndedQuestions({
      selectedUtilityKeys,
      profile,
      answers: partialAnswers,
    });
    const evidenceNeeded = partialQuestions.find((question) => question.key === "evidence_needed_next")?.prompt;
    const nextAction = partialQuestions.find((question) => question.key === "recommended_next_action")?.prompt;

    expect(evidenceNeeded).toContain("partial scored evidence (3/20 answered)");
    expect(evidenceNeeded).toContain("which missing evidence would most improve calibration next");
    expect(nextAction).toContain("partial scored evidence (3/20 answered)");
    expect(nextAction).toContain("missing-evidence step");
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
    expect(readyStatus.statusLabel).toBe("Assessment available");
    expect(recordedStatus.statusLabel).toBe("Assessment recorded");
    expect(recordedStatus.latestScore).toBe(82);
  });

  it("only treats a vendor product assessment as firm-reviewable when the full vendor submission is complete", () => {
    const utilityKeys = ["erp_gl_core_ledger"];
    const scoredQuestions = buildVendorProductQuestions(utilityKeys);
    const plan = serializeVendorProductAssessmentPlan(utilityKeys);
    const responses = Object.fromEntries(scoredQuestions.map((question, index) => [question.id, index % 6]));
    const openEndedResponses = Object.fromEntries(plan.openEndedQuestionIds.map((questionId) => [questionId, "Grounded narrative context."]));

    const completeStatus = deriveVendorProductAssessmentCompletionStatus({
      latestSubmission: {
        id: "vendor-submission-complete",
        score: 84,
        createdAt: new Date("2026-04-06T12:00:00.000Z"),
        answeredCount: scoredQuestions.length,
        answers: {
          utilitySelection: utilityKeys,
          profile: {
            productName: "Ledger Core",
            productDescription: "Deterministic profile body.",
            logoReference: "https://example.com/logo.png",
            positioning: "Positioning",
            targetCustomer: "Target customer",
            targetUseContext: "Target use context",
            implementationStyle: "Implementation style",
            operatingModelFit: "Operating model fit",
            primaryBuyer: "Primary buyer",
            integrationPosture: "Integration posture",
          },
          responses,
          openEndedResponses,
        },
      },
    });

    const incompleteStatus = deriveVendorProductAssessmentCompletionStatus({
      latestSubmission: {
        id: "vendor-submission-incomplete",
        score: 84,
        createdAt: new Date("2026-04-06T12:30:00.000Z"),
        answeredCount: scoredQuestions.length,
        answers: {
          utilitySelection: utilityKeys,
          profile: {
            productName: "Ledger Core",
            productDescription: "",
            logoReference: "https://example.com/logo.png",
            positioning: "Positioning",
            targetCustomer: "Target customer",
            targetUseContext: "Target use context",
            implementationStyle: "Implementation style",
            operatingModelFit: "Operating model fit",
            primaryBuyer: "Primary buyer",
            integrationPosture: "Integration posture",
          },
          responses,
          openEndedResponses,
        },
      },
    });

    expect(completeStatus.completed).toBe(true);
    expect(completeStatus.statusLabel).toBe("Firm review available");
    expect(completeStatus.utilityKeys).toEqual(utilityKeys);
    expect(completeStatus.scoredQuestionCount).toBe(scoredQuestions.length);
    expect(incompleteStatus.completed).toBe(false);
    expect(incompleteStatus.statusLabel).toBe("Vendor assessment incomplete");
  });

  it("proves empty, partial, and fully completed vendor product submissions cannot drift into the wrong readiness state", () => {
    const demoProduct = getDemoProducts()[0]?.product;
    expect(demoProduct).toBeTruthy();
    const utilityKeys = demoProduct!.utilityKeys.slice(0, 3);
    const scoredQuestions = buildVendorProductQuestions(utilityKeys);
    const plan = serializeVendorProductAssessmentPlan(utilityKeys);
    const completeResponses = Object.fromEntries(scoredQuestions.map((question, index) => [question.id, index % 6]));
    const completeOpenEndedResponses = Object.fromEntries(
      plan.openEndedQuestionIds.map((questionId) => [questionId, "Grounded demo narrative evidence."])
    );
    const completeProfile = {
      productName: demoProduct!.name,
      productDescription: demoProduct!.summary,
      logoReference: "https://example.com/logo.png",
      positioning: demoProduct!.profile.positioning,
      targetCustomer: demoProduct!.profile.targetCustomer,
      targetUseContext: demoProduct!.profile.targetUseContext,
      implementationStyle: demoProduct!.profile.implementationStyle,
      operatingModelFit: demoProduct!.profile.operatingModelFit,
      primaryBuyer: demoProduct!.profile.primaryBuyer,
      integrationPosture: demoProduct!.profile.integrationPosture,
    };

    const emptyStatus = deriveVendorProductAssessmentCompletionStatus({
      latestSubmission: null,
    });
    const partialStatus = deriveVendorProductAssessmentCompletionStatus({
      latestSubmission: {
        id: "vendor-submission-partial",
        score: 81,
        createdAt: new Date("2026-04-26T12:00:00.000Z"),
        answeredCount: scoredQuestions.length - 1,
        answers: {
          utilitySelection: utilityKeys,
          profile: completeProfile,
          responses: Object.fromEntries(scoredQuestions.slice(0, -1).map((question, index) => [question.id, index % 6])),
          openEndedResponses: completeOpenEndedResponses,
        },
      },
    });
    const completeStatus = deriveVendorProductAssessmentCompletionStatus({
      latestSubmission: {
        id: "vendor-submission-complete",
        score: 84,
        createdAt: new Date("2026-04-26T12:30:00.000Z"),
        answeredCount: scoredQuestions.length,
        answers: {
          utilitySelection: utilityKeys,
          profile: completeProfile,
          responses: completeResponses,
          openEndedResponses: completeOpenEndedResponses,
        },
      },
    });

    expect(plan.generatedQuestionIds.length).toBeGreaterThan(scoredQuestions.length);
    expect(emptyStatus).toMatchObject({
      completed: false,
      statusLabel: "Awaiting vendor assessment",
    });
    expect(partialStatus).toMatchObject({
      completed: false,
      statusLabel: "Vendor assessment incomplete",
    });
    expect(completeStatus).toMatchObject({
      completed: true,
      statusLabel: "Firm review available",
      utilityKeys,
      scoredQuestionCount: scoredQuestions.length,
    });
  });

  it("maps assessment overview modes to the four stable top-card toggle states", () => {
    expect(getRequestedVendorProductAssessmentOverviewMode(undefined)).toBe("existing");
    expect(getRequestedVendorProductAssessmentOverviewMode("completed")).toBe("completed");
    expect(getRequestedVendorProductAssessmentOverviewMode("existing")).toBe("existing");
    expect(getRequestedVendorProductAssessmentOverviewMode("add-new")).toBe("add-new");
    expect(getRequestedVendorProductAssessmentOverviewMode("help")).toBe("help");
    expect(getRequestedVendorProductAssessmentOverviewMode("unknown")).toBe("existing");
  });

  it("sorts long vendor product assessment lists deterministically across completed and existing states", () => {
    const completedNewer = {
      product: { id: "product-c", name: "Ledger 10" },
      status: {
        completed: true,
        latestSubmittedAt: new Date("2026-05-02T14:00:00.000Z"),
      },
    };
    const completedOlder = {
      product: { id: "product-a", name: "Ledger 2" },
      status: {
        completed: true,
        latestSubmittedAt: new Date("2026-05-01T14:00:00.000Z"),
      },
    };
    const existingAlpha = {
      product: { id: "product-b", name: "Alpha Product" },
      status: {
        completed: false,
        latestSubmittedAt: null,
      },
    };
    const existingDuplicateName = {
      product: { id: "product-d", name: "alpha product" },
      status: {
        completed: false,
        latestSubmittedAt: null,
      },
    };

    const sorted = sortVendorProductAssessmentEntries([
      existingDuplicateName,
      completedOlder,
      existingAlpha,
      completedNewer,
    ]);

    expect(sorted.map((entry) => entry.product.id)).toEqual([
      "product-c",
      "product-a",
      "product-b",
      "product-d",
    ]);
    expect(bucketVendorProductsByAssessmentStatus(sorted).completed.map((entry) => entry.product.id)).toEqual([
      "product-c",
      "product-a",
    ]);
    expect(bucketVendorProductsByAssessmentStatus(sorted).existing.map((entry) => entry.product.id)).toEqual([
      "product-b",
      "product-d",
    ]);
  });

  it("exports the PAT product brand string used on vendor product assessment top cards", () => {
    expect(PAT_PRODUCT_NAME).toBe("PAT | Performance Alignment Technology");
  });

  it("keeps incomplete recorded products out of the completed bucket", () => {
    const utilityKeys = ["erp_gl_core_ledger"];
    const scoredQuestions = buildVendorProductQuestions(utilityKeys);
    const plan = serializeVendorProductAssessmentPlan(utilityKeys);
    const responses = Object.fromEntries(scoredQuestions.map((question, index) => [question.id, index % 6]));
    const openEndedResponses = Object.fromEntries(
      plan.openEndedQuestionIds.map((questionId) => [questionId, "Grounded narrative context."])
    );

    const completed = deriveVendorProductOverviewStatus({
      signalUtilityKeys: [],
      latestSubmission: {
        id: "complete",
        score: 84,
        createdAt: new Date("2026-04-06T12:00:00.000Z"),
        answeredCount: scoredQuestions.length,
        answers: {
          utilitySelection: utilityKeys,
          profile: {
            productName: "Ledger Core",
            productDescription: "Deterministic profile body.",
            logoReference: "https://example.com/logo.png",
            positioning: "Positioning",
            targetCustomer: "Target customer",
            targetUseContext: "Target use context",
            implementationStyle: "Implementation style",
            operatingModelFit: "Operating model fit",
            primaryBuyer: "Primary buyer",
            integrationPosture: "Integration posture",
          },
          responses,
          openEndedResponses,
        },
      },
    });

    const incomplete = deriveVendorProductOverviewStatus({
      signalUtilityKeys: utilityKeys,
      latestSubmission: {
        id: "incomplete",
        score: 60,
        createdAt: new Date("2026-04-06T12:30:00.000Z"),
        answeredCount: scoredQuestions.length,
        answers: {
          utilitySelection: utilityKeys,
          profile: {
            productName: "Ledger Core",
            productDescription: "",
            logoReference: "https://example.com/logo.png",
            positioning: "Positioning",
            targetCustomer: "Target customer",
            targetUseContext: "Target use context",
            implementationStyle: "Implementation style",
            operatingModelFit: "Operating model fit",
            primaryBuyer: "Primary buyer",
            integrationPosture: "Integration posture",
          },
          responses,
          openEndedResponses,
        },
      },
    });

    const awaitingStart = deriveVendorProductOverviewStatus({
      signalUtilityKeys: [],
      latestSubmission: null,
    });

    const readyWithoutFinalSubmission = deriveVendorProductOverviewStatus({
      signalUtilityKeys: utilityKeys,
      latestSubmission: null,
    });

    expect(completed.completed).toBe(true);
    expect(completed.statusLabel).toBe("Firm review available");
    expect(incomplete.completed).toBe(false);
    expect(incomplete.statusLabel).toBe("Vendor assessment incomplete");
    expect(awaitingStart.statusLabel).toBe("Needs utility declaration");
    expect(readyWithoutFinalSubmission.statusLabel).toBe("Assessment available");

    const buckets = bucketVendorProductsByAssessmentStatus([
      { id: "completed", status: completed },
      { id: "incomplete", status: incomplete },
      { id: "awaiting", status: awaitingStart },
      { id: "ready", status: readyWithoutFinalSubmission },
    ]);

    expect(buckets.completed.map((entry) => entry.id)).toEqual(["completed"]);
    expect(buckets.existing.map((entry) => entry.id)).toEqual(["incomplete", "awaiting", "ready"]);
  });

  it("treats 0 as a valid scored answer in vendor product metrics", () => {
    const utilityKeys = ["erp_gl_core_ledger"];
    const scoredQuestions = buildVendorProductQuestions(utilityKeys);
    const answers = Object.fromEntries(scoredQuestions.map((question, index) => [question.id, index % 6]));

    const metrics = computeVendorAssessmentMetrics(answers);

    expect(metrics.score.scaleMin).toBe(0);
    expect(metrics.score.scaleMax).toBe(5);
    expect(metrics.score.answeredCount).toBe(scoredQuestions.length);
    expect(metrics.integrity.meta.numericAnswered).toBe(scoredQuestions.length);
  });

  it("keeps vendor product assessment routes free of legacy ready and directional language", () => {
    const overviewText = readFileSync(
      path.join(ROOT, "app/(app)/vendor/product-assessment/page.tsx"),
      "utf8"
    );
    const detailText = readFileSync(
      path.join(ROOT, "app/(app)/vendor/product-assessment/[productId]/page.tsx"),
      "utf8"
    );

    for (const text of [overviewText, detailText]) {
      expect(text).not.toContain("Ready for assessment");
      expect(text).not.toContain("Ready for firm review");
      expect(text).not.toContain("residual directional");
      expect(text).not.toMatch(/\b[Dd]irectional\b/);
      expect(text).not.toContain("Confidence and caveats");
    }

    expect(overviewText).toContain("Completed vendor product assessments");
    expect(overviewText).toContain("Existing products still in progress");
    expect(overviewText).toContain("How to use vendor product assessment");
    expect(overviewText).toContain("No products exist yet. Use Add New to create an inventory record");
    expect(overviewText).toContain("does not declare features, create a final submission, or count as a completed product assessment");
    expect(overviewText).toContain("redirect(`/vendor/product-assessment/${product.id}`)");
    expect(overviewText).toContain("sortVendorProductAssessmentEntries(productEntries)");
    expect(overviewText).toContain("mode=add-new");
  });

  it("keeps the vendor product assessment overview clickable, clean, and mode-scoped", () => {
    const source = readFileSync(path.join(ROOT, "app/(app)/vendor/product-assessment/page.tsx"), "utf8");

    expect(source).toContain("PatModeToggle");
    expect(source).toContain('key: "completed"');
    expect(source).toContain('key: "existing"');
    expect(source).toContain('key: "add-new"');
    expect(source).toContain('key: "help"');
    expect(source).toContain("buckets.completed.map");
    expect(source).toContain("buckets.existing.map");
    expect(source).not.toContain("entry.status.statusLabel");
    expect(source).not.toContain("rounded-full bg-[var(--shell-accent)]/10");
    // 13i modern card language: chips + ScoreLockup/ScoreBar, NOT the old
    // "label: value" text-list rows. The same facts are still surfaced (vendor,
    // feature scope, feature summary, latest score) — just in the current grammar.
    expect(source).not.toContain("Vendor context:");
    expect(source).not.toContain("Feature scope:");
    expect(source).not.toContain("Feature summary:");
    expect(source).toContain("ScoreLockup");
    expect(source).toContain("ScoreBar");
    expect(source).toContain("CardChip");
    expect(source).toContain("entry.product.vendorName");
    expect(source).toContain("formatFeatureCountLabel(entry.status.utilityKeys.length)");
    expect(source).toContain("featureSummary");
  });

  it("starts a newly added vendor product assessment directly and stores only actual product URLs", () => {
    const source = readFileSync(path.join(ROOT, "app/(app)/vendor/product-assessment/page.tsx"), "utf8");

    expect(source).toContain("function getActualProductUrl");
    expect(source).toContain('parsed.protocol === "https:" || parsed.protocol === "http:"');
    expect(source).toContain("website: getActualProductUrl(website)");
    expect(source).toContain("redirect(`/vendor/product-assessment/${product.id}`)");
  });

  it("documents and source-proves the Phase 2 vendor product assessment QA checklist", () => {
    const proofText = readFileSync(
      path.join(ROOT, "docs/pilot/vendor-product-assessment-phase2-proof.md"),
      "utf8"
    );
    const overviewText = readFileSync(
      path.join(ROOT, "app/(app)/vendor/product-assessment/page.tsx"),
      "utf8"
    );
    const detailText = readFileSync(
      path.join(ROOT, "app/(app)/vendor/product-assessment/[productId]/page.tsx"),
      "utf8"
    );
    const clientText = readFileSync(
      path.join(ROOT, "app/components/vendor/VendorProductAssessmentClient.tsx"),
      "utf8"
    );
    const submitRouteText = readFileSync(
      path.join(ROOT, "app/api/vendor/product-assessment/submit/route.ts"),
      "utf8"
    );

    for (const required of [
      "Completed mode",
      "Existing mode",
      "Add New mode",
      "Help mode",
      "Product create",
      "Product select",
      "Resume behavior",
      "Submit behavior",
      "Feature declaration",
      "Profile questions",
      "Scored questions",
      "Open-ended questions",
      "Pagination",
      "Top-scroll",
      "Submit gating",
    ]) {
      expect(proofText).toContain(required);
    }

    expect(overviewText).toContain('mode=${mode}');
    expect(overviewText).toContain('activeMode === "completed"');
    expect(overviewText).toContain('activeMode === "existing"');
    expect(overviewText).toContain('activeMode === "add-new"');
    expect(overviewText).toContain("async function createProduct");
    expect(detailText).toContain("persistedAnswerPayload");
    expect(detailText).toContain("ProductAssessmentPlan");
    expect(clientText).toContain("topCardRef.current?.scrollIntoView");
    expect(clientText).toContain("continueToNextPage");
    expect(clientText).toContain("canSubmitAssessment");
    expect(clientText).toContain('disabled={submitState === "submitting" || !canSubmitAssessment}');
    expect(submitRouteText).toContain("Complete every active question before submitting.");
    expect(submitRouteText).toContain("Complete every open-ended question before submitting.");
  });
});
