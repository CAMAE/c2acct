import { ModuleScope, QuestionInputType, type UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { buildIntegrationEnvelope } from "@/lib/integrations/c2acct";
import {
  PRODUCT_ASSESSMENT_SCALE_MAX,
  PRODUCT_ASSESSMENT_SCALE_MIN,
} from "@/lib/productAssessmentRuntime";
import { computeScore } from "@/lib/scoring";
import { getSurveyDraftWhere, getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { TIER1_ALIGNMENT_BADGE_ID, TIER1_ALIGNMENT_BADGE_NAME } from "@/lib/patUnlocks";
import { getFirmScopedVendors } from "@/lib/tenancy";
import {
  FIRM_CAPABILITY_DEFINITIONS,
  FIRM_TIER1_INSIGHT_CAPABILITY_RULES,
  getFirmModuleCapabilityKeys,
  getFirmQuestionCapabilityKeys,
} from "@/lib/firmCapabilities";
import {
  deriveVendorProductAssessmentCompletionStatus,
  type VendorAssessmentQuestion,
  VENDOR_PRODUCT_MODULE_KEY,
  VENDOR_PRODUCT_TIER2_HOVER,
  ensureProductSubject,
} from "@/lib/vendorPat";
import { buildProductAssessmentPlan } from "@/lib/vendorProductQuestionBank";
import { insightContent } from "@/lib/insightContent";

export const FIRM_MODULE_DEFINITIONS = [
  {
    key: "firm_alignment_operating_model_v1",
    badgeId: "firm-module-operating-model",
    title: "Operating Model and Workflow Discipline",
    // 15a: short pillar badge — the ONE canonical axis/badge label. Full title
    // stays in evidence prose + module cards.
    pillarName: "Operations",
    description: "How clearly the firm defines, runs, and measures the operating model.",
    summary: "Workflow discipline, review rigor, handoffs, and operating clarity.",
    sectionKey: "operating-model",
  },
  {
    key: "firm_alignment_automation_ai_v1",
    badgeId: "firm-module-automation-ai",
    title: "Automation and AI Readiness",
    pillarName: "Automation",
    description: "How ready the firm is to use automation and AI responsibly in live delivery.",
    summary: "Automation posture, augmentation readiness, and practical AI governance.",
    sectionKey: "automation-ai",
  },
  {
    key: "firm_alignment_data_flow_v1",
    badgeId: "firm-module-data-flow",
    title: "Integration and Data Flow Maturity",
    pillarName: "Integration",
    description: "How well systems, data, and operational handoffs connect across the firm.",
    summary: "System linkage, data confidence, and cross-tool operating continuity.",
    sectionKey: "data-flow",
  },
  {
    key: "firm_alignment_governance_v1",
    badgeId: "firm-module-governance",
    title: "Governance, Controls, and Vendor Risk",
    pillarName: "Governance",
    description: "How clearly the firm governs risk, controls, and third-party product exposure.",
    summary: "Control posture, risk discipline, and vendor oversight.",
    sectionKey: "governance",
  },
  {
    key: "firm_alignment_strategy_v1",
    badgeId: "firm-module-strategy",
    title: "Strategy, Change Readiness, and Market Alignment",
    pillarName: "Strategy",
    description: "How well the firm can adapt, prioritize, and align to current market pressure.",
    summary: "Strategy execution, change readiness, and external alignment.",
    sectionKey: "strategy",
  },
] as const;

// 15a — pillar constants + resolver live in the PURE lib/firmPillars module so
// radar client components can import them without pulling prisma. Re-exported here
// for server callers.
export { FIRM_PILLARS, pillarForModule, type FirmPillar } from "@/lib/firmPillars";

export const FIRM_MODULE_QUESTION_STEMS = [
  "How clearly is the current-state approach defined in this area?",
  "How consistently is this area executed across the firm?",
  "How visible is current performance in this area to leadership?",
  "How disciplined are review and escalation practices in this area?",
  "How well do cross-functional handoffs work in this area?",
  "How manageable is day-to-day operational friction in this area?",
  "How ready is this area for repeatable automation support?",
  "How ready is this area for responsible AI-assisted work?",
  "How strong is data reliability for this area today?",
  "How well do current systems connect around this area?",
  "How much confidence do teams have in current controls here?",
  "How resilient is this area under deadline or volume pressure?",
  "How strong is change adoption in this area?",
  "How clearly are ownership and accountability defined here?",
  "How strong is vendor or tool oversight for this area?",
  "How clearly is measurable value understood here?",
  "How well is risk surfaced before it becomes operational drag?",
  "How aligned is this area with current firm strategy?",
  "How well can this area adapt to market or client change?",
  "How ready is this area for the next stage of PAT insight depth?",
] as const;

export const FIRM_MODULE_OPEN_ENDED_QUESTION_COUNT = 5;

type FirmOpenEndedPromptDefinition = {
  keySuffix: string;
  prompt: string;
  placeholder: string;
};

const FIRM_MODULE_OPEN_ENDED_PROMPTS: Record<
  (typeof FIRM_MODULE_DEFINITIONS)[number]["sectionKey"],
  readonly FirmOpenEndedPromptDefinition[]
> = {
  "operating-model": [
    {
      keySuffix: "workflow_bottleneck",
      prompt: "What is the biggest workflow bottleneck currently slowing execution in this area, and where does it show up most often?",
      placeholder: "Describe the workflow, teams involved, and the current drag it creates.",
    },
    {
      keySuffix: "ownership_gap",
      prompt: "Where is ownership or accountability still unclear in this area, and what breakdown does that create in practice?",
      placeholder: "Name the handoff, decision point, or recurring confusion PAT should understand.",
    },
    {
      keySuffix: "review_metric",
      prompt: "What review cadence, metric, or visibility signal would most improve operating discipline here over the next 90 days?",
      placeholder: "Focus on the one measurement or review change that would matter most.",
    },
    {
      keySuffix: "handoff_rework",
      prompt: "Which handoff currently creates the most rework, and what tends to go wrong at that point?",
      placeholder: "Use a concrete example of where rework or escalation appears.",
    },
    {
      keySuffix: "support_needed",
      prompt: "What vendor, tool, or operating support would help improve workflow discipline here without creating more disruption?",
      placeholder: "Explain the support needed and the condition it should improve.",
    },
  ],
  "automation-ai": [
    {
      keySuffix: "automation_candidate",
      prompt: "Which process is most ready for automation or AI support today, and what is still blocking safe rollout?",
      placeholder: "Describe the process, the expected value, and the current blocker.",
    },
    {
      keySuffix: "guardrails_needed",
      prompt: "Where would AI-assisted work create the most value in this area, and what guardrails would need to be in place first?",
      placeholder: "Be specific about the use case and the control requirement.",
    },
    {
      keySuffix: "data_prerequisite",
      prompt: "What data, workflow, or systems prerequisite is still missing for repeatable automation in this area?",
      placeholder: "Name the missing prerequisite PAT should treat as the gating dependency.",
    },
    {
      keySuffix: "change_barrier",
      prompt: "What team, skill, or change-management barrier is most likely to slow adoption of automation here?",
      placeholder: "Explain the barrier and how it shows up in current operations.",
    },
    {
      keySuffix: "proof_required",
      prompt: "What proof would leadership need before expanding automation or AI usage in this area more broadly?",
      placeholder: "Describe the evidence, threshold, or result leadership would need to see.",
    },
  ],
  "data-flow": [
    {
      keySuffix: "handoff_failure",
      prompt: "Which system or process handoff currently creates the biggest data delay or data-quality failure in this area?",
      placeholder: "Identify the handoff and explain what breaks or slows down.",
    },
    {
      keySuffix: "trust_gap",
      prompt: "Where does confidence in data quality or reporting break down most often today?",
      placeholder: "Describe the source of the trust gap and the operational consequence.",
    },
    {
      keySuffix: "integration_dependency",
      prompt: "What integration dependency is most likely to threaten implementation or reporting continuity here?",
      placeholder: "Name the dependency and the risk it creates.",
    },
    {
      keySuffix: "visibility_gap",
      prompt: "What visibility or reporting gap most limits operational control in this area right now?",
      placeholder: "Explain what leaders or teams still cannot see clearly enough.",
    },
    {
      keySuffix: "continuity_improvement",
      prompt: "What one change would most improve continuity across tools, teams, or data flows in this area?",
      placeholder: "Focus on the single improvement with the highest current-state payoff.",
    },
  ],
  governance: [
    {
      keySuffix: "control_drag",
      prompt: "Which control, approval, or review step currently slows work here with the least operational value returned?",
      placeholder: "Describe the step, why it feels heavy, and what it protects today.",
    },
    {
      keySuffix: "vendor_risk_gap",
      prompt: "What vendor-risk or control evidence is still hardest to obtain or maintain in this area?",
      placeholder: "Be specific about the evidence gap PAT should understand.",
    },
    {
      keySuffix: "decision_ownership",
      prompt: "Where is governance decision ownership still unclear, and what risk does that create?",
      placeholder: "Name the decision area and the consequence of the current ambiguity.",
    },
    {
      keySuffix: "resilience_concern",
      prompt: "What resilience, incident, or failure scenario concerns leadership most in this area right now?",
      placeholder: "Describe the scenario and why it matters operationally.",
    },
    {
      keySuffix: "trust_requirement",
      prompt: "What would most improve trust in a new vendor, tool, or control approach touching this area?",
      placeholder: "Explain the evidence, behavior, or safeguard that would matter most.",
    },
  ],
  strategy: [
    {
      keySuffix: "execution_gap",
      prompt: "Which strategic priority is hardest to translate into day-to-day execution in this area, and why?",
      placeholder: "Describe the priority and where execution breaks down.",
    },
    {
      keySuffix: "change_drag",
      prompt: "Where do change efforts lose traction most often in this area today?",
      placeholder: "Name the point in the change cycle where momentum usually drops.",
    },
    {
      keySuffix: "market_pressure",
      prompt: "What market, client, or competitive pressure is forcing the biggest reprioritization in this area right now?",
      placeholder: "Explain the pressure and how it is changing current decisions.",
    },
    {
      keySuffix: "roadmap_risk",
      prompt: "What risk is most likely to cause the current roadmap or change plan in this area to miss expectations?",
      placeholder: "Focus on the risk with the highest near-term consequence.",
    },
    {
      keySuffix: "readiness_signal",
      prompt: "What signal would tell you this area is ready for deeper PAT insight use, broader change, or faster execution?",
      placeholder: "Describe the concrete signal or condition you would look for.",
    },
  ],
};

// Keep firm follow-up wording fixed and module-specific until PAT can derive prompt text
// from real completed module evidence at runtime. The current repo does not claim adaptive
// open-ended wording for firm modules yet.
export function buildFirmModuleOpenEndedPrompts(
  moduleDefinition: (typeof FIRM_MODULE_DEFINITIONS)[number]
) {
  return FIRM_MODULE_OPEN_ENDED_PROMPTS[moduleDefinition.sectionKey];
}

const FIRM_MODULE_SECTIONS = [
  {
    keySuffix: "operating-baseline",
    title: "Operating baseline and visibility",
    description: "Current-state definition, consistency, visibility, review, and handoff evidence.",
    startIndex: 0,
    endIndex: 4,
  },
  {
    keySuffix: "execution-friction",
    title: "Execution friction and automation readiness",
    description: "Operational friction, automation readiness, AI readiness, data reliability, and system linkage.",
    startIndex: 5,
    endIndex: 9,
  },
  {
    keySuffix: "controls-resilience",
    title: "Controls, resilience, and ownership",
    description: "Controls confidence, resilience under pressure, change adoption, ownership, and vendor oversight.",
    startIndex: 10,
    endIndex: 14,
  },
  {
    keySuffix: "value-change",
    title: "Value, risk, and change alignment",
    description: "Value clarity, risk surfacing, strategic alignment, adaptability, and next-stage readiness.",
    startIndex: 15,
    endIndex: 19,
  },
] as const;

export const FIRM_TIER1_INSIGHT_DEFINITIONS = insightContent.firm
  .filter((item) => item.tier === 1)
  .map((item) => ({
    key: item.key,
    title: item.title,
    body: item.summary,
  })) as ReadonlyArray<{ key: string; title: string; body: string }>;

export const FIRM_TIER2_INSIGHT_DEFINITIONS = insightContent.firm
  .filter((item) => item.tier === 2)
  .map((item) => ({
    key: item.key,
    title: item.title,
    description: item.summary,
  })) as ReadonlyArray<{ key: string; title: string; description: string }>;

export const FIRM_ALIGNMENT_INSIGHT_HELP = [
  ...insightContent.firm
    .filter((item) => item.tier === 1)
    .map((item) => ({
      key: item.key,
      what: item.what,
      how: item.how,
    })),
] as const;

export type FirmModuleProgress = {
  key: string;
  badgeId: string;
  title: string;
  description: string;
  summary: string;
  href: string;
  questionCount: number;
  completedCount: number;
  draftAnsweredCount: number;
  status: FirmModuleProgressStatus;
  statusLabel: string;
  statusDescription: string;
  latestScore: number | null;
  latestSubmittedAt: Date | null;
  draftUpdatedAt: Date | null;
};

export type FirmModuleProgressStatus = "not-started" | "in-progress" | "completed";

export type FirmAlignmentProgressSummary = {
  totalModules: number;
  completedModules: number;
  inProgressModules: number;
  notStartedModules: number;
  answeredQuestions: number;
  totalQuestions: number;
  completionPercent: number;
  nextModule: FirmModuleProgress | null;
  /** 15e — all five modules submitted (a "full assessment" on record). */
  fullyAssessed: boolean;
  /** 15e — when the assessment last became complete: the newest module
   *  submission once every module is in. Null until the firm is fully assessed. */
  lastFullAssessmentAt: Date | null;
};

export function getFirmModuleProgressStatus(input: {
  questionCount: number;
  latestSubmittedAt: Date | null;
  draftAnsweredCount: number;
}) {
  if (input.latestSubmittedAt) {
    return {
      status: "completed" as const,
      statusLabel: "Completed",
      statusDescription: "Final submission recorded. This module now contributes to firm insights and unlock checks.",
      completedCount: input.questionCount,
    };
  }

  if (input.draftAnsweredCount > 0) {
    return {
      status: "in-progress" as const,
      statusLabel: "In Progress",
      statusDescription: "Draft answers are saved. Resume this module before starting another one if continuity matters.",
      completedCount: Math.min(input.draftAnsweredCount, input.questionCount),
    };
  }

  return {
    status: "not-started" as const,
    statusLabel: "Not Started",
    statusDescription: "No saved answers yet. Start here when this operating area is the best next focus.",
    completedCount: 0,
  };
}

export function summarizeFirmAlignmentProgress(
  modules: readonly FirmModuleProgress[]
): FirmAlignmentProgressSummary {
  const totalModules = FIRM_MODULE_DEFINITIONS.length;
  const completedModules = modules.filter((module) => module.status === "completed").length;
  const inProgressModules = modules.filter((module) => module.status === "in-progress").length;
  const notStartedModules = modules.filter((module) => module.status === "not-started").length;
  const totalQuestions = modules.reduce((sum, module) => sum + module.questionCount, 0);
  const answeredQuestions = modules.reduce((sum, module) => sum + module.completedCount, 0);
  const completionPercent = totalQuestions === 0 ? 0 : Math.round((answeredQuestions / totalQuestions) * 100);
  const nextModule =
    modules.find((module) => module.status === "in-progress") ??
    modules.find((module) => module.status === "not-started") ??
    null;

  const fullyAssessed = totalModules > 0 && completedModules === totalModules;
  const lastFullAssessmentAt = fullyAssessed
    ? modules.reduce<Date | null>(
        (latest, module) =>
          module.latestSubmittedAt && (latest === null || module.latestSubmittedAt > latest)
            ? module.latestSubmittedAt
            : latest,
        null
      )
    : null;

  return {
    totalModules,
    completedModules,
    inProgressModules,
    notStartedModules,
    answeredQuestions,
    totalQuestions,
    completionPercent,
    nextModule,
    fullyAssessed,
    lastFullAssessmentAt,
  };
}

export type FirmProductCatalogItem = {
  id: string;
  name: string;
  vendorName: string;
  summary: string | null;
  utilityKeys: string[];
  questionCount: number;
  reviewAvailable: boolean;
  reviewStatusLabel: string;
  reviewStatusReason: string;
  vendorAssessmentCompletedAt: Date | null;
  firmReviewStatus: FirmProductReviewStatus;
  firmReviewStatusLabel: string;
  firmReviewStatusReason: string;
  firmReviewDraftAnsweredCount: number;
  firmReviewDraftUpdatedAt: Date | null;
  latestFirmReviewSubmittedAt: Date | null;
};

export type FirmProductReviewStatus = "blocked" | "available" | "in-progress" | "completed";

export function deriveFirmProductReviewStatus(input: {
  reviewAvailable: boolean;
  questionCount: number;
  latestFirmReviewSubmittedAt: Date | null;
  draftAnsweredCount: number;
}) {
  if (!input.reviewAvailable) {
    return {
      status: "blocked" as const,
      label: "Vendor dependency",
      reason: "Firm review opens only after the vendor completes the full product assessment.",
    };
  }

  if (input.latestFirmReviewSubmittedAt) {
    return {
      status: "completed" as const,
      label: "Completed",
      reason: "Your firm has submitted a final review for this product. You can submit another review if the current operating evidence changes.",
    };
  }

  if (input.draftAnsweredCount > 0) {
    return {
      status: "in-progress" as const,
      label: "In Progress",
      reason: `Your firm has ${Math.min(input.draftAnsweredCount, input.questionCount)} of ${input.questionCount} product questions saved in draft.`,
    };
  }

  return {
    status: "available" as const,
    label: "Available",
    reason: "The vendor assessment is complete, so your firm can add current product-fit evidence.",
  };
}

export const FIRM_PRODUCT_MODULE_KEY = "firm_product_review_v1";
export const FIRM_PRODUCT_MODULE_TITLE = "Firm Product Assessment";

export async function ensureFirmAlignmentSystem() {
  const now = new Date();
  const ensuredModules: Array<{ id: string; key: string; title: string }> = [];
  const capabilityNodeIdByKey = new Map<string, string>();

  for (const capability of FIRM_CAPABILITY_DEFINITIONS) {
    const node = await prisma.capabilityNode.upsert({
      where: { key: capability.key },
      update: {
        title: capability.title,
        description: capability.description,
        scope: capability.scope,
        level: capability.level,
        weight: capability.weight,
        active: true,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: capability.key,
        title: capability.title,
        description: capability.description,
        scope: capability.scope,
        level: capability.level,
        weight: capability.weight,
        active: true,
        updatedAt: now,
      },
      select: { id: true, key: true },
    });

    capabilityNodeIdByKey.set(node.key, node.id);
  }

  const aggregateBadge = await prisma.badge.upsert({
    where: { id: TIER1_ALIGNMENT_BADGE_ID },
    update: {
      name: TIER1_ALIGNMENT_BADGE_NAME,
      updatedAt: now,
    },
    create: {
      id: TIER1_ALIGNMENT_BADGE_ID,
      name: TIER1_ALIGNMENT_BADGE_NAME,
      updatedAt: now,
    },
  });

  for (const moduleDefinition of FIRM_MODULE_DEFINITIONS) {
    const moduleRecord = await prisma.surveyModule.upsert({
      where: { key: moduleDefinition.key },
      update: {
        title: moduleDefinition.title,
        pillarName: moduleDefinition.pillarName,
        description: moduleDefinition.description,
        scope: ModuleScope.FIRM,
        active: true,
        version: 1,
        weight: 1,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: moduleDefinition.key,
        title: moduleDefinition.title,
        pillarName: moduleDefinition.pillarName,
        description: moduleDefinition.description,
        scope: ModuleScope.FIRM,
        active: true,
        version: 1,
        weight: 1,
        updatedAt: now,
      },
      select: { id: true, key: true, title: true, pillarName: true },
    });

    ensuredModules.push(moduleRecord);

    const persistedSections = await Promise.all(
      FIRM_MODULE_SECTIONS.map((section, sectionIndex) =>
        prisma.surveySection.upsert({
          where: {
            moduleId_key: {
              moduleId: moduleRecord.id,
              key: `${moduleDefinition.sectionKey}-${section.keySuffix}`,
            },
          },
          update: {
            title: `${moduleDefinition.title}: ${section.title}`,
            description: section.description,
            order: sectionIndex + 1,
            updatedAt: now,
          },
          create: {
            id: randomUUID(),
            moduleId: moduleRecord.id,
            key: `${moduleDefinition.sectionKey}-${section.keySuffix}`,
            title: `${moduleDefinition.title}: ${section.title}`,
            description: section.description,
            order: sectionIndex + 1,
            updatedAt: now,
          },
          select: {
            id: true,
            key: true,
            title: true,
            description: true,
            order: true,
          },
        })
      )
    );

    await prisma.surveySection.deleteMany({
      where: {
        moduleId: moduleRecord.id,
        key: {
          notIn: persistedSections.map((section) => section.key),
        },
      },
    });

    const moduleCapabilityNodeIds = getFirmModuleCapabilityKeys(moduleDefinition.sectionKey).map((key) => {
      const nodeId = capabilityNodeIdByKey.get(key);
      if (!nodeId) {
        throw new Error(`Missing capability node for module mapping: ${key}`);
      }
      return nodeId;
    });

    for (const nodeId of moduleCapabilityNodeIds) {
      await prisma.moduleCapability.upsert({
        where: {
          moduleId_nodeId: {
            moduleId: moduleRecord.id,
            nodeId,
          },
        },
        update: { weight: 1 },
        create: {
          id: randomUUID(),
          moduleId: moduleRecord.id,
          nodeId,
          weight: 1,
        },
      });
    }

    await prisma.moduleCapability.deleteMany({
      where: {
        moduleId: moduleRecord.id,
        nodeId: { notIn: moduleCapabilityNodeIds },
      },
    });

    const moduleBadge = await prisma.badge.upsert({
      where: { id: moduleDefinition.badgeId },
      update: {
        name: `${moduleDefinition.title} Complete`,
        updatedAt: now,
      },
      create: {
        id: moduleDefinition.badgeId,
        name: `${moduleDefinition.title} Complete`,
        updatedAt: now,
      },
    });

    await prisma.badgeRule.upsert({
      where: {
        badgeId_moduleId: {
          badgeId: moduleBadge.id,
          moduleId: moduleRecord.id,
        },
      },
      update: {
        minScore: 0,
        required: true,
      },
      create: {
        id: randomUUID(),
        badgeId: moduleBadge.id,
        moduleId: moduleRecord.id,
        minScore: 0,
        required: true,
      },
    });

    const expectedQuestionKeys: string[] = [];

    for (const [index, questionStem] of FIRM_MODULE_QUESTION_STEMS.entries()) {
      const questionKey = `${moduleDefinition.sectionKey}_q${index + 1}`;
      expectedQuestionKeys.push(questionKey);
      const prompt = `${moduleDefinition.title}: ${questionStem}`;
      const sectionDefinition = FIRM_MODULE_SECTIONS.find(
        (section) => index >= section.startIndex && index <= section.endIndex
      );
      const persistedSection = sectionDefinition
        ? persistedSections[FIRM_MODULE_SECTIONS.indexOf(sectionDefinition)]
        : null;
      const existingQuestions = await prisma.surveyQuestion.findMany({
        where: {
          moduleId: moduleRecord.id,
          key: questionKey,
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      const primaryExistingQuestion = existingQuestions[0] ?? null;
      const duplicateExistingQuestionIds = existingQuestions.slice(1).map((question) => question.id);

      if (duplicateExistingQuestionIds.length > 0) {
        await prisma.surveyQuestion.deleteMany({
          where: {
            id: {
              in: duplicateExistingQuestionIds,
            },
          },
        });
      }

      const data = {
        prompt,
        inputType: "SLIDER" as QuestionInputType,
        weight: 1,
        order: index + 1,
        required: true,
        sectionId: persistedSection?.id ?? null,
        meta: {
          section: {
            key: persistedSection?.key ?? moduleDefinition.sectionKey,
            title: persistedSection?.title ?? moduleDefinition.title,
            description: persistedSection?.description ?? moduleDefinition.summary,
            order: persistedSection?.order,
          },
          helpText: "Score the current reality on a 0 to 5 scale, not the intended future state.",
          slider: {
            min: 0,
            max: 5,
            step: 1,
            labels: {
              "0": "Absent / ad hoc",
              "5": "Strong / repeatable",
            },
          },
        },
        updatedAt: now,
      };

      let questionId: string;

      if (primaryExistingQuestion) {
        await prisma.surveyQuestion.update({
          where: { id: primaryExistingQuestion.id },
          data,
        });
        questionId = primaryExistingQuestion.id;
      } else {
        const createdQuestion = await prisma.surveyQuestion.create({
          data: {
            id: randomUUID(),
            moduleId: moduleRecord.id,
            key: questionKey,
            ...data,
          },
          select: { id: true },
        });
        questionId = createdQuestion.id;
      }

      const questionCapabilityNodeIds = getFirmQuestionCapabilityKeys(moduleDefinition.sectionKey, index).map(
        (key) => {
          const nodeId = capabilityNodeIdByKey.get(key);
          if (!nodeId) {
            throw new Error(`Missing capability node for question mapping: ${key}`);
          }
          return nodeId;
        }
      );

      for (const nodeId of questionCapabilityNodeIds) {
        await prisma.surveyQuestionCapability.upsert({
          where: {
            questionId_nodeId: {
              questionId,
              nodeId,
            },
          },
          update: { weight: 1 },
          create: {
            id: randomUUID(),
            questionId,
            nodeId,
            weight: 1,
          },
        });
      }

      await prisma.surveyQuestionCapability.deleteMany({
        where: {
          questionId,
          nodeId: { notIn: questionCapabilityNodeIds },
        },
      });
    }

    const openEndedSectionKey = `${moduleDefinition.sectionKey}-module-follow-up`;
    const openEndedSectionTitle = `${moduleDefinition.title}: Module follow-up`;
    const openEndedSectionDescription =
      "Five module-specific follow-up questions capture current operating context that PAT cannot read from numeric scores alone. PAT keeps this wording fixed today rather than overstating adaptive follow-up logic.";

    for (const [index, promptDefinition] of buildFirmModuleOpenEndedPrompts(moduleDefinition).entries()) {
      const questionKey = `${moduleDefinition.sectionKey}_open_${index + 1}`;
      expectedQuestionKeys.push(questionKey);
      const existingQuestions = await prisma.surveyQuestion.findMany({
        where: {
          moduleId: moduleRecord.id,
          key: questionKey,
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });

      const primaryExistingQuestion = existingQuestions[0] ?? null;
      const duplicateExistingQuestionIds = existingQuestions.slice(1).map((question) => question.id);

      if (duplicateExistingQuestionIds.length > 0) {
        await prisma.surveyQuestion.deleteMany({
          where: {
            id: {
              in: duplicateExistingQuestionIds,
            },
          },
        });
      }

      const data = {
        prompt: `${moduleDefinition.title}: ${promptDefinition.prompt}`,
        inputType: QuestionInputType.TEXT,
        weight: 0,
        order: FIRM_MODULE_QUESTION_STEMS.length + index + 1,
        required: true,
        sectionId: null,
        meta: {
          section: {
            key: openEndedSectionKey,
            title: openEndedSectionTitle,
            description: openEndedSectionDescription,
            order: FIRM_MODULE_SECTIONS.length + 1,
          },
          helpText:
            "Use current-state examples and operating detail. This response is required for context quality, but it does not change the numeric PAT score.",
          placeholder: promptDefinition.placeholder,
          text: {
            multiline: true,
            maxLength: 2000,
          },
        },
        updatedAt: now,
      };

      if (primaryExistingQuestion) {
        await prisma.surveyQuestion.update({
          where: { id: primaryExistingQuestion.id },
          data,
        });
      } else {
        await prisma.surveyQuestion.create({
          data: {
            id: randomUUID(),
            moduleId: moduleRecord.id,
            key: questionKey,
            ...data,
          },
          select: { id: true },
        });
      }
    }

    await prisma.surveyQuestion.deleteMany({
      where: {
        moduleId: moduleRecord.id,
        key: {
          notIn: expectedQuestionKeys,
        },
      },
    });
  }

  for (const insight of FIRM_TIER1_INSIGHT_DEFINITIONS) {
    const persisted = await prisma.insight.upsert({
      where: { key: insight.key },
      update: {
        title: insight.title,
        body: insight.body,
        tier: 1,
        active: true,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: insight.key,
        title: insight.title,
        body: insight.body,
        tier: 1,
        active: true,
        updatedAt: now,
      },
    });

    for (const moduleDefinition of FIRM_MODULE_DEFINITIONS) {
      await prisma.insightUnlockRule.upsert({
        where: {
          insightId_badgeId: {
            insightId: persisted.id,
            badgeId: moduleDefinition.badgeId,
          },
        },
        update: { required: true },
        create: {
          id: randomUUID(),
          insightId: persisted.id,
          badgeId: moduleDefinition.badgeId,
          required: true,
        },
      });
    }

    await prisma.insightUnlockRule.upsert({
      where: {
        insightId_badgeId: {
          insightId: persisted.id,
          badgeId: aggregateBadge.id,
        },
      },
      update: { required: false },
      create: {
        id: randomUUID(),
        insightId: persisted.id,
        badgeId: aggregateBadge.id,
        required: false,
      },
    });

    const capabilityRuleDefinitions =
      FIRM_TIER1_INSIGHT_CAPABILITY_RULES[
        insight.key as keyof typeof FIRM_TIER1_INSIGHT_CAPABILITY_RULES
      ];
    if (!capabilityRuleDefinitions) {
      continue;
    }

    const capabilityRuleNodeIds = capabilityRuleDefinitions.map((rule) => {
      const nodeId = capabilityNodeIdByKey.get(rule.key);
      if (!nodeId) {
        throw new Error(`Missing capability node for insight rule: ${rule.key}`);
      }
      return nodeId;
    });

    for (const capabilityRule of capabilityRuleDefinitions) {
      const nodeId = capabilityNodeIdByKey.get(capabilityRule.key);
      if (!nodeId) {
        throw new Error(`Missing capability node for insight rule: ${capabilityRule.key}`);
      }

      await prisma.insightCapabilityRule.upsert({
        where: {
          insightId_nodeId: {
            insightId: persisted.id,
            nodeId,
          },
        },
        update: {
          minScore: capabilityRule.minScore,
          required: true,
          updatedAt: now,
        },
        create: {
          id: randomUUID(),
          insightId: persisted.id,
          nodeId,
          minScore: capabilityRule.minScore,
          required: true,
          updatedAt: now,
        },
      });
    }

    await prisma.insightCapabilityRule.deleteMany({
      where: {
        insightId: persisted.id,
        nodeId: { notIn: capabilityRuleNodeIds },
      },
    });
  }

  return ensuredModules;
}

export async function ensureFirmProductModule() {
  const now = new Date();
  return prisma.surveyModule.upsert({
    where: { key: FIRM_PRODUCT_MODULE_KEY },
    update: {
      title: FIRM_PRODUCT_MODULE_TITLE,
      description: "Firm-side product assessment aligned to vendor-declared features.",
      scope: ModuleScope.PRODUCT,
      active: true,
      version: 1,
      weight: 1,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      key: FIRM_PRODUCT_MODULE_KEY,
      title: FIRM_PRODUCT_MODULE_TITLE,
      description: "Firm-side product assessment aligned to vendor-declared features.",
      scope: ModuleScope.PRODUCT,
      active: true,
      version: 1,
      weight: 1,
      updatedAt: now,
    },
    select: { id: true, key: true, title: true, description: true, version: true },
  });
}

export function buildFirmProductQuestions(selectedUtilityKeys: string[]): VendorAssessmentQuestion[] {
  return buildProductAssessmentPlan({
    perspective: "firm",
    selectedUtilityKeys,
    includeProductGeneral: false,
    includeOpenEnded: false,
  }).modules.flatMap((module) => module.questions) as VendorAssessmentQuestion[];
}

export async function getFirmAssessmentProgress(companyId: string) {
  // WS9-EMERGENCY: ensureFirmAlignmentSystem moved out of the read path.
  // Seed scripts (scripts/seed-pat-runtime.ts, lib/demoPatEcosystemSeed.ts:1026)
  // run it at provisioning time. Running it per-read fans out ~720 upserts
  // when the consultant ecosystem detail or vendor-brief page loads against
  // 15 firms, which exhausts the Prisma connection pool and surfaces as
  // "Cannot read properties of undefined (reading 'findMany')". See
  // PAT-5.7-WS9-EMERGENCY-Prompt.md.

  const [modules, submissions, drafts] = await Promise.all([
    prisma.surveyModule.findMany({
      where: { key: { in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key) } },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        SurveyQuestion: { select: { id: true } },
      },
    }),
    prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        companyId,
        SurveyModule: {
          key: { in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key) },
        },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        moduleId: true,
        score: true,
        createdAt: true,
      },
    }),
    prisma.surveySubmission.findMany({
      where: getSurveyDraftWhere({
        companyId,
        SurveyModule: {
          key: { in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key) },
        },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        moduleId: true,
        answeredCount: true,
        createdAt: true,
      },
    }),
  ]);

  return FIRM_MODULE_DEFINITIONS.map((definition) => {
    const moduleRecord = modules.find((entry) => entry.key === definition.key);
    if (!moduleRecord) {
      return {
        key: definition.key,
        badgeId: definition.badgeId,
        title: definition.title,
        description: definition.description,
        summary: definition.summary,
        href: `/survey/${definition.key}`,
        questionCount: 0,
        completedCount: 0,
        draftAnsweredCount: 0,
        status: "not-started",
        statusLabel: "Not Started",
        statusDescription: "This canonical firm module is not available in the local survey catalog yet.",
        latestScore: null,
        latestSubmittedAt: null,
        draftUpdatedAt: null,
      } satisfies FirmModuleProgress;
    }

    const latestSubmission = submissions.find((submission) => submission.moduleId === moduleRecord.id) ?? null;
    const latestDraft = drafts.find((draft) => draft.moduleId === moduleRecord.id) ?? null;
    const progressStatus = getFirmModuleProgressStatus({
      questionCount: moduleRecord.SurveyQuestion.length,
      latestSubmittedAt: latestSubmission?.createdAt ?? null,
      draftAnsweredCount: latestDraft?.answeredCount ?? 0,
    });

    return {
      key: moduleRecord.key,
      badgeId: definition.badgeId,
      title: moduleRecord.title,
      description: moduleRecord.description ?? "",
      summary: definition.summary,
      href: `/survey/${moduleRecord.key}`,
      questionCount: moduleRecord.SurveyQuestion.length,
      completedCount: progressStatus.completedCount,
      draftAnsweredCount: latestDraft?.answeredCount ?? 0,
      status: progressStatus.status,
      statusLabel: progressStatus.statusLabel,
      statusDescription: progressStatus.statusDescription,
      latestScore: latestSubmission?.score ?? null,
      latestSubmittedAt: latestSubmission?.createdAt ?? null,
      draftUpdatedAt: latestDraft?.createdAt ?? null,
    } satisfies FirmModuleProgress;
  });
}

export async function getFirmProductCatalog(companyId?: string | null) {
  // WS9-EMERGENCY: ensureFirmProductModule moved out of the read path
  // for the same reason as ensureFirmAlignmentSystem above.

  // Phase 1 / Day-10 tenancy: when called with a firm companyId, restrict the
  // catalog to products owned by vendors in the firm's ecosystem (per Q6 of
  // the locked consultant scope decisions). When called without a firm
  // (admin-context invocation), preserve the global catalog. Open mode returns
  // all VENDOR-type companies so the IN-clause becomes a no-op filter.
  const scopedVendorIds = companyId ? await getFirmScopedVendors(companyId) : null;

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(scopedVendorIds ? { companyId: { in: scopedVendorIds } } : {}),
    },
    orderBy: [{ Company: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      summary: true,
      slug: true,
      Company: {
        select: { name: true },
      },
    },
  }).catch(() => []);

  const vendorProductModule = await prisma.surveyModule.findUnique({
    where: { key: VENDOR_PRODUCT_MODULE_KEY },
    select: { id: true },
  }).catch(() => null);
  const firmProductModule = await prisma.surveyModule.findUnique({
    where: { key: FIRM_PRODUCT_MODULE_KEY },
    select: { id: true },
  }).catch(() => null);

  const latestVendorSubmissionByProductId = new Map<
    string,
    {
      id: string;
      score: number;
      createdAt: Date;
      answeredCount: number;
      answers: unknown;
    }
  >();
  const latestFirmSubmissionByProductId = new Map<string, { createdAt: Date }>();
  const latestFirmDraftByProductId = new Map<string, { answeredCount: number; createdAt: Date }>();

  if (vendorProductModule && products.length > 0) {
    const submissions = await prisma.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        moduleId: vendorProductModule.id,
        Subject: {
          productId: {
            in: products.map((product) => product.id),
          },
        },
      }),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        score: true,
        createdAt: true,
        answeredCount: true,
        answers: true,
        Subject: {
          select: {
            productId: true,
          },
        },
      },
    }).catch(() => []);

    for (const submission of submissions) {
      const productId = submission.Subject?.productId;
      if (!productId || latestVendorSubmissionByProductId.has(productId)) {
        continue;
      }

      latestVendorSubmissionByProductId.set(productId, {
        id: submission.id,
        score: submission.score,
        createdAt: submission.createdAt,
        answeredCount: submission.answeredCount,
        answers: submission.answers,
      });
    }
  }

  if (firmProductModule && companyId && products.length > 0) {
    const productIds = products.map((product) => product.id);
    const [firmSubmissions, firmDrafts] = await Promise.all([
      prisma.surveySubmission.findMany({
        where: getSurveyFinalWhere({
          moduleId: firmProductModule.id,
          companyId,
          Subject: {
            productId: {
              in: productIds,
            },
          },
        }),
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          Subject: {
            select: {
              productId: true,
            },
          },
        },
      }).catch(() => []),
      prisma.surveySubmission.findMany({
        where: getSurveyDraftWhere({
          moduleId: firmProductModule.id,
          companyId,
          Subject: {
            productId: {
              in: productIds,
            },
          },
        }),
        orderBy: { createdAt: "desc" },
        select: {
          answeredCount: true,
          createdAt: true,
          Subject: {
            select: {
              productId: true,
            },
          },
        },
      }).catch(() => []),
    ]);

    for (const submission of firmSubmissions) {
      const productId = submission.Subject?.productId;
      if (!productId || latestFirmSubmissionByProductId.has(productId)) {
        continue;
      }

      latestFirmSubmissionByProductId.set(productId, { createdAt: submission.createdAt });
    }

    for (const draft of firmDrafts) {
      const productId = draft.Subject?.productId;
      if (!productId || latestFirmDraftByProductId.has(productId)) {
        continue;
      }

      latestFirmDraftByProductId.set(productId, {
        answeredCount: draft.answeredCount,
        createdAt: draft.createdAt,
      });
    }
  }

  return products.map((product) => {
    const vendorAssessmentStatus = deriveVendorProductAssessmentCompletionStatus({
      latestSubmission: latestVendorSubmissionByProductId.get(product.id) ?? null,
    });
    const latestFirmReview = latestFirmSubmissionByProductId.get(product.id) ?? null;
    const latestFirmDraft = latestFirmDraftByProductId.get(product.id) ?? null;
    const firmReviewStatus = deriveFirmProductReviewStatus({
      reviewAvailable: vendorAssessmentStatus.completed,
      questionCount: vendorAssessmentStatus.scoredQuestionCount,
      latestFirmReviewSubmittedAt: latestFirmReview?.createdAt ?? null,
      draftAnsweredCount: latestFirmDraft?.answeredCount ?? 0,
    });

    return {
      id: product.id,
      name: product.name,
      vendorName: product.Company?.name ?? "Vendor",
      summary: product.summary,
      utilityKeys: vendorAssessmentStatus.utilityKeys,
      questionCount: vendorAssessmentStatus.scoredQuestionCount,
      reviewAvailable: vendorAssessmentStatus.completed,
      reviewStatusLabel: vendorAssessmentStatus.statusLabel,
      reviewStatusReason: vendorAssessmentStatus.reason,
      vendorAssessmentCompletedAt: vendorAssessmentStatus.latestSubmittedAt,
      firmReviewStatus: firmReviewStatus.status,
      firmReviewStatusLabel: firmReviewStatus.label,
      firmReviewStatusReason: firmReviewStatus.reason,
      firmReviewDraftAnsweredCount: latestFirmDraft?.answeredCount ?? 0,
      firmReviewDraftUpdatedAt: latestFirmDraft?.createdAt ?? null,
      latestFirmReviewSubmittedAt: latestFirmReview?.createdAt ?? null,
    };
  }) satisfies FirmProductCatalogItem[];
}

export async function submitFirmProductAssessment(input: {
  companyId: string;
  productId: string;
  answers: Record<string, number>;
}) {
  const moduleRecord = await ensureFirmProductModule();
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const subject = await ensureProductSubject(product);

  const values = Object.values(input.answers);
  const score = computeScore({
    answers: input.answers,
    scaleMin: PRODUCT_ASSESSMENT_SCALE_MIN,
    scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
  });

  return prisma.surveySubmission.create({
    data: {
      id: randomUUID(),
      companyId: input.companyId,
      subjectId: subject.id,
      moduleId: moduleRecord.id,
      version: 1,
      answers: {
        responses: input.answers,
      },
      score: score.rawScorePct,
      weightedAvg: score.rawWeightedAvg,
      scoreVersion: 1,
      scaleMin: PRODUCT_ASSESSMENT_SCALE_MIN,
      scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
      totalWeight: values.length,
      answeredCount: values.length,
      signalIntegrityScore: 1,
      integrityFlags: [],
    },
  });
}

export const FIRM_HELP_CARDS = [
  {
    title: "Alignment Assessment",
    what: "The five-module, 100-question firm alignment system.",
    why: "This is the main intake for firm-side Pro membership PAT insight unlocking.",
    how: "Open the module overview, complete each module, and submit through the live PAT flow.",
    href: "/firm/alignment-assessment",
  },
  {
    title: "Product Assessments",
    what: "Firm-side product reviews aligned only to vendor-declared features.",
    why: "This is the firm-to-vendor product intelligence loop inside PAT.",
    how: "Choose a product, answer the feature-aligned questions, and persist the review.",
    href: "/firm/product-assessments",
  },
  {
    title: "Alignment Insights",
    what: "Firm-facing Pro and Elite PAT alignment insights.",
    why: "This turns alignment assessment and product signal into usable current-state decision support.",
    how: "Open firm alignment insight cards, review grounded Pro detail, and inspect staged Elite cards without overstating what is live.",
    href: "/firm/insights",
  },
  {
    title: "Admin",
    what: "The clean admin and profile-management surface for the firm.",
    why: "This is where profile, user insight, and future external sync readiness live.",
    how: "Manage profile information, invite users, and review current user status.",
    href: "/firm/admin",
  },
  {
    title: "Help",
    what: "A simple firm explainer for each card and route.",
    why: "It reduces onboarding friction and keeps PAT usage professional and clear.",
    how: "Use it as the firm-side map to each PAT surface.",
    href: "/firm/help",
  },
] as const;

export type FirmUserInsightRecord = {
  id: string;
  email: string;
  role: UserRole;
  status: "invited" | "active";
  companyId: string | null;
  personSubjectId: string | null;
  subjectMembershipReady: boolean;
  assessmentCount: number;
  latestScore: number | null;
  latestSubmittedAt: Date | null;
  assessmentProgress: string;
};

export async function getFirmUserInsight(companyId: string, search: string | null) {
  const users = await prisma.user.findMany({
    where: {
      companyId,
      ...(search
        ? {
            email: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    personSubjectId: null,
    subjectMembershipReady: false,
    status: user.name ? "active" : "invited",
    assessmentCount: 0,
    latestScore: null,
    latestSubmittedAt: null,
    assessmentProgress: "No user-side assessments recorded yet",
  })) satisfies FirmUserInsightRecord[];
}

export function tier2CardTitle(title: string) {
  return `${title} · ${VENDOR_PRODUCT_TIER2_HOVER}`;
}

export function buildFirmExternalProfileContract(input: {
  companyName: string;
  contactName: string | null;
  workEmail: string | null;
  phone: string | null;
  businessAddress: string | null;
  paymentDetails: string | null;
  companyDescription: string | null;
  users: Array<{ email: string; role: UserRole; status: "invited" | "active" }>;
  productsUnderReview: string[];
}) {
  return buildIntegrationEnvelope("firm-profile", {
    source: "pat-app-manual-entry",
    syncStatus: "integration-ready",
    firm: {
      displayName: input.companyName,
      contactName: input.contactName,
      workEmail: input.workEmail,
      phone: input.phone,
      businessAddress: input.businessAddress,
      paymentDetails: input.paymentDetails,
      companyDescription: input.companyDescription,
      users: input.users,
      productsUnderReview: input.productsUnderReview,
    },
  });
}
