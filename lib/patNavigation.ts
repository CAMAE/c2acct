export type PatRouteRole = "vendor" | "firm" | "user";
export type PatNavigationAudience = "firm" | "vendor" | "individual";
export type PatSurfaceAvailability = "enabled" | "planned" | "restricted";
export type PatCanonicalSurface = "workspace" | "assessment" | "results" | "insights" | "profile";

type RoleCard = {
  id: string;
  title: string;
  description: string;
  href?: string;
  audience: Array<"firm" | "vendor" | "individual">;
  section: "operate";
  availability: PatSurfaceAvailability;
  reason?: string;
};

type RoleConfig = {
  key: PatRouteRole;
  label: string;
  title: string;
  description: string;
  signInHref: string;
  signInLabel: string;
  cards: RoleCard[];
};

function makeCard(
  id: string,
  title: string,
  description: string,
  href: string | undefined,
  availability: PatSurfaceAvailability = "enabled",
  reason?: string
): RoleCard {
  return {
    id,
    title,
    description,
    href,
    audience: ["firm", "vendor", "individual"],
    section: "operate",
    availability,
    reason,
  };
}

export function getCanonicalPatHref(
  audience: PatNavigationAudience,
  surface: PatCanonicalSurface
) {
  if (audience === "firm") {
    if (surface === "workspace") return "/firm";
    if (surface === "assessment") return "/firm/alignment-assessment";
    if (surface === "results") return "/firm/insights";
    if (surface === "insights") return "/firm/insights";
    return "/firm/admin";
  }

  if (audience === "vendor") {
    if (surface === "workspace") return "/vendor";
    if (surface === "assessment") return "/vendor/product-assessment";
    if (surface === "results") return "/vendor/alignment-insights";
    if (surface === "insights") return "/vendor/alignment-insights";
    return "/vendor/profile";
  }

  if (surface === "workspace") return "/user";
  if (surface === "assessment") return "/user/alignment-assessment";
  if (surface === "results") return "/user/insights";
  if (surface === "insights") return "/user/insights";
  return "/user/profile";
}

export const patRoleConfigs: Record<PatRouteRole, RoleConfig> = {
  vendor: {
    key: "vendor",
    label: "Vendor",
    title: "Vendor PAT home",
    description:
      "Review the vendor-facing PAT path through vendor portal surfaces rather than the retired generic shells.",
    signInHref: "/sign-in/vendor",
    signInLabel: "Sign in as vendor",
    cards: [
      makeCard(
        "vendor-sign-in",
        "Vendor sign-in",
        "Enter PAT through the vendor path, then return directly to the vendor portal.",
        "/sign-in/vendor"
      ),
      makeCard(
        "vendor-platform",
        "Vendor portal",
        "Open the vendor PAT portal as the canonical workspace.",
        "/vendor"
      ),
      makeCard(
        "vendor-assessment",
        "Vendor product assessment",
        "Use the vendor product assessment flow instead of the shared survey compatibility route.",
        "/vendor/product-assessment"
      ),
      makeCard(
        "vendor-alignment",
        "Vendor alignment insights",
        "Use the vendor alignment insight portal instead of generic results or outputs shells.",
        "/vendor/alignment-insights"
      ),
      makeCard(
        "vendor-product-insight",
        "Vendor product insight",
        "Use the vendor product insight catalog for product-level PAT interpretation.",
        "/vendor/product-insight"
      ),
    ],
  },
  firm: {
    key: "firm",
    label: "Firm",
    title: "Firm PAT home",
    description:
      "Review the firm-facing PAT flow through firm portal surfaces rather than the retired generic shells.",
    signInHref: "/sign-in/firm",
    signInLabel: "Sign in as firm",
    cards: [
      makeCard(
        "firm-sign-in",
        "Firm sign-in",
        "Enter PAT through the firm path, then return directly to the firm portal.",
        "/sign-in/firm"
      ),
      makeCard(
        "firm-platform",
        "Firm portal",
        "Open the firm PAT portal as the canonical workspace.",
        "/firm"
      ),
      makeCard(
        "firm-assessment",
        "Firm alignment assessment",
        "Launch the five-module firm assessment instead of the shared survey compatibility route.",
        "/firm/alignment-assessment"
      ),
      makeCard(
        "firm-insights",
        "Firm insights",
        "Use the firm insight portal instead of generic results or outputs shells.",
        "/firm/insights"
      ),
      makeCard(
        "firm-admin",
        "Firm admin and profile",
        "Use the firm admin surface for company profile and operator settings.",
        "/firm/admin"
      ),
    ],
  },
  user: {
    key: "user",
    label: "User",
    title: "User PAT home",
    description:
      "Review the personal PAT scaffold through user portal surfaces rather than the retired generic shells.",
    signInHref: "/sign-in/user",
    signInLabel: "Sign in as user",
    cards: [
      makeCard(
        "user-sign-in",
        "User sign-in",
        "Enter PAT through the user path, then return directly to the user portal.",
        "/sign-in/user"
      ),
      makeCard(
        "user-platform",
        "User portal",
        "Open the user PAT portal as the canonical workspace.",
        "/user"
      ),
      makeCard(
        "user-assessment",
        "User alignment assessment",
        "Use the user alignment assessment route instead of the shared survey compatibility route.",
        "/user/alignment-assessment"
      ),
      makeCard(
        "user-insights",
        "User insights",
        "Use the user insight portal instead of the generic outputs shell.",
        "/user/insights"
      ),
      makeCard(
        "user-profile",
        "User profile",
        "Use the user profile surface instead of the generic profiles shell.",
        "/user/profile"
      ),
    ],
  },
};

export const signInHubCards = [
  {
    href: "/sign-in/vendor",
    label: "Vendor",
    description: "Continue as a vendor",
  },
  {
    href: "/sign-in/firm",
    label: "Firm",
    description: "Continue as a firm",
  },
  {
    href: "/sign-in/user",
    label: "User",
    description: "Continue as a user",
  },
  {
    href: "/sign-in/invitee",
    label: "Invitee",
    description: "Continue with secret code",
  },
] as const;
