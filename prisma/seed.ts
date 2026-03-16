import dotenv from "dotenv";
import {
  CapabilityLevel,
  CapabilityScope,
  CompanyType,
  ModuleAxis,
  ModuleScope,
  PrismaClient,
  QuestionInputType,
  UserRole,
} from "@prisma/client";
import { randomUUID } from "crypto";
import {
  LAUNCH_BADGES,
  LAUNCH_COMPANY,
  LAUNCH_INSIGHTS,
  LAUNCH_MODULES,
  LAUNCH_OWNER_FALLBACK_EMAIL,
  LAUNCH_OWNER_FALLBACK_NAME,
  LAUNCH_USER,
} from "../lib/launch-config";
import {
  CAPABILITY_CATALOG,
  MODULE_CAPABILITY_REGISTRY,
  QUESTION_CAPABILITY_REGISTRY,
} from "../lib/capability-catalog";
import { persistSelfSubmissionCapabilityScores } from "../lib/engine/persistCapabilityScores";
import { INSIGHT_UNLOCK_CONFIG } from "../lib/insight-unlock-config";
import { STAGED_FIRM_MODULES } from "../lib/staged-firm-taxonomy";
import {
  ACTIVATED_BETA_FIRM_MODULE_KEY,
  PRODUCT_EXTERNAL_REVIEW_MODULE_KEY,
} from "../lib/assessment-module-catalog";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

function getSeedOwnerEmail() {
  const configured = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  return configured && configured.length > 0 ? configured : LAUNCH_OWNER_FALLBACK_EMAIL;
}

function getSeedOwnerName() {
  const configured = process.env.SEED_OWNER_NAME?.trim();
  return configured && configured.length > 0 ? configured : LAUNCH_OWNER_FALLBACK_NAME;
}

async function ensureQuestions(
  moduleId: string,
  questions: ReadonlyArray<{
    key: string;
    prompt: string;
    order: number;
    meta?: Record<string, unknown>;
  }>
) {
  const now = new Date();

  for (const question of questions) {
    const existing = await prisma.surveyQuestion.findFirst({
      where: { moduleId, key: question.key },
      select: { id: true },
    });

    if (existing) {
      await prisma.surveyQuestion.update({
        where: { id: existing.id },
        data: {
          prompt: question.prompt,
          inputType: QuestionInputType.SLIDER,
          order: question.order,
          required: true,
          weight: 1,
          meta: question.meta,
          updatedAt: now,
        },
      });
      continue;
    }

    await prisma.surveyQuestion.create({
      data: {
        id: randomUUID(),
        moduleId,
        key: question.key,
        prompt: question.prompt,
        inputType: QuestionInputType.SLIDER,
        order: question.order,
        required: true,
        weight: 1,
        meta: question.meta,
        updatedAt: now,
      },
    });
  }
}

async function upsertSurveyModule(input: {
  key: string;
  title: string;
  description: string;
  scope: ModuleScope;
  active: boolean;
}) {
  const now = new Date();

  return prisma.surveyModule.upsert({
    where: { key: input.key },
    update: {
      title: input.title,
      description: input.description,
      scope: input.scope,
      version: 1,
      active: input.active,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      key: input.key,
      title: input.title,
      description: input.description,
      scope: input.scope,
      version: 1,
      active: input.active,
      updatedAt: now,
    },
    select: { id: true, key: true, scope: true, active: true },
  });
}

async function ensureInsights(
  insights: ReadonlyArray<{ key: string; title: string; body: string; tier: number }>
) {
  const now = new Date();

  for (const insight of insights) {
    await prisma.insight.upsert({
      where: { key: insight.key },
      update: {
        title: insight.title,
        body: insight.body,
        tier: insight.tier,
        active: true,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: insight.key,
        title: insight.title,
        body: insight.body,
        tier: insight.tier,
        active: true,
        updatedAt: now,
      },
      select: { id: true },
    });
  }
}

async function ensureCapabilityMappings(moduleIdsByKey: Record<string, string>) {
  const now = new Date();
  const capabilityIdsByKey = new Map<string, string>();

  for (const capability of CAPABILITY_CATALOG) {
    const record = await prisma.capabilityNode.upsert({
      where: { key: capability.key },
      update: {
        title: capability.title,
        scope:
          capability.scope === "FIRM" ? CapabilityScope.FIRM : CapabilityScope.PRODUCT,
        level:
          capability.level === "TIER1"
            ? CapabilityLevel.TIER1
            : capability.level === "TIER2"
              ? CapabilityLevel.TIER2
              : CapabilityLevel.TIER3,
        active: capability.active,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: capability.key,
        title: capability.title,
        scope:
          capability.scope === "FIRM" ? CapabilityScope.FIRM : CapabilityScope.PRODUCT,
        level:
          capability.level === "TIER1"
            ? CapabilityLevel.TIER1
            : capability.level === "TIER2"
              ? CapabilityLevel.TIER2
              : CapabilityLevel.TIER3,
        active: capability.active,
        updatedAt: now,
      },
      select: { id: true, key: true },
    });

    capabilityIdsByKey.set(record.key, record.id);
  }

  for (const moduleMapping of MODULE_CAPABILITY_REGISTRY) {
    const moduleId = moduleIdsByKey[moduleMapping.moduleKey];
    if (!moduleId) {
      throw new Error(`Missing module id for capability mapping moduleKey=${moduleMapping.moduleKey}`);
    }

    for (const capabilityKey of moduleMapping.capabilityKeys) {
      const nodeId = capabilityIdsByKey.get(capabilityKey);
      if (!nodeId) {
        throw new Error(`Missing capability node for key=${capabilityKey}`);
      }

      const existing = await prisma.moduleCapability.findFirst({
        where: { moduleId, nodeId },
        select: { id: true },
      });

      if (existing) {
        await prisma.moduleCapability.update({
          where: { id: existing.id },
          data: { weight: 1 },
        });
        continue;
      }

      await prisma.moduleCapability.create({
        data: {
          id: randomUUID(),
          moduleId,
          nodeId,
          weight: 1,
        },
      });
    }
  }

  for (const questionMapping of QUESTION_CAPABILITY_REGISTRY) {
    const moduleId = moduleIdsByKey[questionMapping.moduleKey];
    if (!moduleId) {
      throw new Error(`Missing module id for question mapping moduleKey=${questionMapping.moduleKey}`);
    }

    const question = await prisma.surveyQuestion.findFirst({
      where: {
        moduleId,
        key: questionMapping.questionKey,
      },
      select: { id: true },
    });

    if (!question) {
      throw new Error(
        `Missing question for capability mapping moduleKey=${questionMapping.moduleKey} questionKey=${questionMapping.questionKey}`
      );
    }

    for (const capabilityKey of questionMapping.capabilityKeys) {
      const nodeId = capabilityIdsByKey.get(capabilityKey);
      if (!nodeId) {
        throw new Error(`Missing capability node for key=${capabilityKey}`);
      }

      const existing = await prisma.surveyQuestionCapability.findFirst({
        where: { questionId: question.id, nodeId },
        select: { id: true },
      });

      if (existing) {
        await prisma.surveyQuestionCapability.update({
          where: { id: existing.id },
          data: { weight: 1 },
        });
        continue;
      }

      await prisma.surveyQuestionCapability.create({
        data: {
          id: randomUUID(),
          questionId: question.id,
          nodeId,
          weight: 1,
        },
      });
    }
  }
}

async function ensureInsightCapabilityRules() {
  const now = new Date();
  const capabilityIdsByKey = new Map<string, string>();

  const capabilities = await prisma.capabilityNode.findMany({
    where: { key: { in: [...new Set(INSIGHT_UNLOCK_CONFIG.flatMap((entry) => entry.capabilityKeys))] } },
    select: { id: true, key: true },
  });

  for (const capability of capabilities) {
    capabilityIdsByKey.set(capability.key, capability.id);
  }

  const insightIdsByKey = new Map<string, string>();
  const insights = await prisma.insight.findMany({
    where: { key: { in: INSIGHT_UNLOCK_CONFIG.map((entry) => entry.insightKey) } },
    select: { id: true, key: true },
  });

  for (const insight of insights) {
    insightIdsByKey.set(insight.key, insight.id);
  }

  for (const entry of INSIGHT_UNLOCK_CONFIG) {
    const insightId = insightIdsByKey.get(entry.insightKey);
    if (!insightId) {
      throw new Error(`Missing insight for unlock config insightKey=${entry.insightKey}`);
    }

    for (const capabilityKey of entry.capabilityKeys) {
      const nodeId = capabilityIdsByKey.get(capabilityKey);
      if (!nodeId) {
        throw new Error(`Missing capability node for insight unlock capabilityKey=${capabilityKey}`);
      }

      await prisma.insightCapabilityRule.upsert({
        where: {
          insightId_nodeId: {
            insightId,
            nodeId,
          },
        },
        update: {
          minScore: entry.minScore,
          required: true,
          updatedAt: now,
        },
        create: {
          id: randomUUID(),
          insightId,
          nodeId,
          minScore: entry.minScore,
          required: true,
          updatedAt: now,
        },
      });
    }
  }
}

function asNumericAnswerRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const entries = Object.entries(value).filter(
    (entry): entry is [string, number] =>
      typeof entry[0] === "string" &&
      typeof entry[1] === "number" &&
      Number.isFinite(entry[1])
  );

  return Object.fromEntries(entries);
}

async function backfillCapabilityScoresForCanonicalSubmissions(moduleIdsByKey: Record<string, string>) {
  const canonicalModuleIds = Object.values(moduleIdsByKey);
  const submissions = await prisma.surveySubmission.findMany({
    where: { moduleId: { in: canonicalModuleIds } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      companyId: true,
      productId: true,
      moduleId: true,
      scoreVersion: true,
      scaleMin: true,
      scaleMax: true,
      answers: true,
      SurveyModule: {
        select: {
          key: true,
        },
      },
    },
  });

  const latestByContext = new Map<string, (typeof submissions)[number]>();
  for (const submission of submissions) {
    const dedupeKey = `${submission.companyId}::${submission.productId ?? "company"}::${submission.moduleId}`;
    if (!latestByContext.has(dedupeKey)) {
      latestByContext.set(dedupeKey, submission);
    }
  }

  for (const submission of latestByContext.values()) {
    await prisma.$transaction(async (tx) => {
      await persistSelfSubmissionCapabilityScores({
        tx,
        surveySubmissionId: submission.id,
        moduleId: submission.moduleId,
        moduleKey: submission.SurveyModule.key,
        companyId: submission.companyId,
        productId: submission.productId,
        answers: asNumericAnswerRecord(submission.answers),
        scoreVersion: submission.scoreVersion,
        scaleMin: submission.scaleMin,
        scaleMax: submission.scaleMax,
      });
    });
  }
}

async function main() {
  const ownerEmail = getSeedOwnerEmail();
  const ownerName = getSeedOwnerName();
  const now = new Date();

  const company = await prisma.company.upsert({
    where: { id: LAUNCH_COMPANY.id },
    update: {
      name: LAUNCH_COMPANY.name,
      type: CompanyType.FIRM,
      updatedAt: now,
    },
    create: {
      id: LAUNCH_COMPANY.id,
      name: LAUNCH_COMPANY.name,
      type: CompanyType.FIRM,
      updatedAt: now,
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });

  const existingOwnerByEmail = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true },
  });
  const existingLaunchOwnerById =
    existingOwnerByEmail?.id === LAUNCH_USER.id
      ? existingOwnerByEmail
      : await prisma.user.findUnique({
          where: { id: LAUNCH_USER.id },
          select: { id: true },
        });

  const owner = existingOwnerByEmail
    ? await prisma.user.update({
        where: { email: ownerEmail },
        data: {
          name: ownerName,
          role: UserRole.OWNER,
          companyId: company.id,
          updatedAt: now,
        },
        select: {
          id: true,
          email: true,
          role: true,
          companyId: true,
        },
      })
    : existingLaunchOwnerById
      ? await prisma.user.update({
          where: { id: LAUNCH_USER.id },
          data: {
            email: ownerEmail,
            name: ownerName,
            role: UserRole.OWNER,
            companyId: company.id,
            updatedAt: now,
          },
          select: {
            id: true,
            email: true,
            role: true,
            companyId: true,
          },
        })
      : await prisma.user.create({
          data: {
            id: LAUNCH_USER.id,
            email: ownerEmail,
            name: ownerName,
            role: UserRole.OWNER,
            companyId: company.id,
            updatedAt: now,
          },
          select: {
            id: true,
            email: true,
            role: true,
            companyId: true,
          },
        });

  const firmModule = await upsertSurveyModule({
    key: LAUNCH_MODULES.firm.key,
    title: LAUNCH_MODULES.firm.title,
    description: LAUNCH_MODULES.firm.description,
    scope: ModuleScope.FIRM,
    active: true,
  });

  const productModule = await upsertSurveyModule({
    key: LAUNCH_MODULES.product.key,
    title: LAUNCH_MODULES.product.title,
    description: LAUNCH_MODULES.product.description,
    scope: ModuleScope.PRODUCT,
    active: true,
  });

  const externalReviewModule = await prisma.surveyModule.upsert({
    where: { key: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY },
    update: {
      title: "Product Workflow Fit External Review",
      description: "External review source for product workflow fit intelligence.",
      axis: ModuleAxis.EXTERNAL_REVIEW,
      scope: ModuleScope.PRODUCT,
      version: 1,
      active: true,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      key: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY,
      title: "Product Workflow Fit External Review",
      description: "External review source for product workflow fit intelligence.",
      axis: ModuleAxis.EXTERNAL_REVIEW,
      scope: ModuleScope.PRODUCT,
      version: 1,
      active: true,
      updatedAt: now,
    },
    select: { id: true, key: true, scope: true, active: true },
  });

  await ensureQuestions(firmModule.id, LAUNCH_MODULES.firm.questions);
  await ensureQuestions(productModule.id, LAUNCH_MODULES.product.questions);

  const stagedFirmModules = [];
  for (const stagedModule of STAGED_FIRM_MODULES) {
    const persistedModule = await upsertSurveyModule({
      key: stagedModule.key,
      title: stagedModule.title,
      description: stagedModule.description,
      scope: ModuleScope.FIRM,
      active: stagedModule.key === ACTIVATED_BETA_FIRM_MODULE_KEY,
    });

    await ensureQuestions(
      persistedModule.id,
      stagedModule.questions.map((question) => ({
        key: question.key,
        prompt: question.prompt,
        order: question.order,
        meta: {
          domainKey: question.domainKey,
          staged: true,
        },
      }))
    );

    stagedFirmModules.push(persistedModule);
  }

  const tier1Badge = await prisma.badge.upsert({
    where: { id: LAUNCH_BADGES.tier1.id },
    update: { name: LAUNCH_BADGES.tier1.name, updatedAt: now },
    create: { id: LAUNCH_BADGES.tier1.id, name: LAUNCH_BADGES.tier1.name, updatedAt: now },
    select: { id: true, name: true },
  });

  const productBadge = await prisma.badge.upsert({
    where: { id: LAUNCH_BADGES.product.id },
    update: { name: LAUNCH_BADGES.product.name, updatedAt: now },
    create: { id: LAUNCH_BADGES.product.id, name: LAUNCH_BADGES.product.name, updatedAt: now },
    select: { id: true, name: true },
  });

  await prisma.badgeRule.upsert({
    where: { badgeId_moduleId: { badgeId: tier1Badge.id, moduleId: firmModule.id } },
    update: { required: true, minScore: LAUNCH_BADGES.tier1.minScore },
    create: {
      id: randomUUID(),
      badgeId: tier1Badge.id,
      moduleId: firmModule.id,
      required: true,
      minScore: LAUNCH_BADGES.tier1.minScore,
    },
  });

  await prisma.badgeRule.upsert({
    where: { badgeId_moduleId: { badgeId: productBadge.id, moduleId: productModule.id } },
    update: { required: true, minScore: LAUNCH_BADGES.product.minScore },
    create: {
      id: randomUUID(),
      badgeId: productBadge.id,
      moduleId: productModule.id,
      required: true,
      minScore: LAUNCH_BADGES.product.minScore,
    },
  });

  await ensureInsights(LAUNCH_INSIGHTS.firm);
  await ensureInsights(LAUNCH_INSIGHTS.product);
  await ensureCapabilityMappings({
    [LAUNCH_MODULES.firm.key]: firmModule.id,
    [LAUNCH_MODULES.product.key]: productModule.id,
    [PRODUCT_EXTERNAL_REVIEW_MODULE_KEY]: externalReviewModule.id,
    ...Object.fromEntries(stagedFirmModules.map((module) => [module.key, module.id])),
  });
  await ensureInsightCapabilityRules();
  await backfillCapabilityScoresForCanonicalSubmissions({
    [LAUNCH_MODULES.firm.key]: firmModule.id,
    [LAUNCH_MODULES.product.key]: productModule.id,
  });

  console.log("SEED_OK", {
    company,
    owner,
    modules: [firmModule, productModule, externalReviewModule, ...stagedFirmModules],
    badges: [tier1Badge, productBadge],
    usingFallbackOwnerEmail: ownerEmail === LAUNCH_OWNER_FALLBACK_EMAIL,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("Can't reach database server")) {
      console.error(
        "SEED_ERROR Launch seed could not reach the database. Check DATABASE_URL in .env.local and make sure Postgres is listening on localhost:5433."
      );
    } else {
      console.error("SEED_ERROR", e);
    }
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(1);
  });
