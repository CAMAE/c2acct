import type { SessionUser } from "@/lib/auth/session";
import type { ModuleScope } from "@prisma/client";
import prisma from "@/lib/prisma";

export type AssessmentAuthorityType = "COMPANY";

export type AssessmentTargetMode = "COMPANY" | "PRODUCT";

export type AssessmentTargetContext = {
  companyId: string;
  productId: string | null;
  mode: AssessmentTargetMode;
};

export type AssessmentSubmitResolutionInput = {
  sessionUser: Pick<SessionUser, "companyId"> | null | undefined;
  moduleScope: ModuleScope;
  targetProductId?: string | null;
};

export type AssessmentReadResolutionInput = {
  sessionUser: Pick<SessionUser, "companyId"> | null | undefined;
  requestedProductId?: string | null;
};

type AssessmentTargetResolutionInput = {
  sessionUser: Pick<SessionUser, "companyId"> | null | undefined;
  requestedProductId?: string | null;
  requireProductId?: boolean;
  missingProductIdError?: string;
  invalidProductIdError?: string;
};

export type AssessmentSubmitResolutionResult =
  | {
      ok: true;
      context: AssessmentTargetContext;
    }
  | {
      ok: false;
      status: 400 | 403;
      error: string;
    };

export type AssessmentReadResolutionResult =
  | {
      ok: true;
      context: AssessmentTargetContext;
    }
  | {
      ok: false;
      status: 400 | 403;
      error: string;
    };

export function resolveAssessmentContextFromSessionUser(
  sessionUser: Pick<SessionUser, "companyId"> | null | undefined
): AssessmentTargetContext | null {
  const companyId = typeof sessionUser?.companyId === "string" ? sessionUser.companyId.trim() : "";
  if (!companyId) {
    return null;
  }

  return {
    companyId,
    productId: null,
    mode: "COMPANY",
  };
}

export const resolveAssessmentReadContextFromSessionUser = resolveAssessmentContextFromSessionUser;

async function resolveAssessmentTargetContext({
  sessionUser,
  requestedProductId,
  requireProductId = false,
  missingProductIdError = "productId is required",
  invalidProductIdError = "Invalid productId",
}: AssessmentTargetResolutionInput): Promise<AssessmentReadResolutionResult> {
  const baseContext = resolveAssessmentContextFromSessionUser(sessionUser);
  if (!baseContext) {
    return {
      ok: false,
      status: 403,
      error: "No company assigned",
    };
  }

  const normalizedProductId =
    typeof requestedProductId === "string" ? requestedProductId.trim() : "";

  if (!normalizedProductId) {
    if (requireProductId) {
      return {
        ok: false,
        status: 400,
        error: missingProductIdError,
      };
    }

    return {
      ok: true,
      context: baseContext,
    };
  }

  const targetProduct = await prisma.product.findUnique({
    where: { id: normalizedProductId },
    select: { id: true, companyId: true },
  });

  if (!targetProduct) {
    return {
      ok: false,
      status: 400,
      error: invalidProductIdError,
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
      companyId: baseContext.companyId,
      productId: targetProduct.id,
      mode: "PRODUCT",
    },
  };
}

export async function resolveAssessmentTargetFromSessionUserWithOptionalProduct({
  sessionUser,
  requestedProductId,
}: AssessmentReadResolutionInput): Promise<AssessmentReadResolutionResult> {
  return resolveAssessmentTargetContext({
    sessionUser,
    requestedProductId,
    invalidProductIdError: "Invalid productId",
  });
}

export async function resolveAssessmentSubmitContextFromSessionUser({
  sessionUser,
  moduleScope,
  targetProductId,
}: AssessmentSubmitResolutionInput): Promise<AssessmentSubmitResolutionResult> {
  if (moduleScope !== "PRODUCT") {
    return resolveAssessmentTargetContext({ sessionUser });
  }

  return resolveAssessmentTargetContext({
    sessionUser,
    requestedProductId: targetProductId,
    requireProductId: true,
    missingProductIdError: "targetProductId is required for PRODUCT modules",
    invalidProductIdError: "Invalid targetProductId",
  });
}

export const resolveAssessmentReadContextFromSessionUserWithOptionalProduct =
  resolveAssessmentTargetFromSessionUserWithOptionalProduct;

export async function resolveAssessmentSubmitTargetFromSessionUser(
  input: AssessmentSubmitResolutionInput
): Promise<AssessmentSubmitResolutionResult> {
  return resolveAssessmentSubmitContextFromSessionUser(input);
}

export function toAssessmentAuthorityType(_target: AssessmentTargetContext): AssessmentAuthorityType {
  return "COMPANY";
}

export function toLegacyAssessmentContext(target: AssessmentTargetContext) {
  return {
    authorityType: toAssessmentAuthorityType(target),
    companyId: target.companyId,
    targetProductId: target.productId,
    mode: target.mode,
  };
}
