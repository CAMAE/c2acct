import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  requiresCompanyBackedAssessment,
  resolveAssessmentSubjectContext,
} from "@/lib/subjectContext";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
  if (!requiresCompanyBackedAssessment(assessmentContext)) {
    return forbiddenResponse("Current assessment flow requires a company-backed subject");
  }

  try {
    const unlocked = await evaluateUnlocked({
      companyId: assessmentContext.companyId,
      subjectId: assessmentContext.subjectId,
    });

    return NextResponse.json({ ok: true, unlocked }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load unlocked insights" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
