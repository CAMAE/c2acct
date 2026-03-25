import type { SubjectKind } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";

export type AssessmentSubjectAccessMode =
  | "subject-membership"
  | "company-subject"
  | "legacy-company";

export type AssessmentSubjectContext = {
  companyId: string | null;
  subjectId: string | null;
  subjectKind: SubjectKind | null;
  accessMode: AssessmentSubjectAccessMode;
};

export async function resolveAssessmentSubjectContext(
  sessionUser: SessionUser
): Promise<AssessmentSubjectContext | null> {
  const membership = await prisma.subjectMembership.findFirst({
    where: {
      userId: sessionUser.id,
      active: true,
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    select: {
      subjectId: true,
      Subject: {
        select: {
          id: true,
          kind: true,
          companyId: true,
        },
      },
    },
  });

  if (membership?.Subject) {
    return {
      companyId: membership.Subject.companyId,
      subjectId: membership.Subject.id,
      subjectKind: membership.Subject.kind,
      accessMode: "subject-membership",
    };
  }

  if (sessionUser.companyId) {
    const subject = await prisma.subject.findUnique({
      where: { companyId: sessionUser.companyId },
      select: { id: true, kind: true, companyId: true },
    });

    if (subject) {
      return {
        companyId: subject.companyId,
        subjectId: subject.id,
        subjectKind: subject.kind,
        accessMode: "company-subject",
      };
    }

    return {
      companyId: sessionUser.companyId,
      subjectId: null,
      subjectKind: null,
      accessMode: "legacy-company",
    };
  }

  return null;
}

export function requiresCompanyBackedAssessment(
  context: AssessmentSubjectContext | null
): context is AssessmentSubjectContext & { companyId: string } {
  return Boolean(context?.companyId);
}
