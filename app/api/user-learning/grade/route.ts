import { NextResponse } from "next/server";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { LEARNING_NO_STORE_HEADERS, resolveLearningViewer, submitLearningGrade } from "@/lib/userLearning/runtime";

type GradeBody = {
  assessmentKind?: "QUIZ" | "FINAL";
  assessmentKey?: string;
  responses?: Record<string, string>;
};

function isRecord(value: unknown): value is Record<string, string> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((entry) => typeof entry === "string");
}

export async function POST(req: Request) {
  const resolved = await resolveLearningViewer();
  if (!resolved.ok) {
    return resolved.status === 401
      ? unauthorizedResponse(resolved.error)
      : forbiddenResponse(resolved.error);
  }

  const { sessionUser, visibilityContext } = resolved;
  const currentCompany = visibilityContext.currentCompany;
  if (!currentCompany) {
    return forbiddenResponse("No company assigned");
  }
  if (currentCompany.type !== "FIRM") {
    return forbiddenResponse("Learning runtime is available only for firm-scoped invited users");
  }

  let body: GradeBody;
  try {
    body = (await req.json()) as GradeBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: LEARNING_NO_STORE_HEADERS });
  }

  if (
    (body.assessmentKind !== "QUIZ" && body.assessmentKind !== "FINAL") ||
    typeof body.assessmentKey !== "string" ||
    body.assessmentKey.trim().length === 0 ||
    !isRecord(body.responses)
  ) {
    return NextResponse.json({ ok: false, error: "Invalid grading payload" }, { status: 400, headers: LEARNING_NO_STORE_HEADERS });
  }

  const result = await submitLearningGrade({
    userId: sessionUser.id,
    companyId: currentCompany.id,
    assessmentKind: body.assessmentKind,
    assessmentKey: body.assessmentKey.trim(),
    responses: body.responses,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: LEARNING_NO_STORE_HEADERS });
  }

  return NextResponse.json(
    {
      ok: true,
      assessmentTitle: result.assessmentTitle,
      grade: result.graded,
      summary: result.summary,
    },
    { headers: LEARNING_NO_STORE_HEADERS }
  );
}
