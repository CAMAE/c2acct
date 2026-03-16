import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { QUESTION_CAPABILITY_REGISTRY } from "../lib/capability-catalog";
import { STAGED_FIRM_DOMAINS, STAGED_FIRM_MODULES, STAGED_FIRM_QUESTION_COUNT } from "../lib/staged-firm-taxonomy";
import { getAssessmentModuleCatalogEntry } from "../lib/assessment-module-catalog";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  if (STAGED_FIRM_DOMAINS.length !== 8) {
    fail(`Expected 8 staged firm domains, found ${STAGED_FIRM_DOMAINS.length}`);
  }

  if (STAGED_FIRM_MODULES.length !== 5) {
    fail(`Expected 5 staged firm modules, found ${STAGED_FIRM_MODULES.length}`);
  }

  if (STAGED_FIRM_QUESTION_COUNT !== 100) {
    fail(`Expected 100 staged firm questions, found ${STAGED_FIRM_QUESTION_COUNT}`);
  }

  const expectedQuestionCoverage = new Map(
    QUESTION_CAPABILITY_REGISTRY.map((entry) => [`${entry.moduleKey}::${entry.questionKey}`, entry.capabilityKeys])
  );

  for (const module of STAGED_FIRM_MODULES) {
    const catalogEntry = getAssessmentModuleCatalogEntry(module.key);
    if (!catalogEntry) {
      fail(`Catalog entry missing for staged firm module ${module.key}`);
    }
    if (catalogEntry.activationState !== "STAGED") {
      fail(`Staged firm module ${module.key} is not marked STAGED`);
    }
    if (catalogEntry.isUserFacing) {
      fail(`Staged firm module ${module.key} should remain non-user-facing until activation`);
    }
    if (module.questions.length !== 20) {
      fail(`Staged firm module ${module.key} should have 20 questions`);
    }
    if (module.domains.length < 1) {
      fail(`Staged firm module ${module.key} has no configured domains`);
    }

    for (const question of module.questions) {
      const registryKey = `${module.key}::${question.key}`;
      const capabilityKeys = expectedQuestionCoverage.get(registryKey);
      if (!capabilityKeys || capabilityKeys.length === 0) {
        fail(`Staged question ${registryKey} is missing capability registry coverage`);
      }
      if (!module.domains.includes(question.domainKey)) {
        fail(`Staged question ${registryKey} has domain ${question.domainKey} outside module grouping`);
      }
    }
  }

  const moduleKeys = STAGED_FIRM_MODULES.map((module) => module.key);
  const modules = await prisma.surveyModule.findMany({
    where: { key: { in: moduleKeys } },
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      active: true,
      ModuleCapability: {
        select: { id: true, CapabilityNode: { select: { key: true } } },
      },
      SurveyQuestion: {
        orderBy: [{ order: "asc" }, { key: "asc" }],
        select: {
          id: true,
          key: true,
          meta: true,
          SurveyQuestionCapability: {
            select: { id: true, CapabilityNode: { select: { key: true } } },
          },
        },
      },
    },
  });

  if (modules.length !== STAGED_FIRM_MODULES.length) {
    fail("One or more staged firm modules are missing from persisted SurveyModule records");
  }

  let persistedQuestionCount = 0;

  for (const moduleRecord of modules) {
    if (moduleRecord.active) {
      fail(`Staged firm module ${moduleRecord.key} should not be active in runtime data`);
    }
    if (moduleRecord.ModuleCapability.length === 0) {
      fail(`Staged firm module ${moduleRecord.key} is missing persisted ModuleCapability rows`);
    }
    if (moduleRecord.SurveyQuestion.length !== 20) {
      fail(`Staged firm module ${moduleRecord.key} should have 20 persisted questions`);
    }

    persistedQuestionCount += moduleRecord.SurveyQuestion.length;

    for (const question of moduleRecord.SurveyQuestion) {
      const meta = question.meta;
      const domainKey =
        meta && typeof meta === "object" && !Array.isArray(meta) && typeof meta.domainKey === "string"
          ? meta.domainKey
          : null;

      if (!domainKey) {
        fail(`Staged question ${moduleRecord.key}::${question.key} is missing meta.domainKey`);
      }

      if (question.SurveyQuestionCapability.length === 0) {
        fail(`Staged question ${moduleRecord.key}::${question.key} is missing persisted capability mappings`);
      }
    }
  }

  if (persistedQuestionCount !== 100) {
    fail(`Expected 100 persisted staged firm questions, found ${persistedQuestionCount}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        stagedModuleCount: modules.length,
        stagedDomainCount: STAGED_FIRM_DOMAINS.length,
        stagedQuestionCount: persistedQuestionCount,
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    console.error(
      "VERIFY_STAGED_FIRM_TAXONOMY_ERROR",
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
