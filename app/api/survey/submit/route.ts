import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { computeModuleMeasurement } from "@/lib/scoring/measurement";

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export async function POST(req: Request) {
  const body: unknown = await req.json();

  if (!body || typeof body !== "object" || !("companyId" in body) || !("moduleKey" in body) || !("answers" in body)) {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  const { companyId, moduleKey, answers: rawAnswers } =
    body as { companyId: unknown; moduleKey: unknown; answers: unknown };

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
    if (typeof v === "number" && Number.isFinite(v)) answers[k] = v;
  }
  if (Object.keys(answers).length === 0) {
    return new NextResponse("No valid answers", { status: 400 });
  }

  const surveyModule = await prisma.surveyModule.findUnique({ where: { key: moduleKey } });
  if (!surveyModule) return new NextResponse("Module not found", { status: 404 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return new NextResponse("Company not found", { status: 404 });

  const qs = await prisma.surveyQuestion.findMany({
    where: { moduleId: surveyModule.id },
    select: {
      id: true,
      key: true,
      weight: true,
      order: true,
      SurveyQuestionCapability: { select: { nodeId: true, weight: true } },
    },
    orderBy: { order: "asc" },
  });

  const questionsForMeasurement = qs.map((q) => ({ key: q.key, weight: q.weight ?? 1 }));

  const measurement = computeModuleMeasurement({
    answers,
    questions: questionsForMeasurement,
    scaleMin: 0,
    scaleMax: 5,
  });

  const score = Math.round(measurement.moduleScoreNormalized * 100);

  const scaleMin = 0;
  const scaleMax = 5;
  const denomScale = scaleMax - scaleMin;

  const mc = await prisma.moduleCapability.findMany({
    where: { moduleId: surveyModule.id },
    select: { nodeId: true, weight: true },
  });
  const moduleNodeWeight: Record<string, number> = {};
  for (const row of mc) moduleNodeWeight[row.nodeId] = row.weight ?? 1;

  const nodeAgg: Record<string, { num: number; den: number }> = {};

  for (const q of qs) {
    const a = answers[q.key];
    if (typeof a !== "number") continue;

    const qWeight = q.weight ?? 1;
    const normalized = denomScale === 0 ? 0 : clamp01((a - scaleMin) / denomScale);

    const links = q.SurveyQuestionCapability ?? [];
    for (const l of links) {
      const w = (l.weight ?? 1) * qWeight;
      if (!nodeAgg[l.nodeId]) nodeAgg[l.nodeId] = { num: 0, den: 0 };
      nodeAgg[l.nodeId]!.num += normalized * w;
      nodeAgg[l.nodeId]!.den += w;
    }
  }

  const computedAt = new Date();

  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.surveySubmission.create({
      data: {
        id: randomUUID(),
        companyId,
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

    const upserts = Object.entries(nodeAgg).map(([nodeId, agg]) => {
      const baseNodeScore = agg.den > 0 ? agg.num / agg.den : 0;
      const wMod = moduleNodeWeight[nodeId] ?? 1;

      // clamp base only; allow module weighting to boost or reduce without hard cap
      const nodeScore = clamp01(baseNodeScore) * wMod;

      return tx.companyCapabilityScore.upsert({
        where: { companyId_nodeId_scoreVersion: { companyId, nodeId, scoreVersion: 1 } },
        update: { score: nodeScore, computedAt },
        create: { id: randomUUID(), companyId, nodeId, score: nodeScore, scoreVersion: 1, computedAt },
      });
    });

    if (upserts.length > 0) await Promise.all(upserts);
    return created;
  });

  return NextResponse.json({
    ok: true,
    submission,
    capabilityNodesWritten: Object.keys(nodeAgg).length,
  });
}
