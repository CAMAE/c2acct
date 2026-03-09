import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { PrismaClient, ModuleScope, QuestionInputType } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const MODULE_KEY = "vendor_product_fit_v1";
const PRODUCT_SCOPE = ModuleScope.PRODUCT;
const SLIDER_INPUT = QuestionInputType.SLIDER;

const PRODUCT_TEST_QUESTIONS = [
  {
    key: "product_fit_q1",
    prompt: "How clearly does this product solve a priority workflow?",
    order: 1,
  },
  {
    key: "product_fit_q2",
    prompt: "How quickly can your team realize value after onboarding?",
    order: 2,
  },
  {
    key: "product_fit_q3",
    prompt: "How well does this product integrate with your current stack?",
    order: 3,
  },
  {
    key: "product_fit_q4",
    prompt: "How confident are you in ongoing vendor support quality?",
    order: 4,
  },
];

async function ensureProductModule() {
  const now = new Date();
  const moduleRecord = await prisma.surveyModule.upsert({
    where: { key: MODULE_KEY },
    update: {
      title: "Vendor Product Fit Survey",
      description: "Local-only PRODUCT submit validation module.",
      scope: PRODUCT_SCOPE,
      active: true,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      key: MODULE_KEY,
      title: "Vendor Product Fit Survey",
      description: "Local-only PRODUCT submit validation module.",
      scope: PRODUCT_SCOPE,
      version: 1,
      active: true,
      updatedAt: now,
    },
    select: {
      id: true,
      key: true,
      scope: true,
      version: true,
      active: true,
    },
  });

  if (moduleRecord.version < 1) {
    return prisma.surveyModule.update({
      where: { id: moduleRecord.id },
      data: { version: 1, active: true, updatedAt: now },
      select: {
        id: true,
        key: true,
        scope: true,
        version: true,
        active: true,
      },
    });
  }

  return moduleRecord;
}

async function ensureProductQuestions(moduleId) {
  const now = new Date();
  const seededQuestionIds = [];

  for (const question of PRODUCT_TEST_QUESTIONS) {
    const existing = await prisma.surveyQuestion.findFirst({
      where: {
        moduleId,
        key: question.key,
      },
      select: { id: true },
    });

    if (existing) {
      const updated = await prisma.surveyQuestion.update({
        where: { id: existing.id },
        data: {
          prompt: question.prompt,
          order: question.order,
          inputType: SLIDER_INPUT,
          required: true,
          weight: 1,
          updatedAt: now,
        },
        select: { id: true },
      });
      seededQuestionIds.push(updated.id);
      continue;
    }

    const created = await prisma.surveyQuestion.create({
      data: {
        id: randomUUID(),
        moduleId,
        key: question.key,
        prompt: question.prompt,
        inputType: SLIDER_INPUT,
        order: question.order,
        required: true,
        weight: 1,
        updatedAt: now,
      },
      select: { id: true },
    });

    seededQuestionIds.push(created.id);
  }

  return seededQuestionIds;
}

async function main() {
  const moduleRecord = await ensureProductModule();
  const questionIds = await ensureProductQuestions(moduleRecord.id);

  console.log("SEED_PRODUCT_MODULE_TEST_OK", {
    module: {
      id: moduleRecord.id,
      key: moduleRecord.key,
      scope: moduleRecord.scope,
      version: moduleRecord.version,
      active: moduleRecord.active,
    },
    questionIds,
  });
}

main()
  .catch((e) => {
    console.error("SEED_PRODUCT_MODULE_TEST_ERROR", e?.message ?? e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
