import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import {
  ACTIVATED_BETA_FIRM_MODULE_KEY,
  getAssessmentModuleCatalogEntry,
  isExplicitRuntimeReportableModule,
  listRuntimeSurveyModules,
} from "../lib/assessment-module-catalog";
import { getReportProfile } from "../lib/report-profiles";
import { LAUNCH_MODULES } from "../lib/launch-config";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const firmSurveyModules = listRuntimeSurveyModules("FIRM");
  const productSurveyModules = listRuntimeSurveyModules("PRODUCT");

  if (firmSurveyModules.length !== 2) {
    fail(`Expected 2 runtime firm survey modules, found ${firmSurveyModules.length}`);
  }

  if (!firmSurveyModules.some((module) => module.key === LAUNCH_MODULES.firm.key)) {
    fail("Baseline firm module is missing from runtime survey availability");
  }

  if (!firmSurveyModules.some((module) => module.key === ACTIVATED_BETA_FIRM_MODULE_KEY)) {
    fail("Activated beta firm module is missing from runtime survey availability");
  }

  const betaEntry = getAssessmentModuleCatalogEntry(ACTIVATED_BETA_FIRM_MODULE_KEY);
  if (!betaEntry || betaEntry.activationState !== "BETA" || !betaEntry.isUserFacing) {
    fail("Activated beta firm module is not marked BETA + user-facing");
  }

  if (!isExplicitRuntimeReportableModule(betaEntry)) {
    fail("Activated beta firm module is not available for explicit reporting reads");
  }

  if (productSurveyModules.length !== 1 || productSurveyModules[0]?.key !== LAUNCH_MODULES.product.key) {
    fail("Runtime product survey availability drifted from the canonical single product module");
  }

  const baselineReport = getReportProfile("firm_baseline_report");
  if (!baselineReport || baselineReport.primaryModuleKey !== LAUNCH_MODULES.firm.key) {
    fail("Default firm baseline report is no longer pinned to firm_alignment_v1");
  }

  const persistedModules = await prisma.surveyModule.findMany({
    where: {
      key: {
        in: [LAUNCH_MODULES.firm.key, ACTIVATED_BETA_FIRM_MODULE_KEY],
      },
    },
    select: {
      key: true,
      active: true,
    },
  });

  const persistedByKey = new Map(persistedModules.map((module) => [module.key, module]));
  if (!persistedByKey.get(LAUNCH_MODULES.firm.key)?.active) {
    fail("Baseline firm module is not active in persisted runtime data");
  }
  if (!persistedByKey.get(ACTIVATED_BETA_FIRM_MODULE_KEY)?.active) {
    fail("Activated beta firm module is not active in persisted runtime data");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        firmSurveyModuleKeys: firmSurveyModules.map((module) => module.key),
        productSurveyModuleKeys: productSurveyModules.map((module) => module.key),
        baselineReportPrimaryModuleKey: baselineReport.primaryModuleKey,
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    console.error(
      "VERIFY_BETA_FIRM_MODULE_ACTIVATION_ERROR",
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
