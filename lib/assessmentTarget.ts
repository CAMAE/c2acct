import type { SessionUser } from "@/lib/auth/session";
import type { ModuleScope } from "@prisma/client";
import prisma from "@/lib/prisma";

export type AssessmentAuthorityType = "COMPANY";

export type AssessmentContext = {
  authorityType: AssessmentAuthorityType;
  companyId: string;
  targetProductId: string | null;
};

export type AssessmentSubmitResolutionInput = {
  sessionUser: Pick<SessionUser, "companyId"> | null | undefined;
  moduleScope: ModuleScope;
  targetProductId?: string | null;
};

export type AssessmentSubmitResolutionResult =
  | {
      ok: true;
      context: AssessmentContext;
    }
  | {
      ok: false;
      status: 400 | 403;
      error: string;
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

export async function resolveAssessmentSubmitContextFromSessionUser({
  sessionUser,
  moduleScope,
  targetProductId,
}: AssessmentSubmitResolutionInput): Promise<AssessmentSubmitResolutionResult> {
  const baseContext = resolveAssessmentContextFromSessionUser(sessionUser);
  if (!baseContext) {
    return {
      ok: false,
      status: 403,
      error: "No company assigned",
    };
  }

  if (moduleScope !== "PRODUCT") {
    return {
      ok: true,
      context: baseContext,
    };
  }

  const normalizedTargetProductId =
    typeof targetProductId === "string" ? targetProductId.trim() : "";

  if (!normalizedTargetProductId) {
    return {
      ok: false,
      status: 400,
      error: "targetProductId is required for PRODUCT modules",
    };
  }

  const targetProduct = await prisma.product.findUnique({
    where: { id: normalizedTargetProductId },
    select: { id: true, companyId: true },
  });

  if (!targetProduct) {
    return {
      ok: false,
      status: 400,
      error: "Invalid targetProductId",
    };
  }

  if (targetProduct.companyId !== baseContext.companyId) {
    return {
      ok: false,
      status: 403,
      error: "Product does not belong to your company",
    };
  }

  return {
    ok: true,
    context: {
      ...baseContext,
      targetProductId: targetProduct.id,
    },
  };
}
