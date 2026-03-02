import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companyId = process.argv[2] ?? "demo_company";
  const moduleKey = process.argv[3] ?? "firm_alignment_v1";
  const baseUrl = process.argv[4] ?? "http://localhost:3001";

  const mod = await prisma.surveyModule.findUnique({ where: { key: moduleKey }, select: { id: true } });
  if (!mod) throw new Error(`Module not found: ${moduleKey}`);

  const qs = await prisma.surveyQuestion.findMany({
    where: { moduleId: mod.id },
    orderBy: { order: "asc" },
    select: { key: true },
    take: 5,
  });

  const answers = {};
  for (const q of qs) answers[q.key] = 5;

  const res = await fetch(`${baseUrl}/api/survey/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ companyId, moduleKey, answers }),
  });

  const txt = await res.text();
  console.log(txt);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
