import type { SubjectKind } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  isPrismaMissingSchemaError,
  matchesPrismaMissingSchemaTarget,
  warnPrismaCompatibilityOnce,
} from "@/lib/prisma-compat";
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
  // This flag is a launch-phase compatibility marker, not a statement that
  // subject-native routing has fully replaced company-rooted scope everywhere.
  compatibilityMode?: "native" | "legacy-fallback";
  compatibilityReason?:
    | "subject-membership-missing"
    | "subject-table-missing"
    | null;
};

async function findSubjectMembership(sessionUser: SessionUser) {
  try {
    return await prisma.subjectMembership.findFirst({
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
  } catch (error) {
    if (matchesPrismaMissingSchemaTarget(error, ["subjectmembership"])) {
      warnPrismaCompatibilityOnce(
        "subject-membership-missing",
        "SubjectMembership is missing in the local database. Falling back to the legacy company-backed PAT context. Apply local Prisma migrations to enable subject-aware routing."
      );
      return null;
    }

    throw error;
  }
}

async function findCompanySubject(companyId: string) {
  try {
    return await prisma.subject.findUnique({
      where: { companyId },
      select: { id: true, kind: true, companyId: true },
    });
  } catch (error) {
    if (matchesPrismaMissingSchemaTarget(error, ["subject"])) {
      warnPrismaCompatibilityOnce(
        "subject-table-missing",
        "Subject is missing in the local database. PAT is staying on the legacy company-backed compatibility path until local Prisma migrations are applied."
      );
      return null;
    }

    throw error;
  }
}

export async function resolveAssessmentSubjectContext(
  sessionUser: SessionUser
): Promise<AssessmentSubjectContext | null> {
  let compatibilityReason: AssessmentSubjectContext["compatibilityReason"] = null;
  const membership = await findSubjectMembership(sessionUser);
  if (!membership) {
    compatibilityReason = "subject-membership-missing";
  }

  if (membership?.Subject) {
    return {
      companyId: membership.Subject.companyId,
      subjectId: membership.Subject.id,
      subjectKind: membership.Subject.kind,
      accessMode: "subject-membership",
      compatibilityMode: "native",
      compatibilityReason: null,
    };
  }

  if (sessionUser.companyId) {
    const subject = await findCompanySubject(sessionUser.companyId);

    if (subject) {
      return {
        companyId: subject.companyId,
        subjectId: subject.id,
        subjectKind: subject.kind,
        accessMode: "company-subject",
        compatibilityMode: compatibilityReason ? "legacy-fallback" : "native",
        compatibilityReason,
      };
    }

    return {
      companyId: sessionUser.companyId,
      subjectId: null,
      subjectKind: null,
      accessMode: "legacy-company",
      compatibilityMode: compatibilityReason ? "legacy-fallback" : "native",
      compatibilityReason,
    };
  }

  return null;
}

export function requiresCompanyBackedAssessment(
  context: AssessmentSubjectContext | null
): context is AssessmentSubjectContext & { companyId: string } {
  return Boolean(context?.companyId);
}

export async function withCompanyScopeFallback<T>(
  context: AssessmentSubjectContext & { companyId: string },
  options: {
    label: string;
    run: (where: { subjectId: string } | { companyId: string }) => Promise<T>;
  }
): Promise<{ value: T; usedLegacyCompanyScope: boolean }> {
  if (!context.subjectId) {
    return {
      value: await options.run({ companyId: context.companyId }),
      usedLegacyCompanyScope: true,
    };
  }

  try {
    return {
      value: await options.run({ subjectId: context.subjectId }),
      usedLegacyCompanyScope: false,
    };
  } catch (error) {
    // Older local databases can be missing the newer subjectId column even when
    // the runtime now prefers subject-aware scope. In that case, keep the app
    // operational by falling back to the legacy company-backed filter.
    if (isPrismaMissingSchemaError(error)) {
      warnPrismaCompatibilityOnce(
        `scope-fallback:${options.label}`,
        `${options.label} is using the legacy company-backed compatibility scope because the local database is missing newer subject-layer schema. Apply local Prisma migrations to enable subject-aware PAT behavior.`
      );

      return {
        value: await options.run({ companyId: context.companyId }),
        usedLegacyCompanyScope: true,
      };
    }

    throw error;
  }
}
