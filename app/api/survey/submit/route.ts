import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";

const SCORING_VERSION = 1;

const SubmitSchema = z.object({
  companyId: z.string().min(1),
  moduleKey: z.string().min(1),
  answers: z.record(z.string(), z.coerce.number()),
});

export async function POST(req: Request) {
  let raw: unknown;

  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { companyId, moduleKey, answers } = parsed.data;

  const module = await prisma.surveyModule.findFirst({ where: { key: moduleKey } });
  if (!module) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404 });
  }

  const scoring = computeScore({ answers, scaleMin: 0, scaleMax: 5 });
  const milestoneReached = false;

  const submission = await prisma.surveySubmission.create({
    data: {
      id: randomUUID(),
      companyId,
      moduleId: module.id,
      version: module.version ?? 1,
      answers,
      score: scoring.score,
      weightedAvg: scoring.weightedAvg,
      scoreVersion: SCORING_VERSION,
      scaleMin: scoring.scaleMin,
      scaleMax: scoring.scaleMax,
      totalWeight: scoring.totalWeight,
      answeredCount: scoring.answeredCount,
    },
  });

  return NextResponse.json({ ok: true, submission, milestoneReached }, { status: 200 });
}

