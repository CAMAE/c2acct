import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { LAUNCH_MODULES } from "../lib/launch-config";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const firmModule = await prisma.surveyModule.findUnique({
    where: { key: LAUNCH_MODULES.firm.key },
    select: { id: true },
  });
  const productModule = await prisma.surveyModule.findUnique({
    where: { key: LAUNCH_MODULES.product.key },
    select: { id: true },
  });

  if (!firmModule || !productModule) {
    fail("Canonical modules missing");
  }

  const rows = await prisma.companyCapabilityScore.findMany({
    where: {
      moduleId: { in: [firmModule.id, productModule.id] },
    },
    select: {
      id: true,
      companyId: true,
      productId: true,
      moduleId: true,
      nodeId: true,
      sourceType: true,
      surveySubmissionId: true,
      externalObservedSignalRollupId: true,
      scoreVersion: true,
    },
    take: 20,
  });

  for (const row of rows) {
    if (row.sourceType === "SELF_SUBMISSION" && !row.surveySubmissionId) {
      fail(`Capability score ${row.id} is SELF_SUBMISSION without surveySubmissionId`);
    }
    if (row.sourceType === "EXTERNAL_REVIEW_ROLLUP" && !row.externalObservedSignalRollupId) {
      fail(`Capability score ${row.id} is EXTERNAL_REVIEW_ROLLUP without externalObservedSignalRollupId`);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedRowCount: rows.length,
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    console.error(
      "VERIFY_CAPABILITY_SCORE_STORAGE_ERROR",
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
