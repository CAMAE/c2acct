import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { computeScore } from "@/lib/scoring";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import * as nodeCrypto from "crypto";

const SCORING_VERSION = 1;

const SubmitSchema = z.object({
  companyId: z.string().min(1).optional(),
  moduleKey: z.string().min(1),
  answers: z.record(z.string(), z.coerce.number()),
});

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  if (!sessionUser.companyId) {
    return forbiddenResponse("No company assigned");
  }

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
  const effectiveCompanyId = sessionUser.companyId;

  if (companyId && companyId !== effectiveCompanyId) {
    return forbiddenResponse("companyId mismatch");
  }

  const mod = await prisma.surveyModule.findFirst({
    where: { key: moduleKey },
  });

  if (!mod) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404 });
  }

  // TODO: derive scaleMin/scaleMax from module/question config (do not hardcode)
  const scoring = computeScore({ answers, scaleMin: 1, scaleMax: 5 });
  const milestoneReached = false;

  const submission = await prisma.surveySubmission.create({
    data: {
      id: nodeCrypto.randomUUID(),
      companyId: effectiveCompanyId,
      moduleId: mod.id,
      version: mod.version ?? 1,
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

  /*** BADGE AWARD (auto) ***/
  const rules = await prisma.badgeRule.findMany({
    where: { moduleId: submission.moduleId },
  });

  for (const r of rules) {
    const minScore = r.minScore ?? 0;
    if ((submission.score ?? 0) < minScore) continue;

    await prisma.companyBadge.upsert({
      where: {
        companyId_badgeId_moduleId: {
          companyId: submission.companyId,
          badgeId: r.badgeId,
          moduleId: submission.moduleId,
        },
      },
      create: {
        id: nodeCrypto.randomUUID(),
        companyId: submission.companyId,
        badgeId: r.badgeId,
        moduleId: submission.moduleId,
        awardedAt: new Date(),
      },
      update: {},
    });
  }
  /*** END BADGE AWARD ***/

  return NextResponse.json({ ok: true, submission, milestoneReached }, { status: 200 });
}
