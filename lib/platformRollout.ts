import { NextResponse } from "next/server";

export type PatRolloutStage = "beta_protected" | "pat_phase1";

export type PortalSurfaceId =
  | "workspace"
  | "assessment"
  | "results"
  | "outputs"
  | "profiles"
  | "admin"
  | "ecosystem-map"
  | "talent-readiness"
  | "higher-ed-bridge"
  | "market-intelligence"
  | "member-briefing";

type CookieGetter = {
  get(name: string): { value?: string } | undefined;
};

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return fallback;
}

export const PAT_COOKIE_KEYS = {
  companySelection: "pat_companyId",
  legacyCompanySelection: "aae_companyId",
  subjectSelection: "pat_subjectId",
} as const;

export const PAT_COMPATIBILITY_BRIDGES = {
  legacyCompanyCookie: `${PAT_COOKIE_KEYS.companySelection} + ${PAT_COOKIE_KEYS.legacyCompanySelection}`,
  userCompanyFallback: "User.companyId fallback when SubjectMembership is absent",
  companyRootedWrites: "company-rooted badges, capability scores, FMI, and benchmark tables remain canonical",
} as const;

export function getPatRollout() {
  const stage: PatRolloutStage = "pat_phase1";

  return {
    stage,
    featureFlags: {
      vendorCore: parseBooleanEnv(process.env.PAT_ENABLE_VENDOR_CORE, true),
      memberWorkspace: parseBooleanEnv(process.env.PAT_ENABLE_MEMBER_WORKSPACE, true),
      ecosystemMap: parseBooleanEnv(process.env.PAT_ENABLE_ECOSYSTEM_MAP, false),
      talentPortal: parseBooleanEnv(process.env.PAT_ENABLE_TALENT_PORTAL, false),
      hrPortal: parseBooleanEnv(process.env.PAT_ENABLE_HR_PORTAL, false),
      higherEdPortal: parseBooleanEnv(process.env.PAT_ENABLE_HIGHER_ED_PORTAL, false),
      associationPortal: parseBooleanEnv(process.env.PAT_ENABLE_ASSOCIATION_PORTAL, false),
      mediaPortal: parseBooleanEnv(process.env.PAT_ENABLE_MEDIA_PORTAL, false),
      memberBriefing: parseBooleanEnv(process.env.PAT_ENABLE_MEMBER_BRIEFING, false),
    },
    betaOnlyBoundaries: [
      "Assessment, badges, insights, and results still require a company-backed subject.",
      "Capability scores, FMI snapshots, and benchmarks still write against company-rooted tables.",
      "Company selection is still bridged through legacy company cookies for runtime stability.",
      "User.companyId remains a compatibility fallback when SubjectMembership is absent.",
    ],
    phase1LiveNow: [
      "company-backed firm and vendor assessment path",
      "subject-aware assessment reads and writes with company fallback",
      "PAT workspace shell with controlled planned surfaces",
      "vendor-product taxonomy ingestion substrate",
    ],
    dangerousNow: [
      "adding new role portals without explicit feature gates",
      "writing subject-native capability scores before a dual-read bridge exists",
      "removing User.companyId or aae_companyId compatibility before all readers are migrated",
      "adding non-company assessment flows to current submit/results routes",
    ],
    compatibilityBridges: [
      `dual-read company selection cookie (${PAT_COMPATIBILITY_BRIDGES.legacyCompanyCookie})`,
      PAT_COMPATIBILITY_BRIDGES.userCompanyFallback,
      PAT_COMPATIBILITY_BRIDGES.companyRootedWrites,
    ],
  };
}

export function isPortalSurfaceEnabled(surfaceId: PortalSurfaceId) {
  const rollout = getPatRollout();

  switch (surfaceId) {
    case "workspace":
    case "assessment":
    case "results":
    case "outputs":
    case "profiles":
    case "admin":
      // Results, outputs, and profiles remain enabled only because the routes
      // are compatibility bridges into the canonical role-specific PAT surfaces.
      return true;
    case "ecosystem-map":
      return rollout.featureFlags.ecosystemMap;
    case "talent-readiness":
      return rollout.featureFlags.talentPortal || rollout.featureFlags.hrPortal;
    case "higher-ed-bridge":
      return rollout.featureFlags.higherEdPortal || rollout.featureFlags.associationPortal;
    case "market-intelligence":
      return rollout.featureFlags.mediaPortal || rollout.featureFlags.associationPortal;
    case "member-briefing":
      return rollout.featureFlags.memberBriefing;
    default:
      return false;
  }
}

export function getPortalSurfaceRolloutReason(surfaceId: PortalSurfaceId) {
  const rollout = getPatRollout();

  switch (surfaceId) {
    case "ecosystem-map":
      return rollout.featureFlags.ecosystemMap
        ? null
        : "Staged off until PAT has governed ecosystem visibility beyond the beta shell.";
    case "talent-readiness":
      return rollout.featureFlags.talentPortal || rollout.featureFlags.hrPortal
        ? null
        : "Staged off until talent and HR identity rules exist beyond company-backed assessment.";
    case "higher-ed-bridge":
      return rollout.featureFlags.higherEdPortal || rollout.featureFlags.associationPortal
        ? null
        : "Staged off until education and association cohorts have real benchmark and membership data.";
    case "market-intelligence":
      return rollout.featureFlags.mediaPortal || rollout.featureFlags.associationPortal
        ? null
        : "Staged off until PAT can expose market views without leaking operator-only context.";
    case "member-briefing":
      return rollout.featureFlags.memberBriefing
        ? null
        : "Staged off until individual/member workflows stop depending on company-backed assessment.";
    default:
      return null;
  }
}

export function readSelectedCompanyId(cookieStore: CookieGetter) {
  const companyId =
    cookieStore.get(PAT_COOKIE_KEYS.companySelection)?.value ??
    cookieStore.get(PAT_COOKIE_KEYS.legacyCompanySelection)?.value ??
    null;

  return companyId && companyId.trim() ? companyId.trim() : null;
}

export function applySelectedCompanyCookies(res: NextResponse, companyId: string) {
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  };

  res.cookies.set(PAT_COOKIE_KEYS.companySelection, companyId, cookieOptions);
  res.cookies.set(PAT_COOKIE_KEYS.legacyCompanySelection, companyId, cookieOptions);
}
