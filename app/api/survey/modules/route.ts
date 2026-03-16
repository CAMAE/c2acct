import { NextResponse } from "next/server";
import { listRuntimeSurveyModules } from "@/lib/assessment-module-catalog";
import { getSessionUser } from "@/lib/auth/session";
import { unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { resolveVisibilityContext } from "@/lib/visibility";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const requestUrl = new URL(req.url);
  const preferredCompanyId = await resolvePreferredViewerCompanyId(requestUrl.searchParams);
  const visibilityContext = await resolveVisibilityContext({
    sessionUser,
    preferredCompanyId,
  });

  const currentCompanyType = visibilityContext?.currentCompany?.type ?? null;
  const allowedScopes =
    currentCompanyType === "FIRM"
      ? new Set(["FIRM"])
      : currentCompanyType === "VENDOR"
        ? new Set(["VENDOR", "PRODUCT"])
        : new Set<string>();

  const modules = listRuntimeSurveyModules()
    .filter((entry) => allowedScopes.has(entry.scope))
    .map((entry) => ({
    key: entry.key,
    title: entry.title,
    axis: entry.axis,
    scope: entry.scope,
    activationState: entry.activationState,
    isUserFacing: entry.isUserFacing,
    reportingRole: entry.reportingRole,
    reportProfileKey: entry.reportProfileKey,
    intelligenceProfileKey: entry.intelligenceProfileKey,
    displayOrder: entry.displayOrder,
    family: entry.family,
    }));

  return NextResponse.json({ ok: true, modules }, { headers: NO_STORE_HEADERS });
}
