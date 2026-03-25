import type { CompanyType, SubjectKind, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { isAdminRole } from "@/lib/authz";
import {
  resolveAssessmentSubjectContext,
  type AssessmentSubjectAccessMode,
} from "@/lib/subjectContext";

export type PortalAudience =
  | "firm"
  | "vendor"
  | "talent"
  | "hr"
  | "higher_ed"
  | "associations"
  | "media"
  | "individual";

export type SurfaceAvailability = "enabled" | "planned" | "restricted";

export type PortalSurface = {
  id: string;
  title: string;
  description: string;
  href?: string;
  audience: PortalAudience[];
  section: "operate" | "network" | "intelligence";
  availability: SurfaceAvailability;
  reason?: string;
};

export type PortalExperience = {
  actor: {
    email: string | null;
    role: UserRole | null;
  };
  audience: PortalAudience;
  audienceLabel: string;
  audienceDescription: string;
  organizationName: string | null;
  organizationType: CompanyType | null;
  subjectKind: SubjectKind | null;
  accessMode: AssessmentSubjectAccessMode | "none";
  hasCompanyBackedAssessment: boolean;
  isAdmin: boolean;
  surfaces: PortalSurface[];
};

type SurfaceDefinition = {
  id: string;
  title: string;
  description: string;
  href?: string;
  audience: PortalAudience[];
  section: "operate" | "network" | "intelligence";
  state: "live" | "planned";
  requiresAdmin?: boolean;
  requiresCompanyBackedAssessment?: boolean;
};

const AUDIENCE_META: Record<
  PortalAudience,
  { label: string; description: string }
> = {
  firm: {
    label: "Firm Portal",
    description: "Institutional operating view for firm leaders, operators, and advisory teams.",
  },
  vendor: {
    label: "Vendor Portal",
    description: "Partner-readiness and delivery posture for technology and service vendors.",
  },
  talent: {
    label: "Talent Portal",
    description: "Role and readiness view for talent pathways, operators, and candidates.",
  },
  hr: {
    label: "HR Portal",
    description: "People-system planning for hiring, capability formation, and workforce alignment.",
  },
  higher_ed: {
    label: "Higher Ed Portal",
    description: "Program-to-practice visibility for institutional education partners.",
  },
  associations: {
    label: "Association Portal",
    description: "Ecosystem governance and member enablement for industry bodies.",
  },
  media: {
    label: "Media Portal",
    description: "Signal and narrative surface for market educators, analysts, and influencers.",
  },
  individual: {
    label: "Member Portal",
    description: "Personal workspace for individuals without an organization-backed assessment context yet.",
  },
};

const SURFACES: SurfaceDefinition[] = [
  {
    id: "workspace",
    title: "PAT Workspace",
    description: "Role-aware shell for the current institutional perspective.",
    href: "/platform",
    audience: ["firm", "vendor", "individual"],
    section: "operate",
    state: "live",
  },
  {
    id: "assessment",
    title: "Institutional Assessment",
    description: "Run the current PAT-aligned survey flow against the active subject.",
    href: "/survey",
    audience: ["firm", "vendor"],
    section: "operate",
    state: "live",
    requiresCompanyBackedAssessment: true,
  },
  {
    id: "results",
    title: "Assessment Results",
    description: "Review the latest scored submission and its integrity-adjusted result.",
    href: "/results",
    audience: ["firm", "vendor"],
    section: "operate",
    state: "live",
    requiresCompanyBackedAssessment: true,
  },
  {
    id: "outputs",
    title: "Institutional Outputs",
    description: "Open unlocked outputs and the current post-submit deliverable layer.",
    href: "/outputs",
    audience: ["firm", "vendor"],
    section: "operate",
    state: "live",
    requiresCompanyBackedAssessment: true,
  },
  {
    id: "profiles",
    title: "Profile Surface",
    description: "Current profile route for institution-facing visibility and score framing.",
    href: "/profiles",
    audience: ["firm", "vendor"],
    section: "operate",
    state: "live",
  },
  {
    id: "admin",
    title: "Platform Admin",
    description: "Operator controls for company creation and environment management.",
    href: "/admin",
    audience: ["firm", "vendor", "associations", "higher_ed"],
    section: "intelligence",
    state: "live",
    requiresAdmin: true,
  },
  {
    id: "ecosystem-map",
    title: "Filtered Ecosystem Map",
    description: "View only the institutions and counterparties relevant to this portal perspective.",
    audience: ["firm", "vendor", "associations", "media"],
    section: "network",
    state: "planned",
  },
  {
    id: "talent-readiness",
    title: "Talent Readiness Console",
    description: "Role-path and capability readiness surface for talent and HR stakeholders.",
    audience: ["talent", "hr"],
    section: "operate",
    state: "planned",
  },
  {
    id: "higher-ed-bridge",
    title: "Education-to-Practice Bridge",
    description: "Benchmark and placement surfaces for higher-ed and association partners.",
    audience: ["higher_ed", "associations"],
    section: "network",
    state: "planned",
  },
  {
    id: "market-intelligence",
    title: "Market Intelligence Desk",
    description: "Controlled signal surface for media, analysts, and ecosystem observers.",
    audience: ["media", "associations"],
    section: "intelligence",
    state: "planned",
  },
  {
    id: "member-briefing",
    title: "Member Briefing",
    description: "Personal workspace once individual/member flows are enabled.",
    audience: ["individual", "talent"],
    section: "operate",
    state: "planned",
  },
];

function resolvePrimaryAudience(
  companyType: CompanyType | null,
  hasCompanyBackedAssessment: boolean
): PortalAudience {
  if (companyType === "FIRM") return "firm";
  if (companyType === "VENDOR") return "vendor";
  if (!hasCompanyBackedAssessment) return "individual";
  return "individual";
}

function toSurface(
  definition: SurfaceDefinition,
  options: { isAdmin: boolean; hasCompanyBackedAssessment: boolean }
): PortalSurface | null {
  if (definition.requiresAdmin && !options.isAdmin) {
    return null;
  }

  if (definition.state === "planned") {
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      audience: definition.audience,
      section: definition.section,
      availability: "planned",
      reason: "Planned for a later PAT slice.",
    };
  }

  if (definition.requiresCompanyBackedAssessment && !options.hasCompanyBackedAssessment) {
    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      audience: definition.audience,
      section: definition.section,
      availability: "restricted",
      reason: "Requires a company-backed PAT subject.",
    };
  }

  return {
    id: definition.id,
    title: definition.title,
    description: definition.description,
    href: definition.href,
    audience: definition.audience,
    section: definition.section,
    availability: "enabled",
  };
}

export async function resolvePortalExperience(
  sessionUser: SessionUser | null
): Promise<PortalExperience> {
  if (!sessionUser) {
    const audience = "individual";
    return {
      actor: { email: null, role: null },
      audience,
      audienceLabel: AUDIENCE_META[audience].label,
      audienceDescription: AUDIENCE_META[audience].description,
      organizationName: null,
      organizationType: null,
      subjectKind: null,
      accessMode: "none",
      hasCompanyBackedAssessment: false,
      isAdmin: false,
      surfaces: SURFACES.filter((surface) => surface.audience.includes(audience))
        .map((surface) =>
          toSurface(surface, { isAdmin: false, hasCompanyBackedAssessment: false })
        )
        .filter((surface): surface is PortalSurface => Boolean(surface)),
    };
  }

  const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
  const company = sessionUser.companyId
    ? await prisma.company.findUnique({
        where: { id: sessionUser.companyId },
        select: { name: true, type: true },
      })
    : null;

  const hasCompanyBackedAssessment = Boolean(assessmentContext?.companyId);
  const audience = resolvePrimaryAudience(company?.type ?? null, hasCompanyBackedAssessment);
  const isAdmin = isAdminRole(sessionUser.role);

  return {
    actor: { email: sessionUser.email, role: sessionUser.role },
    audience,
    audienceLabel: AUDIENCE_META[audience].label,
    audienceDescription: AUDIENCE_META[audience].description,
    organizationName: company?.name ?? null,
    organizationType: company?.type ?? null,
    subjectKind: assessmentContext?.subjectKind ?? null,
    accessMode: assessmentContext?.accessMode ?? "none",
    hasCompanyBackedAssessment,
    isAdmin,
    surfaces: SURFACES.filter((surface) => surface.audience.includes(audience))
      .map((surface) =>
        toSurface(surface, { isAdmin, hasCompanyBackedAssessment })
      )
      .filter((surface): surface is PortalSurface => Boolean(surface)),
  };
}

export function getAudienceMeta(audience: PortalAudience) {
  return AUDIENCE_META[audience];
}

export function getAudiencePreview(audience: PortalAudience): PortalSurface[] {
  return SURFACES.filter((surface) => surface.audience.includes(audience))
    .map((surface) =>
      toSurface(surface, {
        isAdmin: audience === "associations",
        hasCompanyBackedAssessment: audience === "firm" || audience === "vendor",
      })
    )
    .filter((surface): surface is PortalSurface => Boolean(surface));
}

export const ALL_AUDIENCES = Object.keys(AUDIENCE_META) as PortalAudience[];
