import prisma from "@/lib/prisma";

export type ReviewTargetResolverInput = {
  subjectCompanyId: string;
  subjectProductId?: string | null;
};

export type ResolvedReviewTarget = {
  subjectCompany: {
    id: string;
    name: string;
  };
  subjectProduct: {
    id: string;
    name: string;
    companyId: string;
  } | null;
};

export type ReviewTargetResolverResult =
  | {
      ok: true;
      target: ResolvedReviewTarget;
    }
  | {
      ok: false;
      status: 400 | 404;
      error: string;
    };

function normalizeId(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export async function resolveReviewTarget(
  input: ReviewTargetResolverInput
): Promise<ReviewTargetResolverResult> {
  const subjectCompanyId = normalizeId(input.subjectCompanyId);
  const subjectProductId = normalizeId(input.subjectProductId);

  if (!subjectCompanyId) {
    return {
      ok: false,
      status: 400,
      error: "subjectCompanyId is required",
    };
  }

  const subjectCompany = await prisma.company.findUnique({
    where: { id: subjectCompanyId },
    select: { id: true, name: true },
  });

  if (!subjectCompany) {
    return {
      ok: false,
      status: 404,
      error: "Subject company not found",
    };
  }

  if (!subjectProductId) {
    return {
      ok: true,
      target: {
        subjectCompany,
        subjectProduct: null,
      },
    };
  }

  const subjectProduct = await prisma.product.findUnique({
    where: { id: subjectProductId },
    select: { id: true, name: true, companyId: true },
  });

  if (!subjectProduct) {
    return {
      ok: false,
      status: 404,
      error: "Subject product not found",
    };
  }

  if (subjectProduct.companyId !== subjectCompany.id) {
    return {
      ok: false,
      status: 400,
      error: "Product does not belong to subject company",
    };
  }

  return {
    ok: true,
    target: {
      subjectCompany,
      subjectProduct,
    },
  };
}
