import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  CAPABILITY_CATALOG,
  MODULE_CAPABILITY_REGISTRY,
  QUESTION_CAPABILITY_REGISTRY,
} from "../lib/capability-catalog";
import {
  ASSESSMENT_MODULE_CATALOG,
  type AssessmentModuleCatalogEntry,
} from "../lib/assessment-module-catalog";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

function fail(message: string): never {
  throw new Error(message);
}

function getLiveModules() {
  return ASSESSMENT_MODULE_CATALOG.filter(
    (entry) => entry.activationState === "LIVE"
  );
}

function assertRegistryCoverage(liveModules: AssessmentModuleCatalogEntry[]) {
  const capabilityKeys = new Set(CAPABILITY_CATALOG.map((entry) => entry.key));
  const moduleRegistryByKey = new Map(
    MODULE_CAPABILITY_REGISTRY.map((entry) => [entry.moduleKey, entry])
  );
  const questionCoverage = new Map<string, Set<string>>();

  for (const entry of QUESTION_CAPABILITY_REGISTRY) {
    const key = `${entry.moduleKey}::${entry.questionKey}`;
    questionCoverage.set(key, new Set(entry.capabilityKeys));
    for (const capabilityKey of entry.capabilityKeys) {
      if (!capabilityKeys.has(capabilityKey)) {
        fail(`Question registry references unknown capability ${capabilityKey}`);
      }
    }
  }

  for (const moduleEntry of liveModules) {
    const moduleRegistry = moduleRegistryByKey.get(moduleEntry.key);
    if (!moduleRegistry || moduleRegistry.capabilityKeys.length === 0) {
      fail(`LIVE module ${moduleEntry.key} is missing module-to-capability mapping`);
    }

    for (const capabilityKey of moduleRegistry.capabilityKeys) {
      if (!capabilityKeys.has(capabilityKey)) {
        fail(`Module registry references unknown capability ${capabilityKey}`);
      }
    }
  }

  return questionCoverage;
}

async function main() {
  const liveModules = getLiveModules();
  const questionCoverage = assertRegistryCoverage(liveModules);

  const liveModuleKeys = liveModules.map((entry) => entry.key);
  const modules = await prisma.surveyModule.findMany({
    where: { key: { in: liveModuleKeys } },
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      ModuleCapability: {
        select: { id: true, CapabilityNode: { select: { key: true } } },
      },
      SurveyQuestion: {
        orderBy: [{ order: "asc" }, { key: "asc" }],
        select: {
          id: true,
          key: true,
          SurveyQuestionCapability: {
            select: { id: true, CapabilityNode: { select: { key: true } } },
          },
        },
      },
    },
  });

  if (modules.length !== liveModuleKeys.length) {
    fail("One or more LIVE modules are missing from persisted SurveyModule records");
  }

  for (const moduleRecord of modules) {
    if (moduleRecord.ModuleCapability.length === 0) {
      fail(`LIVE module ${moduleRecord.key} has no persisted ModuleCapability rows`);
    }

    for (const question of moduleRecord.SurveyQuestion) {
      const registryKey = `${moduleRecord.key}::${question.key}`;
      if (!questionCoverage.has(registryKey)) {
        fail(`LIVE question ${registryKey} is missing registry coverage`);
      }
      if (question.SurveyQuestionCapability.length === 0) {
        fail(`LIVE question ${registryKey} has no persisted SurveyQuestionCapability rows`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        liveModuleCount: modules.length,
        liveQuestionCount: modules.reduce((sum, moduleRecord) => sum + moduleRecord.SurveyQuestion.length, 0),
        capabilityCount: CAPABILITY_CATALOG.length,
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    console.error(
      "VERIFY_CAPABILITY_MAPPINGS_ERROR",
      error instanceof Error ? error.message : error
    );
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(1);
  })
  .then(async () => {
    await prisma.$disconnect();
  });
