import { ModuleScope, type QuestionInputType, type UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import { buildIntegrationEnvelope } from "@/lib/integrations/c2acct";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { TIER1_ALIGNMENT_BADGE_ID, TIER1_ALIGNMENT_BADGE_NAME } from "@/lib/patUnlocks";
import {
  FIRM_CAPABILITY_DEFINITIONS,
  FIRM_TIER1_INSIGHT_CAPABILITY_RULES,
  getFirmModuleCapabilityKeys,
  getFirmQuestionCapabilityKeys,
} from "@/lib/firmCapabilities";
import {
  type VendorAssessmentQuestion,
  VENDOR_PRODUCT_TIER2_HOVER,
  VENDOR_PRODUCT_UTILITY_CAP,
  ensureProductSubject,
  extractUtilityKeysFromSignals,
} from "@/lib/vendorPat";
import { buildProductAssessmentPlan } from "@/lib/vendorProductQuestionBank";
import { insightContent } from "@/lib/insightContent";

export const FIRM_MODULE_DEFINITIONS = [
  {
    key: "firm_alignment_operating_model_v1",
    badgeId: "firm-module-operating-model",
    title: "Operating Model and Workflow Discipline",
    description: "How clearly the firm defines, runs, and measures the operating model.",
    summary: "Workflow discipline, review rigor, handoffs, and operating clarity.",
    sectionKey: "operating-model",
  },
  {
    key: "firm_alignment_automation_ai_v1",
    badgeId: "firm-module-automation-ai",
    title: "Automation and AI Readiness",
    description: "How ready the firm is to use automation and AI responsibly in live delivery.",
    summary: "Automation posture, augmentation readiness, and practical AI governance.",
    sectionKey: "automation-ai",
  },
  {
    key: "firm_alignment_data_flow_v1",
    badgeId: "firm-module-data-flow",
    title: "Integration and Data Flow Maturity",
    description: "How well systems, data, and operational handoffs connect across the firm.",
    summary: "System linkage, data confidence, and cross-tool operating continuity.",
    sectionKey: "data-flow",
  },
  {
    key: "firm_alignment_governance_v1",
    badgeId: "firm-module-governance",
    title: "Governance, Controls, and Vendor Risk",
    description: "How clearly the firm governs risk, controls, and third-party product exposure.",
    summary: "Control posture, risk discipline, and vendor oversight.",
    sectionKey: "governance",
  },
  {
    key: "firm_alignment_strategy_v1",
    badgeId: "firm-module-strategy",
    title: "Strategy, Change Readiness, and Market Alignment",
    description: "How well the firm can adapt, prioritize, and align to current market pressure.",
    summary: "Strategy execution, change readiness, and external alignment.",
    sectionKey: "strategy",
  },
] as const;

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
  href: string;
  questionCount: number;
  completedCount: number;
  latestScore: number | null;
  latestSubmittedAt: Date | null;
};

export type FirmProductCatalogItem = {
  id: string;
  name: string;
  vendorName: string;
  summary: string | null;
  utilityKeys: string[];
};

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
        description: moduleDefinition.description,
        scope: ModuleScope.FIRM,
        active: true,
        version: 1,
        weight: 1,
        updatedAt: now,
      },
      select: { id: true, key: true, title: true },
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
      description: "Firm-side product assessment aligned to vendor-declared utilities.",
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
      description: "Firm-side product assessment aligned to vendor-declared utilities.",
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
    utilityCap: VENDOR_PRODUCT_UTILITY_CAP,
    includeProductGeneral: false,
    includeOpenEnded: false,
  }).modules.flatMap((module) => module.questions) as VendorAssessmentQuestion[];
}

export async function getFirmAssessmentProgress(companyId: string) {
  await ensureFirmAlignmentSystem();

  const [modules, submissions] = await Promise.all([
    prisma.surveyModule.findMany({
      where: { key: { in: FIRM_MODULE_DEFINITIONS.map((definition) => definition.key) } },
      orderBy: { key: "asc" },
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
  ]);

  return modules.map((module) => {
    const latestSubmission = submissions.find((submission) => submission.moduleId === module.id) ?? null;
    const definition = FIRM_MODULE_DEFINITIONS.find((entry) => entry.key === module.key)!;
    return {
      key: module.key,
      badgeId: definition.badgeId,
      title: module.title,
      description: module.description ?? "",
      href: `/survey/${module.key}`,
      questionCount: module.SurveyQuestion.length,
      completedCount: latestSubmission ? module.SurveyQuestion.length : 0,
      latestScore: latestSubmission?.score ?? null,
      latestSubmittedAt: latestSubmission?.createdAt ?? null,
    } satisfies FirmModuleProgress;
  });
}

export async function getFirmProductCatalog() {
  await ensureFirmProductModule();

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ Company: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      summary: true,
      slug: true,
      ProductSignal: {
        where: { signalKey: { startsWith: "pat.utility." } },
        select: { signalKey: true, valueNumber: true },
      },
      Company: {
        select: { name: true },
      },
    },
  }).catch(() => []);

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    vendorName: product.Company?.name ?? "Vendor",
    summary: product.summary,
    utilityKeys: extractUtilityKeysFromSignals(product.ProductSignal),
  })) satisfies FirmProductCatalogItem[];
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
  const average = values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length / 5 * 100);

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
      score: average,
      weightedAvg: values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length,
      scoreVersion: 1,
      scaleMin: 1,
      scaleMax: 5,
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
    what: "Firm-side product reviews aligned only to vendor-declared utilities.",
    why: "This is the firm-to-vendor product intelligence loop inside PAT.",
    how: "Choose a product, answer the utility-aligned questions, and persist the review.",
    href: "/firm/product-assessments",
  },
  {
    title: "Insights",
    what: "Firm-facing Pro membership and Elite membership PAT insights.",
    why: "This turns the assessment and product signal into usable decision support.",
    how: "Open insight cards, review unlocked Pro membership content, and inspect staged Elite membership cards.",
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
