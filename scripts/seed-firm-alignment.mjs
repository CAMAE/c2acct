import { PrismaClient, ModuleScope, QuestionInputType } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

function pickEnumValue(enumObj, preferredKeys = []) {
  if (!enumObj || typeof enumObj !== "object") return null;
  for (const k of preferredKeys) {
    if (k in enumObj) return enumObj[k];
  }
  const vals = Object.values(enumObj);
  return vals.length ? vals[0] : null;
}

async function main() {
  const key = "firm_alignment_v1";
  const now = new Date();

  // Pick scope without guessing exact enum members
  const scope = pickEnumValue(ModuleScope, ["FIRM", "COMPANY", "ORG", "VENDOR", "INDIVIDUAL"]);
  if (!scope) throw new Error("ModuleScope enum has no values (cannot seed).");

  // Pick inputType without guessing exact enum members
  const inputType = pickEnumValue(QuestionInputType, ["SLIDER_1_5", "SCALE_1_5", "RANGE_1_5", "SLIDER", "SCALE"]);
  if (!inputType) throw new Error("QuestionInputType enum has no values (cannot seed).");

  // --- SurveyModule ---
  const moduleCreate = {
    id: randomUUID(),
    key,
    title: "Firm Alignment Survey",
    description: "Baseline alignment assessment.",
    scope,
    updatedAt: now,
  };

  const mod = await prisma.surveyModule.upsert({
    where: { key },
    update: {
      title: moduleCreate.title,
      description: moduleCreate.description,
      scope: moduleCreate.scope,
      updatedAt: now,
    },
    create: moduleCreate,
  });

  // --- SurveyQuestion (minimal set to unblock UI) ---
  const questions = [
    { key: "alignment_q1", prompt: "How clearly is your operating model documented?", order: 1 },
    { key: "alignment_q2", prompt: "How consistently do teams follow the documented process?", order: 2 },
    { key: "alignment_q3", prompt: "How effective is cross-functional communication?", order: 3 },
  ];

  for (const q of questions) {
    const existing = await prisma.surveyQuestion.findFirst({
      where: { moduleId: mod.id, key: q.key },
      select: { id: true },
    });

    if (existing) {
      await prisma.surveyQuestion.update({
        where: { id: existing.id },
        data: {
          prompt: q.prompt,
          order: q.order,
          inputType,
          updatedAt: now,
        },
      });
    } else {
      await prisma.surveyQuestion.create({
        data: {
          id: randomUUID(),
          moduleId: mod.id,
          key: q.key,
          prompt: q.prompt,
          inputType,
          order: q.order,
          updatedAt: now,
        },
      });
    }
  }

  const qCount = await prisma.surveyQuestion.count({ where: { moduleId: mod.id } });
  console.log("OK SEEDED", { moduleId: mod.id, key: mod.key, scope: mod.scope, inputType, questions: qCount });
}

main()
  .catch((e) => {
    console.error("SEED_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });