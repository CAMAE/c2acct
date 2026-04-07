import {
  ModuleScope,
  SubjectKind,
  SubjectMembershipRole,
  type QuestionInputType,
  type UserRole,
} from "@prisma/client";
import { randomUUID } from "crypto";
import type { SessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  matchesPrismaMissingSchemaTarget,
  warnPrismaCompatibilityOnce,
} from "@/lib/prisma-compat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";

export const USER_TIER1_INSIGHT_DEFINITIONS = [
  {
    key: "user_tier1_work_fit",
    title: "Current work-fit view",
    description: "How the current role, tools, and workflow fit together in the user’s day-to-day work.",
  },
  {
    key: "user_tier1_adoption_signal",
    title: "Adoption and ease signal",
    description: "Where product use feels natural versus where daily friction still blocks value.",
  },
] as const;

export const USER_TIER2_INSIGHT_DEFINITIONS = [
  {
    key: "user_tier2_enablement_projection",
    title: "Projected enablement path",
    description: "Forward-looking PAT guidance on what support, sequencing, or training would improve alignment next.",
  },
  {
    key: "user_tier2_market_comparison",
    title: "Market-observed comparison",
    description: "A higher-order comparison layer for person-level intelligence once the deeper model is active.",
  },
] as const;

export type UserInsightDefinition =
  | ((typeof USER_TIER1_INSIGHT_DEFINITIONS)[number] & { tier: 1 })
  | ((typeof USER_TIER2_INSIGHT_DEFINITIONS)[number] & { tier: 2 });

export function getUserInsightDefinition(key: string): UserInsightDefinition | null {
  const tier1Insight = USER_TIER1_INSIGHT_DEFINITIONS.find((insight) => insight.key === key);
  if (tier1Insight) {
    return {
      ...tier1Insight,
      tier: 1,
    };
  }

  const tier2Insight = USER_TIER2_INSIGHT_DEFINITIONS.find((insight) => insight.key === key);
  if (tier2Insight) {
    return {
      ...tier2Insight,
      tier: 2,
    };
  }

  return null;
}

export const USER_ALIGNMENT_MODULE_KEY = "user_alignment_v1";
export const USER_ALIGNMENT_MODULE_TITLE = "User Alignment Assessment";

const USER_ALIGNMENT_QUESTION_STEMS = [
  "How clearly does your current role align with the way work actually moves day to day?",
  "How manageable is workflow friction in your current work?",
  "How clearly do the tools you use support the work you are expected to do?",
  "How easy is it to move work from one tool or step to the next without loss of context?",
  "How confident are you in the data you depend on in daily work?",
  "How well do your current tools fit your preferred working style?",
  "How manageable is training or onboarding when new tools or workflows are introduced?",
  "How easy is it to understand what good performance looks like in your current workflow?",
  "How much visibility do you have into status, blockers, and next steps?",
  "How effectively do your current tools reduce repetitive effort?",
  "How ready does your current workflow feel for responsible automation support?",
  "How ready does your current workflow feel for practical AI-assisted work?",
  "How easy is it to get help when something breaks or slows down your work?",
  "How much trust do you have in the reliability of the tools you depend on most?",
  "How easy is it to adapt when priorities or client needs change?",
  "How clearly can you see the value created by the tools and workflow around you?",
  "How well does the current operating model support consistency in your work?",
  "How much avoidable switching, re-entry, or duplicate effort remains in your workflow?",
  "How confident are you that the current setup supports stronger performance over time?",
  "How aligned does your current work environment feel with what PAT is trying to improve?",
] as const;

const USER_ALIGNMENT_SECTIONS = [
  {
    key: "user-alignment-current-fit",
    title: "Current fit and workflow clarity",
    description: "Role fit, workflow friction, tool fit, context flow, and data confidence.",
    startIndex: 0,
    endIndex: 4,
  },
  {
    key: "user-alignment-adoption",
    title: "Adoption and operating support",
    description: "Working-style fit, onboarding, status visibility, repetitive effort, and support readiness.",
    startIndex: 5,
    endIndex: 9,
  },
  {
    key: "user-alignment-automation",
    title: "Automation, reliability, and change",
    description: "Automation readiness, AI assistance, support, tool reliability, and change adaptation.",
    startIndex: 10,
    endIndex: 14,
  },
  {
    key: "user-alignment-value",
    title: "Value, consistency, and future readiness",
    description: "Value clarity, operating consistency, duplicate effort, longer-term confidence, and PAT alignment.",
    startIndex: 15,
    endIndex: 19,
  },
] as const;

export type UserPatContext = {
  userId: string;
  email: string | null;
  companyId: string | null;
  role: UserRole;
  personSubjectId: string | null;
  subjectMembershipReady: boolean;
  assessmentCount: number;
  latestScore: number | null;
  latestSubmittedAt: Date | null;
  compatibilityMode: "native" | "legacy-fallback";
};

export type UserAssessmentProgress = {
  moduleKey: string;
  title: string;
  description: string;
  questionCount: number;
  answeredCount: number;
  latestScore: number | null;
  latestSubmittedAt: Date | null;
  href: string;
  tier1Unlocked: boolean;
};

export type FirmManagedUserRecord = {
  id: string;
  email: string;
  role: UserRole;
  status: "invited" | "active";
  companyId: string | null;
  personSubjectId: string | null;
  subjectMembershipReady: boolean;
  assessmentCount: number;
  latestScore: number | null;
  latestSubmittedAt: Date | null;
  assessmentProgress: string;
};

export async function ensureUserPatScaffold() {
  const now = new Date();

  for (const insight of USER_TIER1_INSIGHT_DEFINITIONS) {
    await prisma.insight.upsert({
      where: { key: insight.key },
      update: {
        title: insight.title,
        body: insight.description,
        tier: 1,
        active: true,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: insight.key,
        title: insight.title,
        body: insight.description,
        tier: 1,
        active: true,
        updatedAt: now,
      },
    }).catch(() => null);
  }

  for (const insight of USER_TIER2_INSIGHT_DEFINITIONS) {
    await prisma.insight.upsert({
      where: { key: insight.key },
      update: {
        title: insight.title,
        body: insight.description,
        tier: 2,
        active: true,
        updatedAt: now,
      },
      create: {
        id: randomUUID(),
        key: insight.key,
        title: insight.title,
        body: insight.description,
        tier: 2,
        active: true,
        updatedAt: now,
      },
    }).catch(() => null);
  }
}

export async function ensureUserAlignmentSystem() {
  await ensureUserPatScaffold();

  const now = new Date();
  const moduleRecord = await prisma.surveyModule.upsert({
    where: { key: USER_ALIGNMENT_MODULE_KEY },
    update: {
      title: USER_ALIGNMENT_MODULE_TITLE,
      description: "Person-level PAT alignment intake using the existing survey submission pipeline.",
      scope: ModuleScope.ENTERPRISE,
      active: true,
      version: 1,
      weight: 1,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      key: USER_ALIGNMENT_MODULE_KEY,
      title: USER_ALIGNMENT_MODULE_TITLE,
      description: "Person-level PAT alignment intake using the existing survey submission pipeline.",
      scope: ModuleScope.ENTERPRISE,
      active: true,
      version: 1,
      weight: 1,
      updatedAt: now,
    },
    select: { id: true, key: true, title: true, description: true, version: true },
  });

  const persistedSections = await Promise.all(
    USER_ALIGNMENT_SECTIONS.map((section, index) =>
      prisma.surveySection.upsert({
        where: {
          moduleId_key: {
            moduleId: moduleRecord.id,
            key: section.key,
          },
        },
        update: {
          title: section.title,
          description: section.description,
          order: index + 1,
          updatedAt: now,
        },
        create: {
          id: randomUUID(),
          moduleId: moduleRecord.id,
          key: section.key,
          title: section.title,
          description: section.description,
          order: index + 1,
          updatedAt: now,
        },
        select: { id: true, key: true, title: true, description: true, order: true },
      })
    )
  );

  await prisma.surveySection.deleteMany({
    where: {
      moduleId: moduleRecord.id,
      key: { notIn: persistedSections.map((section) => section.key) },
    },
  });

  for (const [index, stem] of USER_ALIGNMENT_QUESTION_STEMS.entries()) {
    const questionKey = `user_alignment_q${index + 1}`;
    const existing = await prisma.surveyQuestion.findFirst({
      where: {
        moduleId: moduleRecord.id,
        key: questionKey,
      },
      select: { id: true },
    });

    const sectionDefinition = USER_ALIGNMENT_SECTIONS.find(
      (section) => index >= section.startIndex && index <= section.endIndex
    );
    const persistedSection = sectionDefinition
      ? persistedSections[USER_ALIGNMENT_SECTIONS.indexOf(sectionDefinition)]
      : null;

    const data = {
      prompt: stem,
      inputType: "SLIDER" as QuestionInputType,
      weight: 1,
      order: index + 1,
      required: true,
      sectionId: persistedSection?.id ?? null,
      meta: {
        section: {
          key: persistedSection?.key ?? "user-alignment",
          title: persistedSection?.title ?? "User alignment",
          description: persistedSection?.description ?? "Current-state person-level PAT alignment.",
          order: persistedSection?.order,
        },
        helpText: "Answer from your current reality, not the intended future state.",
        slider: {
          min: 0,
          max: 5,
          step: 1,
          labels: {
            "0": "Weak / misaligned",
            "5": "Strong / aligned",
          },
        },
      },
      updatedAt: now,
    };

    if (existing) {
      await prisma.surveyQuestion.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.surveyQuestion.create({
        data: {
          id: randomUUID(),
          moduleId: moduleRecord.id,
          key: questionKey,
          ...data,
        },
      });
    }
  }

  return moduleRecord;
}

async function ensurePersonSubjectMembership(input: {
  userId: string;
  email: string | null;
}) {
  const displayName = input.email ?? `User ${input.userId.slice(0, 8)}`;

  try {
    const subject = await prisma.subject.upsert({
      where: { key: `person:${input.userId}` },
      update: {
        displayName,
        kind: SubjectKind.PERSON,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        key: `person:${input.userId}`,
        displayName,
        kind: SubjectKind.PERSON,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.subjectMembership.upsert({
      where: {
        subjectId_userId: {
          subjectId: subject.id,
          userId: input.userId,
        },
      },
      update: {
        active: true,
        isPrimary: true,
        membershipRole: SubjectMembershipRole.MEMBER,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        subjectId: subject.id,
        userId: input.userId,
        active: true,
        isPrimary: true,
        membershipRole: SubjectMembershipRole.MEMBER,
        updatedAt: new Date(),
      },
    });

    return { subjectId: subject.id, compatibilityMode: "native" as const };
  } catch (error) {
    if (
      matchesPrismaMissingSchemaTarget(error, ["subject"]) ||
      matchesPrismaMissingSchemaTarget(error, ["subjectmembership"])
    ) {
      warnPrismaCompatibilityOnce(
        "user-pat-subject-fallback",
        "User PAT is running without subject-backed person records because Subject or SubjectMembership is missing locally. Apply local Prisma migrations to enable person-native PAT storage."
      );

      return { subjectId: null, compatibilityMode: "legacy-fallback" as const };
    }

    throw error;
  }
}

export async function getUserPatContext(sessionUser: SessionUser): Promise<UserPatContext> {
  await ensureUserPatScaffold();

  const membership = await ensurePersonSubjectMembership({
    userId: sessionUser.id,
    email: sessionUser.email,
  });

  if (!membership.subjectId) {
    return {
      userId: sessionUser.id,
      email: sessionUser.email,
      companyId: sessionUser.companyId,
      role: sessionUser.role,
      personSubjectId: null,
      subjectMembershipReady: false,
      assessmentCount: 0,
      latestScore: null,
      latestSubmittedAt: null,
      compatibilityMode: membership.compatibilityMode,
    };
  }

  const submissions = await prisma.surveySubmission.findMany({
    where: getSurveyFinalWhere({ subjectId: membership.subjectId }),
    orderBy: { createdAt: "desc" },
    select: {
      score: true,
      createdAt: true,
    },
  }).catch(() => []);

  return {
    userId: sessionUser.id,
    email: sessionUser.email,
    companyId: sessionUser.companyId,
    role: sessionUser.role,
    personSubjectId: membership.subjectId,
    subjectMembershipReady: true,
    assessmentCount: submissions.length,
    latestScore: submissions[0]?.score ?? null,
    latestSubmittedAt: submissions[0]?.createdAt ?? null,
    compatibilityMode: membership.compatibilityMode,
  };
}

export async function getUserAlignmentProgress(sessionUser: SessionUser): Promise<UserAssessmentProgress> {
  const [moduleRecord, userContext] = await Promise.all([
    ensureUserAlignmentSystem(),
    getUserPatContext(sessionUser),
  ]);

  const questionCount = USER_ALIGNMENT_QUESTION_STEMS.length;

  if (!userContext.personSubjectId) {
    return {
      moduleKey: USER_ALIGNMENT_MODULE_KEY,
      title: USER_ALIGNMENT_MODULE_TITLE,
      description: "Live person-level PAT alignment intake using the existing survey flow.",
      questionCount,
      answeredCount: 0,
      latestScore: null,
      latestSubmittedAt: null,
      href: `/survey/${USER_ALIGNMENT_MODULE_KEY}`,
      tier1Unlocked: false,
    };
  }

  const latestSubmission = await prisma.surveySubmission.findFirst({
    where: getSurveyFinalWhere({
      subjectId: userContext.personSubjectId,
      moduleId: moduleRecord.id,
    }),
    orderBy: { createdAt: "desc" },
    select: {
      score: true,
      answeredCount: true,
      createdAt: true,
    },
  }).catch(() => null);

  return {
    moduleKey: USER_ALIGNMENT_MODULE_KEY,
    title: USER_ALIGNMENT_MODULE_TITLE,
    description: "Live person-level PAT alignment intake using the existing survey flow.",
    questionCount,
    answeredCount: latestSubmission?.answeredCount ?? 0,
    latestScore: latestSubmission?.score ?? null,
    latestSubmittedAt: latestSubmission?.createdAt ?? null,
    href: `/survey/${USER_ALIGNMENT_MODULE_KEY}`,
    tier1Unlocked: Boolean(latestSubmission),
  };
}

export async function getFirmManagedUserRecords(companyId: string, search: string | null) {
  const users = await prisma.user.findMany({
    where: {
      companyId,
      ...(search
        ? {
            email: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
    },
  });

  let memberships: Array<{ userId: string; subjectId: string }> = [];
  try {
    memberships = await prisma.subjectMembership.findMany({
      where: {
        userId: { in: users.map((user) => user.id) },
        active: true,
        isPrimary: true,
        Subject: { kind: SubjectKind.PERSON },
      },
      select: {
        userId: true,
        subjectId: true,
      },
    });
  } catch (error) {
    if (matchesPrismaMissingSchemaTarget(error, ["subjectmembership"])) {
      warnPrismaCompatibilityOnce(
        "firm-user-insight-subject-fallback",
        "Firm user insight is omitting subject-backed user progress because SubjectMembership is missing locally."
      );
    } else {
      throw error;
    }
  }

  const subjectIds = memberships.map((membership) => membership.subjectId);
  const submissions = subjectIds.length
    ? await prisma.surveySubmission.findMany({
        where: getSurveyFinalWhere({ subjectId: { in: subjectIds } }),
        orderBy: { createdAt: "desc" },
        select: {
          subjectId: true,
          score: true,
          createdAt: true,
        },
      }).catch(() => [])
    : [];

  const subjectIdByUserId = new Map(memberships.map((membership) => [membership.userId, membership.subjectId]));

  return users.map((user) => {
    const subjectId = subjectIdByUserId.get(user.id) ?? null;
    const userSubmissions = subjectId
      ? submissions.filter((submission) => submission.subjectId === subjectId)
      : [];
    const latestSubmission = userSubmissions[0] ?? null;
    const assessmentProgress =
      !subjectId
        ? "Person PAT subject not provisioned yet"
        : userSubmissions.length === 0
          ? "No person-level PAT submissions yet"
          : `${userSubmissions.length} submission${userSubmissions.length === 1 ? "" : "s"} · latest ${latestSubmission?.score ?? "--"}%`;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.name ? "active" : "invited",
      companyId: user.companyId,
      personSubjectId: subjectId,
      subjectMembershipReady: Boolean(subjectId),
      assessmentCount: userSubmissions.length,
      latestScore: latestSubmission?.score ?? null,
      latestSubmittedAt: latestSubmission?.createdAt ?? null,
      assessmentProgress,
    } satisfies FirmManagedUserRecord;
  });
}
