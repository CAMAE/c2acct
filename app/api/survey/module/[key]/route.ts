import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildAssessmentModulePayload } from "@/lib/assessmentRuntime";
import { getSessionUser } from "@/lib/auth/session";
import { ensureFirmAlignmentSystem } from "@/lib/firmPat";
import {
  requiresCompanyBackedAssessment,
  resolveAssessmentSubjectContext,
} from "@/lib/subjectContext";
import { getSurveyDraftWhere, getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { USER_ALIGNMENT_MODULE_KEY, ensureUserAlignmentSystem } from "@/lib/userPat";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    if (key === USER_ALIGNMENT_MODULE_KEY) {
      await ensureUserAlignmentSystem();
    }
    if (key.startsWith("firm_alignment_")) {
      await ensureFirmAlignmentSystem();
    }

    const mod = await prisma.surveyModule.findUnique({
      where: { key },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        scope: true,
        version: true,
      },
    });

    if (!mod) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const questions = await prisma.surveyQuestion.findMany({
      where: { moduleId: mod.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        key: true,
        prompt: true,
        inputType: true,
        weight: true,
        order: true,
        required: true,
        meta: true,
        sectionId: true,
        SurveySection: {
          select: {
            id: true,
            key: true,
            title: true,
            description: true,
            order: true,
            utilityFamily: true,
            utilityKey: true,
            utilityLabel: true,
            subcategoryKey: true,
            subcategoryTitle: true,
            basisKey: true,
          },
        },
      },
    });

    const sections = await prisma.surveySection.findMany({
      where: { moduleId: mod.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        key: true,
        title: true,
        description: true,
        order: true,
        utilityFamily: true,
        utilityKey: true,
        utilityLabel: true,
        subcategoryKey: true,
        subcategoryTitle: true,
        basisKey: true,
      },
    });

    const payload = buildAssessmentModulePayload(mod, questions, sections);
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return NextResponse.json(payload);
    }

    const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
    if (!requiresCompanyBackedAssessment(assessmentContext)) {
      return NextResponse.json(payload);
    }

    const [draftSubmission, priorFinalSubmission] = await Promise.all([
      prisma.surveySubmission
        .findFirst({
          where: getSurveyDraftWhere({
            companyId: assessmentContext.companyId,
            subjectId: assessmentContext.subjectId,
            moduleId: mod.id,
          }),
          orderBy: { createdAt: "desc" },
          select: {
            answers: true,
            integrityFlags: true,
            createdAt: true,
          },
        })
        .catch(() => null),
      // 16d — the last FINAL submission, so a "what changed?" delta refresh can
      // pre-fill the form and the user only touches what moved.
      prisma.surveySubmission
        .findFirst({
          where: getSurveyFinalWhere({
            companyId: assessmentContext.companyId,
            subjectId: assessmentContext.subjectId,
            moduleId: mod.id,
          }),
          orderBy: { createdAt: "desc" },
          select: { answers: true, createdAt: true },
        })
        .catch(() => null),
    ]);

    return NextResponse.json({
      ...payload,
      draft: draftSubmission
        ? {
            answers:
              draftSubmission.answers && typeof draftSubmission.answers === "object"
                ? (draftSubmission.answers as Record<string, unknown>)
                : {},
            currentStep:
              typeof (draftSubmission.integrityFlags as { currentStep?: unknown } | null)?.currentStep === "number"
                ? ((draftSubmission.integrityFlags as { currentStep?: number }).currentStep ?? 1)
                : 1,
            updatedAt: draftSubmission.createdAt.toISOString(),
          }
        : null,
      priorFinal:
        priorFinalSubmission && priorFinalSubmission.answers && typeof priorFinalSubmission.answers === "object"
          ? {
              answers: priorFinalSubmission.answers as Record<string, unknown>,
              submittedAt: priorFinalSubmission.createdAt.toISOString(),
            }
          : null,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
