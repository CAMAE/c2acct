import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const moduleKey = process.argv[2] ?? "firm_alignment_v1";

  const mod = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
    select: { id: true, key: true, title: true },
  });
  if (!mod) throw new Error(`Module not found: ${moduleKey}`);

  const qs = await prisma.surveyQuestion.findMany({
    where: { moduleId: mod.id },
    orderBy: { order: "asc" },
    select: {
      id: true,
      key: true,
      prompt: true,
      weight: true,
      order: true,
      SurveyQuestionCapability: {
        select: {
          nodeId: true,
          weight: true,
          CapabilityNode: { select: { key: true, title: true } },
        },
      },
    },
  });

  console.log(JSON.stringify({ module: mod, questionCount: qs.length, questions: qs }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
