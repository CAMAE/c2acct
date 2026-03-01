import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { randomUUID } from "crypto";

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

  const { submission, awardedBadgeIds } = await prisma.$transaction(async (tx) => {
    const createdSubmission = await tx.surveySubmission.create({
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

    const rules = await tx.badgeRule.findMany({
      where: {
        moduleId: module.id,
        required: true,
      },
    });

    const awardedBadgeIds: string[] = [];

    for (const rule of rules) {
      if (rule.minScore == null || createdSubmission.score >= rule.minScore) {
        await (tx.companyBadge as any).upsert({
          where: {
            companyId_badgeId: {
              companyId,
              badgeId: rule.badgeId,
            },
          },
          update: {
            moduleId: module.id,
            awardedAt: new Date(),
          },
          create: {
            id: randomUUID(),
            companyId,
            badgeId: rule.badgeId,
            moduleId: module.id,
            awardedAt: new Date(),
          },
        });
        awardedBadgeIds.push(rule.badgeId);
      }
    }

    return { submission: createdSubmission, awardedBadgeIds };
  });

  return NextResponse.json({ ok: true, submission, awardedBadgeIds, milestoneReached }, { status: 200 });
}
