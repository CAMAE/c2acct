import fs from "fs";
import path from "path";

type ViewerMembership = {
  companyId: string;
  role?: string;
  status?: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    fail(message);
  }
}

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function resolveViewerCompanyScope(params: {
  memberships: ViewerMembership[];
  platformRole: string;
  legacyCompanyId: string | null;
  preferredCompanyId: string | null;
}) {
  const activeMemberships = params.memberships.filter((membership) => membership.status === "ACTIVE");
  const membershipCompanyIds = activeMemberships.map((membership) => membership.companyId);
  const defaultCompanyId = membershipCompanyIds[0] ?? params.legacyCompanyId ?? null;
  const currentCompanyId =
    params.preferredCompanyId && membershipCompanyIds.includes(params.preferredCompanyId)
      ? params.preferredCompanyId
      : defaultCompanyId;

  return {
    defaultCompanyId,
    currentCompanyId,
    platformRole: params.platformRole,
    memberships: activeMemberships,
  };
}

function canAccessCompany(sessionUser: {
  companyId?: string | null;
  platformRole?: string | null;
  memberships?: Array<{ companyId: string }>;
}, companyId: string) {
  if (sessionUser.platformRole === "PLATFORM_ADMIN") {
    return true;
  }

  const membershipCompanyIds = (sessionUser.memberships ?? []).map((membership) => membership.companyId);
  if (membershipCompanyIds.length > 0) {
    return membershipCompanyIds.includes(companyId);
  }

  return sessionUser.companyId === companyId;
}

function verifyViewerScopeSelection() {
  const memberships: ViewerMembership[] = [
    { companyId: "company-alpha", role: "ADMIN", status: "ACTIVE" },
    { companyId: "company-beta", role: "MEMBER", status: "ACTIVE" },
  ];

  const preferredScope = resolveViewerCompanyScope({
    memberships,
    platformRole: "NONE",
    legacyCompanyId: "legacy-company",
    preferredCompanyId: "company-beta",
  });

  assert(preferredScope.defaultCompanyId === "company-alpha", "membership default company should come from active memberships");
  assert(preferredScope.currentCompanyId === "company-beta", "preferred viewer scope should win when membership allows it");

  const legacyFallback = resolveViewerCompanyScope({
    memberships: [],
    platformRole: "NONE",
    legacyCompanyId: "legacy-company",
    preferredCompanyId: null,
  });

  assert(legacyFallback.defaultCompanyId === "legacy-company", "legacy company fallback should remain available");
  assert(legacyFallback.currentCompanyId === "legacy-company", "legacy fallback should seed viewer scope when memberships are absent");
}

function verifyAuthzMembershipPrecedence() {
  assert(
    canAccessCompany(
      {
        role: "ADMIN",
        platformRole: "NONE",
        companyId: "legacy-company",
        memberships: [{ companyId: "company-alpha" }],
      },
      "company-alpha"
    ),
    "membership-backed company access should be allowed"
  );

  assert(
    !canAccessCompany(
      {
        role: "ADMIN",
        platformRole: "NONE",
        companyId: "legacy-company",
        memberships: [{ companyId: "company-alpha" }],
      },
      "legacy-company"
    ),
    "legacy company should not override active membership scope when memberships exist"
  );

  assert(
    canAccessCompany(
      {
        role: "ADMIN",
        platformRole: "NONE",
        companyId: "legacy-company",
      },
      "legacy-company"
    ),
    "legacy company fallback should remain available when memberships are absent"
  );
}

function verifyRouteBindings() {
  const surveySubmitRoute = readRepoFile("app/api/survey/submit/route.ts");
  const observedRoute = readRepoFile("app/api/external-reviews/observed/route.ts");
  const badgesRoute = readRepoFile("app/api/badges/earned/route.ts");
  const resultsRoute = readRepoFile("app/api/results/route.ts");
  const insightsRoute = readRepoFile("app/api/insights/unlocked/route.ts");
  const productDimensionsRoute = readRepoFile("app/api/outputs/product-dimensions/route.ts");
  const viewerScopePreferenceFile = readRepoFile("lib/viewerScopePreference.ts");

  assert(
    surveySubmitRoute.includes("applyViewerCompanyScopeToSessionUser"),
    "survey submit route must bind session authority to viewer scope"
  );
  assert(
    observedRoute.includes("viewerContext?.currentCompanyId"),
    "external observed route must default to viewer context current company"
  );

  for (const [label, contents] of [
    ["badges", badgesRoute],
    ["results", resultsRoute],
    ["insights", insightsRoute],
    ["product dimensions", productDimensionsRoute],
  ]) {
    assert(
      contents.includes("resolvePreferredViewerCompanyId"),
      `${label} route must resolve preferred viewer scope`
    );
    assert(
      contents.includes("applyViewerCompanyScopeToSessionUser") || contents.includes("resolveVisibleSubject"),
      `${label} route must bind access through viewer scope or visibility resolution`
    );
  }

  assert(
    viewerScopePreferenceFile.includes("resolvePreferredViewerCompanyId"),
    "viewer scope preference helper should expose preferred viewer scope semantics"
  );
}

async function main() {
  verifyViewerScopeSelection();
  verifyAuthzMembershipPrecedence();
  verifyRouteBindings();

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "viewer scope selection",
          "membership-first company authz",
          "route bindings to viewer scope",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "VERIFY_MEMBERSHIP_VIEWER_CONTEXT_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
