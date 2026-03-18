import { NextResponse } from "next/server";
import { forbiddenResponse, isPlatformAdmin, isTenantAdmin, unauthorizedResponse } from "@/lib/authz";
import { LEARNING_NO_STORE_HEADERS, authorizeLearningSubject, completeLearningReading, getCompanyLearningRoster, getOwnLearningSnapshot, resolveLearningViewer } from "@/lib/userLearning/runtime";

type ProgressWriteBody = {
  action?: string;
  moduleKey?: string;
};

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const resolved = await resolveLearningViewer(requestUrl);
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
  const targetUserId = requestUrl.searchParams.get("userId")?.trim() || sessionUser.id;
  const scope = requestUrl.searchParams.get("scope")?.trim() || "self";

  if (scope === "company") {
    if (currentCompany.type !== "FIRM") {
      return forbiddenResponse("Learning oversight is only available in firm scope");
    }
    if (!isTenantAdmin(sessionUser) && !isPlatformAdmin(sessionUser)) {
      return forbiddenResponse("Firm learning oversight requires admin authority");
    }

    const roster = await getCompanyLearningRoster(currentCompany.id);
    return NextResponse.json(
      {
        ok: true,
        scope: "company",
        company: currentCompany,
        roster,
      },
      { headers: LEARNING_NO_STORE_HEADERS }
    );
  }

  const allowed = await authorizeLearningSubject({
    viewerUserId: sessionUser.id,
    viewerRole: sessionUser.role,
    viewerPlatformRole: sessionUser.platformRole,
    currentCompanyId: currentCompany.id,
    currentCompanyType: currentCompany.type,
    targetUserId,
    targetCompanyId: currentCompany.id,
  });

  if (!allowed) {
    return forbiddenResponse("Learning progress is not visible in the current viewer scope");
  }

  const snapshot = await getOwnLearningSnapshot(targetUserId, currentCompany.id);
  return NextResponse.json(
    {
      ok: true,
      scope: "self",
      company: currentCompany,
      userId: targetUserId,
      summary: snapshot.summary,
      modules: snapshot.modules.map((module) => ({
        moduleKey: module.moduleKey,
        quizKey: module.quizKey,
        title: module.title,
        fieldOfStudy: module.fieldOfStudy,
      })),
      finalTest: {
        key: "final-test",
        title: snapshot.finalTest.title,
      },
    },
    { headers: LEARNING_NO_STORE_HEADERS }
  );
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

  let body: ProgressWriteBody;
  try {
    body = (await req.json()) as ProgressWriteBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: LEARNING_NO_STORE_HEADERS });
  }

  if (body.action !== "complete_reading" || typeof body.moduleKey !== "string" || body.moduleKey.trim().length === 0) {
    return NextResponse.json(
      { ok: false, error: "Unsupported progress action" },
      { status: 400, headers: LEARNING_NO_STORE_HEADERS }
    );
  }

  const result = await completeLearningReading(sessionUser.id, currentCompany.id, body.moduleKey.trim());
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: LEARNING_NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true, summary: result.summary }, { headers: LEARNING_NO_STORE_HEADERS });
}
