import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { computeModuleMeasurement } from "@/lib/scoring/measurement";

export async function POST(req: Request) {
  const body: unknown = await req.json();

  if (
    !body ||
    typeof body !== "object" ||
    !("companyId" in body) ||
    !("moduleKey" in body) ||
    !("answers" in body)
  ) {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  const { companyId, moduleKey, answers: rawAnswers } =
    body as {
      companyId: unknown;
      moduleKey: unknown;
      answers: unknown;
    };

  if (
    typeof companyId !== "string" ||
    typeof moduleKey !== "string" ||
    !rawAnswers ||
    typeof rawAnswers !== "object" ||
    Array.isArray(rawAnswers)
  ) {
    return new NextResponse("Invalid payload shape", { status: 400 });
  }

  const answers: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawAnswers as Record<string, unknown>)) {
    if (typeof v === "number") answers[k] = v;
  }
  if (Object.keys(answers).length === 0) {
    return new NextResponse("No valid answers", { status: 400 });
  }

  const surveyModule = await prisma.surveyModule.findUnique({
    where: { key: moduleKey },
  });

  if (!surveyModule) {
    return new NextResponse("Module not found", { status: 404 });
  }

  const qs = await prisma.surveyQuestion.findMany({
    where: { moduleId: surveyModule.id },
    select: { key: true, weight: true },
  });

  const questions = qs.map((q) => ({
    key: q.key,
    weight: q.weight ?? 1,
  }));

  const measurement = computeModuleMeasurement({
    answers,
    questions,
    scaleMin: 0,
    scaleMax: 5,
  });

  // keep legacy field names expected elsewhere
  const score = Math.round(measurement.moduleScoreNormalized * 100);

  const submission = await prisma.surveySubmission.create({
    data: {
      id: randomUUID(),companyId,
      moduleId: surveyModule.id,
      answers: answers as unknown as Prisma.InputJsonValue,
      score,
      weightedAvg: measurement.weightedAvg,
      answeredCount: measurement.answeredCount,
      scaleMin: measurement.scaleMin,
      scaleMax: measurement.scaleMax,
      totalWeight: measurement.totalWeight,
      scoreVersion: 1,
    },
  });

  return NextResponse.json({ ok: true, submission });
}










