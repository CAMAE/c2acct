import type { CompanyType, SubjectKind, UserRole } from "@prisma/client";
import type { PortalExperience, PortalSurface } from "@/lib/portalVisibility";

export const DEV_PREVIEW_ROUTE = "/dev/pat-preview";
export const DEV_PREVIEW_ENV = "PAT_ENABLE_DEV_PREVIEW";

function parseBooleanEnv(value: string | undefined) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function isDevPreviewEnabled() {
  return process.env.NODE_ENV !== "production" && parseBooleanEnv(process.env[DEV_PREVIEW_ENV]);
}

export type DevPreviewView =
  | "home"
  | "login"
  | "vendor"
  | "firm"
  | "user"
  | "admin"
  | "survey"
  | "results"
  | "insights"
  | "profile";

export type DevPreviewViewMeta = {
  id: DevPreviewView;
  label: string;
  description: string;
};

export const DEV_PREVIEW_VIEWS: DevPreviewViewMeta[] = [
  { id: "home", label: "Main / Home", description: "Public homepage and PAT entry framing." },
  { id: "login", label: "Sign-In Hub", description: "GitHub sign-in and recovery surface." },
  { id: "vendor", label: "Vendor Home", description: "Vendor-facing PAT workspace shell." },
  { id: "firm", label: "Firm Home", description: "Firm-facing PAT workspace shell." },
  { id: "user", label: "User Home", description: "Individual/member PAT workspace shell." },
  { id: "admin", label: "Admin Surface", description: "Operator-facing PAT shell and controls framing." },
  { id: "survey", label: "Survey", description: "Assessment readiness and launch framing." },
  { id: "results", label: "Results", description: "Pro membership results and score readout framing." },
  { id: "insights", label: "Insights", description: "Unlocked Pro membership plus staged Elite membership presentation." },
  { id: "profile", label: "Profile", description: "Profile and scope context framing." },
] as const;

function makeSurface(
  id: string,
  title: string,
  description: string,
  href: string,
  availability: PortalSurface["availability"] = "enabled",
  section: PortalSurface["section"] = "operate",
  reason?: string
): PortalSurface {
  return {
    id,
    title,
    description,
    href,
    availability,
    section,
    audience: ["firm", "vendor", "individual"],
    reason,
  };
}

type ExperienceOptions = {
  email: string;
  role: UserRole | null;
  audience: PortalExperience["audience"];
  audienceLabel: string;
  audienceDescription: string;
  organizationName: string | null;
  organizationType: CompanyType | null;
  subjectKind: SubjectKind | null;
  accessMode: PortalExperience["accessMode"];
  isAdmin: boolean;
  hasCompanyBackedAssessment: boolean;
  surfaces: PortalSurface[];
};

function makeExperience(options: ExperienceOptions): PortalExperience {
  return {
    actor: {
      email: options.email,
      role: options.role,
    },
    audience: options.audience,
    audienceLabel: options.audienceLabel,
    audienceDescription: options.audienceDescription,
    organizationName: options.organizationName,
    organizationType: options.organizationType,
    subjectKind: options.subjectKind,
    accessMode: options.accessMode,
    hasCompanyBackedAssessment: options.hasCompanyBackedAssessment,
    isAdmin: options.isAdmin,
    rolloutStage: "pat_phase1",
    betaOnlyBoundaries: [
      "Preview mode is isolated from real auth and does not grant API or data access.",
      "Live role checks, company checks, and operator controls still apply on real routes.",
    ],
    compatibilityNotes: [
      "Development-only preview is active. This route is for reviewability only and is disabled in production.",
    ],
    surfaces: options.surfaces,
  };
}

export function getDevPreviewExperience(view: DevPreviewView) {
  switch (view) {
    case "vendor":
      return makeExperience({
        email: "vendor-preview@pat.local",
        role: "MEMBER",
        audience: "vendor",
        audienceLabel: "Vendor Portal",
        audienceDescription: "Product-aware fit, delivery posture, and counterpart workflow visibility for a vendor team.",
        organizationName: "PAT Vendor Preview",
        organizationType: "VENDOR",
        subjectKind: "ORGANIZATION",
        accessMode: "subject-membership",
        isAdmin: false,
        hasCompanyBackedAssessment: true,
        surfaces: [
          makeSurface("workspace", "Vendor Workspace", "Vendor homepage and overview shell.", "/platform"),
          makeSurface("assessment", "Vendor Assessment", "Preview the vendor assessment entry and readiness flow.", `${DEV_PREVIEW_ROUTE}?view=survey`),
          makeSurface("results", "Vendor Results", "Preview the current-state vendor results shell.", `${DEV_PREVIEW_ROUTE}?view=results`),
          makeSurface("insights", "Vendor Insights", "Preview Pro membership unlocked and Elite membership staged insight framing.", `${DEV_PREVIEW_ROUTE}?view=insights`),
          makeSurface("profile", "Vendor Profile", "Preview the vendor profile and scope context surface.", `${DEV_PREVIEW_ROUTE}?view=profile`),
        ],
      });
    case "firm":
      return makeExperience({
        email: "firm-preview@pat.local",
        role: "ADMIN",
        audience: "firm",
        audienceLabel: "Firm Portal",
        audienceDescription: "Operating alignment, assessment flow, and profile visibility for a firm operator.",
        organizationName: "PAT Firm Preview",
        organizationType: "FIRM",
        subjectKind: "ORGANIZATION",
        accessMode: "subject-membership",
        isAdmin: false,
        hasCompanyBackedAssessment: true,
        surfaces: [
          makeSurface("workspace", "Firm Workspace", "Firm homepage and operating shell.", "/platform"),
          makeSurface("assessment", "Firm Assessment", "Preview the firm assessment readiness and launch framing.", `${DEV_PREVIEW_ROUTE}?view=survey`),
          makeSurface("results", "Firm Results", "Preview the firm results shell and score framing.", `${DEV_PREVIEW_ROUTE}?view=results`),
          makeSurface("insights", "Firm Insights", "Preview unlocked insight and staged Elite membership presentation.", `${DEV_PREVIEW_ROUTE}?view=insights`),
          makeSurface("profile", "Firm Profile", "Preview firm profile framing and scope context.", `${DEV_PREVIEW_ROUTE}?view=profile`),
        ],
      });
    case "user":
      return makeExperience({
        email: "user-preview@pat.local",
        role: "MEMBER",
        audience: "individual",
        audienceLabel: "Member Portal",
        audienceDescription: "A personal PAT home for users who need role-aware entry without a broad operator shell.",
        organizationName: null,
        organizationType: null,
        subjectKind: "PERSON",
        accessMode: "none",
        isAdmin: false,
        hasCompanyBackedAssessment: false,
        surfaces: [
          makeSurface("workspace", "Member Workspace", "User homepage and personal PAT shell.", "/platform"),
          makeSurface(
            "survey",
            "Assessment Entry",
            "Assessment remains scoped until a company-backed subject is attached.",
            `${DEV_PREVIEW_ROUTE}?view=survey`,
            "restricted",
            "operate",
            "Requires a company-backed PAT subject."
          ),
          makeSurface(
            "profile",
            "Profile Surface",
            "Profile framing for a personal PAT context.",
            `${DEV_PREVIEW_ROUTE}?view=profile`
          ),
        ],
      });
    case "admin":
      return makeExperience({
        email: "admin-preview@pat.local",
        role: "OWNER",
        audience: "firm",
        audienceLabel: "Operator Portal",
        audienceDescription: "Platform oversight, environment checks, and admin review surfaces for PAT operators.",
        organizationName: "PAT Operator Preview",
        organizationType: "FIRM",
        subjectKind: "PORTAL",
        accessMode: "legacy-company",
        isAdmin: true,
        hasCompanyBackedAssessment: true,
        surfaces: [
          makeSurface("workspace", "Operator Workspace", "Operator PAT shell for surface review.", "/platform"),
          makeSurface("admin", "Platform Admin", "Preview the admin surface framing and controls layout.", `${DEV_PREVIEW_ROUTE}?view=admin`, "enabled", "intelligence"),
          makeSurface("results", "Results", "Preview downstream result surfaces that operators need to inspect.", `${DEV_PREVIEW_ROUTE}?view=results`),
          makeSurface("insights", "Insights", "Preview insight staging and unlock framing.", `${DEV_PREVIEW_ROUTE}?view=insights`),
          makeSurface("profile", "Profile", "Preview profile shell and scope framing.", `${DEV_PREVIEW_ROUTE}?view=profile`),
        ],
      });
    default:
      return null;
  }
}
