import { loadEnv, runWithPrisma } from "./_shared/prismaScript";

loadEnv();

const moduleKeys = [
  "firm_alignment_operating_model_v1",
  "firm_alignment_automation_ai_v1",
  "firm_alignment_data_flow_v1",
  "firm_alignment_governance_v1",
  "firm_alignment_strategy_v1",
];

async function main() {
  await runWithPrisma(async (prisma) => {
    const surveyModules = await prisma.surveyModule.findMany({
      where: { key: { in: moduleKeys } },
      select: { id: true, key: true },
      orderBy: { key: "asc" },
    });

    console.log("modules:", surveyModules);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
