import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    fail(message);
  }
}

async function main() {
  const authz = read("lib/authz.ts");
  const adminPage = read("app/admin/page.tsx");
  const adminHelper = read("lib/admin/controlPlane.ts");
  const healthRoute = read("app/api/health/db/route.ts");
  const inviteCreateRoute = read("app/api/network/invite-codes/route.ts");
  const inviteClaimRoute = read("app/api/network/invite-codes/claim/route.ts");
  const surveySubmitRoute = read("app/api/survey/submit/route.ts");
  const reviewSubmitRoute = read("app/api/external-reviews/submit/route.ts");
  const viewerContext = read("lib/viewerContext.ts");
  const visibility = read("lib/visibility/index.ts");

  assert(
    authz.includes("isPlatformOperator") &&
      authz.includes("isPlatformAdmin") &&
      authz.includes("isTenantAdmin") &&
      authz.includes("canAccessCompany"),
    "authz helper must expose platform and tenant admin boundary checks"
  );

  assert(
    adminPage.includes("const isAdmin = isPlatformAdmin(sessionUser)") &&
      adminPage.includes('redirect("/login?callbackUrl=%2Fadmin")') &&
      adminPage.includes('redirect("/")') &&
      adminPage.includes("Admin Operating Center"),
    "admin page must enforce platform-admin authorization for page view"
  );

  assert(
    adminHelper.includes("requirePlatformAdminPage") &&
      adminHelper.includes("requirePlatformAdminApi") &&
      adminHelper.includes("isPlatformAdmin(sessionUser)"),
    "platform admin helper must gate both page and API operator surfaces"
  );

  assert(
    healthRoute.includes("hasInternalHealthAccess") &&
      healthRoute.includes("isPlatformAdmin(sessionUser)") &&
      healthRoute.includes("Platform admin or internal health access required"),
    "health route must enforce platform admin or shared-secret internal access"
  );

  assert(
    inviteCreateRoute.includes("isAdminRole(sessionUser.role)") &&
      inviteCreateRoute.includes('Only vendor companies can create invite codes'),
    "invite create route must require tenant admin role and vendor company context"
  );

  assert(
    inviteClaimRoute.includes('Only firm companies can claim sponsor invite codes'),
    "invite claim route must remain firm-only"
  );

  assert(
    surveySubmitRoute.includes("applyViewerCompanyScopeToSessionUser") &&
      surveySubmitRoute.includes("resolveAssessmentSubmitTargetFromSessionUser"),
    "survey submit route must bind writes through viewer-scoped company authority"
  );

  assert(
    reviewSubmitRoute.includes('Only firm companies can submit external reviews') &&
      reviewSubmitRoute.includes('External reviews can only target vendor companies') &&
      reviewSubmitRoute.includes("assertViewerCanAccessCompany") &&
      reviewSubmitRoute.includes("assertViewerCanAccessProduct"),
    "external review submit route must enforce firm-only, vendor-targeted, visibility-scoped authorization"
  );

  assert(
    viewerContext.includes("viewerCanAccessCompany") &&
      visibility.includes("resolveVisibleSubject"),
    "viewer and visibility helpers must remain the canonical subject-access seam"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "platform-admin gating on operator surface",
          "internal health route authorization",
          "tenant-admin gating on invite creation",
          "firm-only and visibility-scoped external review authorization",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "VERIFY_OPERATOR_SURFACE_AUTH_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
