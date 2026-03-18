import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { resolveVisibilityContext } from "@/lib/visibility";
import {
  deriveLearningSummary,
  getStoredLearningState,
  listLearningStateForCompany,
  markReadingComplete,
  recordFinalAttempt,
  recordQuizAttempt,
} from "@/lib/userLearning/progressStore";
import { getFinalTest, getLearningModule, getLearningModules, getQuizByKey } from "@/lib/userLearning/content";
import { gradeLearningAssessment } from "@/lib/userLearning/grading";
import { canInspectCompanyLearning } from "@/lib/userLearning/access";
import type { CompanyType, UserRole } from "@prisma/client";

export const LEARNING_NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function resolveLearningViewer(requestUrl?: URL) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  const preferredCompanyId = await resolvePreferredViewerCompanyId(requestUrl?.searchParams);
  const visibilityContext = await resolveVisibilityContext({
    sessionUser,
    preferredCompanyId,
  });

  if (!visibilityContext?.currentCompany) {
    return { ok: false as const, status: 403, error: "No company assigned" };
  }

  return {
    ok: true as const,
    sessionUser,
    visibilityContext,
  };
}

export async function getOwnLearningSnapshot(userId: string, companyId: string) {
  const stored = await getStoredLearningState(userId, companyId);
  return {
    stored,
    summary: deriveLearningSummary(stored),
    modules: getLearningModules(),
    finalTest: getFinalTest(),
  };
}

export async function getCompanyLearningRoster(companyId: string) {
  const [memberships, storedStates] = await Promise.all([
    prisma.companyMembership.findMany({
      where: { companyId, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        User: {
          select: { id: true, email: true, name: true, role: true, platformRole: true },
        },
      },
    }),
    listLearningStateForCompany(companyId),
  ]);

  return memberships.map((membership) => {
    const state =
      storedStates.find((entry) => entry.userId === membership.User.id) ?? {
        userId: membership.User.id,
        companyId,
        updatedAt: new Date(0).toISOString(),
        modules: {},
        finalTest: { attempts: [] },
      };

    return {
      user: membership.User,
      membershipRole: membership.role,
      summary: deriveLearningSummary(state),
      updatedAt: state.updatedAt,
    };
  });
}

export async function authorizeLearningSubject(options: {
  viewerUserId: string;
  viewerRole: UserRole;
  viewerPlatformRole: any;
  currentCompanyId: string;
  currentCompanyType: CompanyType;
  targetUserId: string;
  targetCompanyId: string;
}) {
  const targetMemberships = await prisma.companyMembership.findMany({
    where: { userId: options.targetUserId, status: "ACTIVE" },
    select: { companyId: true },
  });

  return canInspectCompanyLearning({
    viewerUserId: options.viewerUserId,
    viewerRole: options.viewerRole,
    viewerPlatformRole: options.viewerPlatformRole,
    currentCompanyId: options.currentCompanyId,
    currentCompanyType: options.currentCompanyType,
    targetUserId: options.targetUserId,
    targetCompanyId: options.targetCompanyId,
    targetUserCompanyIds: targetMemberships.map((membership) => membership.companyId),
  });
}

export async function completeLearningReading(userId: string, companyId: string, moduleKey: string) {
  const learningModule = getLearningModule(moduleKey);
  if (!learningModule) {
    return { ok: false as const, status: 404, error: "Module not found" };
  }

  const state = await markReadingComplete(userId, companyId, moduleKey);
  return {
    ok: true as const,
    summary: deriveLearningSummary(state),
  };
}

export async function submitLearningGrade(input: {
  userId: string;
  companyId: string;
  assessmentKind: "QUIZ" | "FINAL";
  assessmentKey: string;
  responses: Record<string, string>;
}) {
  const stored = await getStoredLearningState(input.userId, input.companyId);
  const summary = deriveLearningSummary(stored);

  if (input.assessmentKind === "QUIZ") {
    const quiz = getQuizByKey(input.assessmentKey);
    if (!quiz) {
      return { ok: false as const, status: 404, error: "Quiz not found" };
    }

    const moduleProgress = summary.modules.find((module) => module.quizKey === input.assessmentKey);
    if (!moduleProgress?.unlocked) {
      return { ok: false as const, status: 403, error: "Quiz is not unlocked" };
    }

    if (!moduleProgress.readingCompleted) {
      return { ok: false as const, status: 400, error: "Reading must be completed before grading this quiz" };
    }

    const graded = gradeLearningAssessment(quiz, input.responses);
    const attempt = {
      assessmentKey: input.assessmentKey,
      scorePercent: graded.scorePercent,
      passed: graded.passed,
      submittedAt: new Date().toISOString(),
      responses: input.responses,
    };
    const nextState = await recordQuizAttempt(input.userId, input.companyId, quiz.moduleKey, attempt);
    return {
      ok: true as const,
      assessmentTitle: quiz.title,
      graded,
      summary: deriveLearningSummary(nextState),
    };
  }

  if (!summary.finalUnlocked) {
    return { ok: false as const, status: 403, error: "Final test is not unlocked" };
  }

  const finalTest = getFinalTest();
  const graded = gradeLearningAssessment(finalTest, input.responses);
  const attempt = {
    assessmentKey: input.assessmentKey,
    scorePercent: graded.scorePercent,
    passed: graded.passed,
    submittedAt: new Date().toISOString(),
    responses: input.responses,
  };
  const nextState = await recordFinalAttempt(input.userId, input.companyId, attempt);
  return {
    ok: true as const,
    assessmentTitle: finalTest.title,
    graded,
    summary: deriveLearningSummary(nextState),
  };
}
