import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolveAssessmentContextFromSessionUser } from "@/lib/assessmentTarget";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const assessmentContext = resolveAssessmentContextFromSessionUser(sessionUser);
  if (!assessmentContext) {
    return forbiddenResponse("No company assigned");
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: assessmentContext.companyId },
      select: { id: true, type: true },
    });

    if (!company) {
      return forbiddenResponse("No company assigned");
    }

    if (company.type !== "VENDOR") {
      return NextResponse.json(
        { ok: true, companyId: company.id, companyType: company.type, enableProductSelection: false, products: [] },
        { headers: NO_STORE_HEADERS }
      );
    }

    const products = await prisma.product.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return NextResponse.json(
      { ok: true, companyId: company.id, companyType: company.type, enableProductSelection: true, products },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load product context" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
