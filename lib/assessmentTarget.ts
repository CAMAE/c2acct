import type { SessionUser } from "@/lib/auth/session";

export type AssessmentAuthorityType = "COMPANY";

export type AssessmentContext = {
  authorityType: AssessmentAuthorityType;
  companyId: string;
  targetProductId: null;
};

export function resolveAssessmentContextFromSessionUser(
  sessionUser: Pick<SessionUser, "companyId"> | null | undefined
): AssessmentContext | null {
  const companyId = typeof sessionUser?.companyId === "string" ? sessionUser.companyId.trim() : "";
  if (!companyId) {
    return null;
  }

  return {
    authorityType: "COMPANY",
    companyId,
    targetProductId: null,
  };
}

export const resolveAssessmentReadContextFromSessionUser = resolveAssessmentContextFromSessionUser;
export const resolveAssessmentSubmitContextFromSessionUser = resolveAssessmentContextFromSessionUser;
