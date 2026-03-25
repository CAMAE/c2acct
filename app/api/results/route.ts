import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  requiresCompanyBackedAssessment,
  resolveAssessmentSubjectContext,
} from "@/lib/subjectContext";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
  if (!requiresCompanyBackedAssessment(assessmentContext)) {
    return forbiddenResponse("Current assessment flow requires a company-backed subject");
  }

  try {
    const submissionWhere = assessmentContext.subjectId
      ? { subjectId: assessmentContext.subjectId }
      : { companyId: assessmentContext.companyId };

    const [recentSubmissions, submissionCount, badgeCount, unlockedInsights] = await Promise.all([
      prisma.surveySubmission.findMany({
        where: submissionWhere,
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          SurveyModule: {
            select: {
              key: true,
              title: true,
            },
          },
        },
      }),
      prisma.surveySubmission.count({
        where: submissionWhere,
      }),
      prisma.companyBadge.count({
        where: submissionWhere,
      }),
      evaluateUnlocked({
        companyId: assessmentContext.companyId,
        subjectId: assessmentContext.subjectId,
      }),
    ]);

    const latestSubmission = recentSubmissions[0] ?? null;
    const result = latestSubmission
      ? {
          ...latestSubmission,
          moduleKey: latestSubmission.SurveyModule?.key ?? null,
          moduleTitle: latestSubmission.SurveyModule?.title ?? null,
        }
      : null;

    const history = recentSubmissions.map((submission) => ({
      id: submission.id,
      createdAt: submission.createdAt,
      score: submission.score,
      weightedAvg: submission.weightedAvg,
      signalIntegrityScore: submission.signalIntegrityScore,
      answeredCount: submission.answeredCount,
      moduleId: submission.moduleId,
      moduleKey: submission.SurveyModule?.key ?? submission.moduleId,
      moduleTitle: submission.SurveyModule?.title ?? "Assessment module",
    }));

    return NextResponse.json(
      {
        ok: true,
        result,
        history,
        summary: {
          submissionCount,
          badgeCount,
          unlockedInsightCount: unlockedInsights.length,
          latestSubmittedAt: latestSubmission?.createdAt ?? null,
        },
        unlockedInsights,
        scope: assessmentContext,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load results" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
