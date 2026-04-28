import type { PublicReleaseFingerprintView } from "@/lib/release/fingerprint";

export type TrustSurfaceKey =
  | "trust"
  | "privacy"
  | "terms"
  | "security"
  | "support"
  | "billingPolicy"
  | "release";

export type TrustSurfaceSection = {
  title: string;
  body: string;
  bullets?: readonly string[];
};

export type TrustSurface = {
  key: TrustSurfaceKey;
  href: string;
  label: string;
  eyebrow: string;
  title: string;
  summary: string;
  statusLabel: string;
  lastUpdated: string;
  sections: readonly TrustSurfaceSection[];
};

export type TrustReleaseFieldKey = keyof PublicReleaseFingerprintView;

export type TrustReleaseField = {
  key: TrustReleaseFieldKey;
  label: string;
  description: string;
};

export const TRUST_SURFACE_LAST_UPDATED = "April 28, 2026";

export const TRUST_SURFACE_ORDER = [
  "privacy",
  "terms",
  "security",
  "support",
  "billingPolicy",
  "release",
] as const satisfies readonly TrustSurfaceKey[];

export const TRUST_FOOTER_LINKS = [
  { href: "/trust", label: "Trust" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/security", label: "Security" },
  { href: "/support", label: "Support" },
  { href: "/billing-policy", label: "Billing policy" },
  { href: "/release", label: "Release" },
] as const;

export const TRUST_RELEASE_FIELDS = [
  {
    key: "releaseId",
    label: "Release ID",
    description: "Stable identifier derived from the current commit and build output.",
  },
  {
    key: "branch",
    label: "Branch",
    description: "Git branch that produced the currently served build.",
  },
  {
    key: "commitSha",
    label: "Commit SHA",
    description: "Full source commit for the runtime fingerprint.",
  },
  {
    key: "buildId",
    label: "Build ID",
    description: "Next.js build identifier emitted by the build process.",
  },
  {
    key: "buildTimestamp",
    label: "Build timestamp",
    description: "UTC timestamp carried through release-state proof.",
  },
  {
    key: "canonicalRootName",
    label: "Canonical root",
    description: "Repository root name only; the full local filesystem path is not exposed.",
  },
  {
    key: "startCommand",
    label: "Start command",
    description: "Runtime start command expected by the launch validators.",
  },
  {
    key: "authMode",
    label: "Auth mode",
    description: "Configured authentication mode for the current runtime.",
  },
  {
    key: "buildSourceType",
    label: "Build source",
    description: "Build/runtime source type used by release validation.",
  },
  {
    key: "releaseFingerprintSeed",
    label: "Fingerprint seed",
    description: "Hash input proof tying root, commit, auth, and build source together.",
  },
  {
    key: "gitDirty",
    label: "Git dirty state",
    description: "Clean or dirty source state reported by the startup and release proof chain.",
  },
] as const satisfies readonly TrustReleaseField[];

export const TRUST_SURFACES = {
  trust: {
    key: "trust",
    href: "/trust",
    label: "Trust",
    eyebrow: "PAT trust center",
    title: "Launch-readiness information for PAT review.",
    summary:
      "This hub links the current privacy, terms, security, support, billing, and release transparency surfaces for PAT. The language is intentionally conservative while the product is in local review and pre-public launch.",
    statusLabel: "Launch review surface",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Current stage",
        body:
          "PAT is being prepared for public launch with local validation, release fingerprints, provider-backed billing scaffolding, and role-specific onboarding. Public-live state remains unverified unless a reachable deployment URL is supplied and validated.",
      },
      {
        title: "No unsupported claims",
        body:
          "PAT does not claim third-party certification, audited status, uptime SLA, public customer references, or regulated-industry compliance certification at this stage.",
      },
    ],
  },
  privacy: {
    key: "privacy",
    href: "/privacy",
    label: "Privacy",
    eyebrow: "Privacy policy draft",
    title: "PAT privacy policy draft.",
    summary:
      "This draft describes the data PAT expects to process during review and early launch. It is not a final legal policy until approved by counsel or the operator of record.",
    statusLabel: "Policy draft",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Data PAT uses",
        body:
          "PAT uses account, organization, role, membership, assessment, product, and insight state to route users and generate the product experience. Local review credentials and seeded demo records are used only to validate the application locally.",
        bullets: [
          "Account data can include name, email, role, authentication provider identifiers, and session metadata.",
          "Organization data can include vendor, firm, product, membership, and assessment relationships.",
          "Assessment data can include submitted answers, scoring inputs, derived status, and generated insight readiness.",
        ],
      },
      {
        title: "Payment data",
        body:
          "PAT uses provider-hosted checkout when billing is configured. The app does not store raw card numbers; provider customer, subscription, invoice, and webhook references are stored only as needed for reconciliation and entitlement state.",
      },
      {
        title: "Review and support use",
        body:
          "Support and operator review may inspect account, billing status, assessment, and release proof records to diagnose product issues. PAT should not be used to submit sensitive client files unless a production data handling policy has been approved.",
      },
    ],
  },
  terms: {
    key: "terms",
    href: "/terms",
    label: "Terms",
    eyebrow: "Terms of service draft",
    title: "PAT terms of service draft.",
    summary:
      "These draft terms set expectations for review access and early launch use. They do not replace signed commercial terms or legal review.",
    statusLabel: "Policy draft",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Access and acceptable use",
        body:
          "PAT access is role-based for vendors, firms, individual users, consultants, and operators. Users are responsible for using the correct role path and for keeping any assigned credentials secure.",
      },
      {
        title: "Product output",
        body:
          "PAT outputs are product and operational decision support. They are not legal, tax, audit, investment, or professional advice, and generated insight copy should be reviewed before external use.",
      },
      {
        title: "Availability and changes",
        body:
          "PAT is still under launch review. Features, plan packaging, onboarding paths, and billing behavior can change before production launch, and no availability SLA is offered by this draft.",
      },
    ],
  },
  security: {
    key: "security",
    href: "/security",
    label: "Security",
    eyebrow: "Security posture",
    title: "PAT security posture.",
    summary:
      "This page summarizes implemented safeguards and current boundaries without claiming external certification or audit completion.",
    statusLabel: "Launch posture",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Authentication boundaries",
        body:
          "Production authentication is provider-backed. Local review credentials are explicitly gated by environment and loopback rules so they are not confused with public production auth.",
      },
      {
        title: "Sensitive operations",
        body:
          "Billing and account-sensitive operations are protected by route-level guards, rate-limit checks, and elevated confirmation where supported by the current runtime. Session payloads are kept to the fields needed for routing and authorization.",
      },
      {
        title: "Release and runtime proof",
        body:
          "Startup preserves a dirty-tree guard, and release validators compare canonical root, branch, commit, build ID, build timestamp, auth mode, start command, and git dirty state across runtime artifacts.",
      },
      {
        title: "Billing data boundary",
        body:
          "Card entry is delegated to the payment provider when billing is configured. PAT stores provider identifiers and reconciliation status; it does not store raw card numbers.",
      },
    ],
  },
  support: {
    key: "support",
    href: "/support",
    label: "Support",
    eyebrow: "Support and contact",
    title: "How to contact PAT support during launch review.",
    summary:
      "Support expectations are intentionally scoped for local review and early launch. Always-on public support is not claimed here.",
    statusLabel: "Support draft",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "What to include",
        body:
          "For product issues, include your role path, the page URL, the assessment or product you were using, and the release ID shown in the footer or release transparency page.",
      },
      {
        title: "Local review support",
        body:
          "If you are reviewing locally, report whether you used vendor, firm, individual, consultant, or admin review access and include any validation command that failed.",
      },
      {
        title: "Billing support",
        body:
          "For billing issues, include the plan path and whether the page showed provider checkout or scaffold/no-live-charge mode. Do not send card numbers or raw payment credentials through support messages.",
      },
    ],
  },
  billingPolicy: {
    key: "billingPolicy",
    href: "/billing-policy",
    label: "Billing policy",
    eyebrow: "Billing policy draft",
    title: "PAT billing policy draft.",
    summary:
      "This draft explains how billing should behave when provider configuration is present and how the UI must stay honest when it is absent.",
    statusLabel: "Policy draft",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Provider-backed checkout",
        body:
          "When billing is configured, checkout and customer portal sessions are created through the payment provider. Entitlements derive from reconciled provider subscription state, not client-supplied plan parameters.",
      },
      {
        title: "Scaffold mode",
        body:
          "When billing is disabled or required environment variables are missing, PAT must say that payment is scaffold-only and no live charge will be created.",
      },
      {
        title: "Subscription states",
        body:
          "Membership access is reconciled from provider statuses such as active, trialing, past_due, canceled, incomplete, unpaid, and payment action required.",
      },
      {
        title: "Refunds and cancellation",
        body:
          "Refund and cancellation procedures remain a policy draft until commercial terms are finalized. Provider records remain the source of truth for billing status.",
      },
    ],
  },
  release: {
    key: "release",
    href: "/release",
    label: "Release",
    eyebrow: "Release transparency",
    title: "Current PAT release and build transparency.",
    summary:
      "This page shows the public runtime fingerprint for the currently served PAT build and explains which release fields are validated together.",
    statusLabel: "Runtime proof",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Single release identity",
        body:
          "PAT release proof compares the same branch, commit, build ID, build timestamp, canonical root, start command, auth mode, and git dirty state across build state, health payloads, runtime fingerprint, and launch validators.",
      },
      {
        title: "Public-live status",
        body:
          "Manual QA is local-only unless a public deployment artifact exists. Public-live release state remains UNVERIFIED without live URL proof.",
      },
    ],
  },
} as const satisfies Record<TrustSurfaceKey, TrustSurface>;

export function getTrustSurface(key: TrustSurfaceKey): TrustSurface {
  return TRUST_SURFACES[key];
}

export function getTrustSurfaceCards() {
  return TRUST_SURFACE_ORDER.map((key) => TRUST_SURFACES[key]);
}

export function getAllTrustSurfaceText() {
  return Object.values(TRUST_SURFACES)
    .flatMap((surface) => [
      surface.href,
      surface.label,
      surface.eyebrow,
      surface.title,
      surface.summary,
      surface.statusLabel,
      ...surface.sections.flatMap((section) => [
        section.title,
        section.body,
        ...("bullets" in section ? section.bullets : []),
      ]),
    ])
    .join("\n");
}
