import type { PublicReleaseFingerprintView } from "@/lib/release/fingerprint";

export type TrustSurfaceKey =
  | "trust"
  | "privacy"
  | "terms"
  | "security"
  | "support"
  | "billingPolicy"
  | "methodology"
  | "patGovernance"
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
  "methodology",
  "patGovernance",
  "release",
] as const satisfies readonly TrustSurfaceKey[];

export const TRUST_FOOTER_LINKS = [
  { href: "/trust", label: "Trust" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/security", label: "Security" },
  { href: "/support", label: "Support" },
  { href: "/billing-policy", label: "Billing policy" },
  { href: "/methodology", label: "Methodology" },
  { href: "/trust/pat", label: "How Pat is governed" },
  { href: "/release", label: "Build proof" },
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
    eyebrow: "Trust Center 2026",
    title: "How PAT earns trust.",
    summary:
      "Privacy, terms, security, support, billing, and release transparency for PAT — each linked below.",
    statusLabel: "Trust Center 2026",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Current stage",
        body:
          "PAT runs on verified releases — every release is checked against its source — with provider-backed billing and role-specific access.",
      },
      {
        title: "No unsupported claims",
        body:
          "PAT does not claim third-party certification, audited status, uptime SLA, public customer references, or regulated-industry compliance certification.",
      },
    ],
  },
  privacy: {
    key: "privacy",
    href: "/privacy",
    label: "Privacy",
    eyebrow: "Privacy policy",
    title: "PAT privacy policy draft.",
    summary:
      "What PAT processes and why. It is not a final legal policy until approved by counsel or the operator of record.",
    statusLabel: "Policy draft",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Data PAT uses",
        body:
          "PAT uses account, organization, role, membership, assessment, product, and insight state to route users and generate the product experience.",
        bullets: [
          "Account data can include name, email, role, authentication provider identifiers, and session metadata.",
          "Organization data can include vendor, firm, product, membership, and assessment relationships.",
          "Assessment data can include submitted answers, scoring inputs, derived status, and generated insight readiness.",
        ],
      },
      {
        title: "Payment data",
        body:
          "PAT uses provider-hosted checkout. The app does not store raw card numbers; provider customer, subscription, invoice, and webhook references are stored only as needed for reconciliation and to track what your plan includes.",
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
    eyebrow: "Terms of service",
    title: "PAT terms of service draft.",
    summary:
      "Draft terms for PAT use. They do not replace signed commercial terms or legal review.",
    statusLabel: "Policy draft",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "Access and acceptable use",
        body:
          "PAT access is role-based for vendors, firms, consultants, and operators. Users are responsible for using the correct sign-in path (vendor, firm, consultant, admin) and for keeping any assigned credentials secure.",
      },
      {
        title: "Product output",
        body:
          "PAT outputs are product and operational decision support. They are not legal, tax, audit, investment, or professional advice, and generated insight copy should be reviewed before external use.",
      },
      {
        title: "Availability and changes",
        body:
          "Features, plan packaging, onboarding, and billing may change. No availability SLA is offered.",
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
          "Production authentication is provider-backed. Local review credentials are restricted to local machines and cannot be used against public production auth.",
      },
      {
        title: "Sensitive operations",
        body:
          "Billing and account-sensitive operations are protected by route-level guards, rate-limit checks, and elevated confirmation where supported by the current runtime. Session payloads are kept to the fields needed for routing and authorization.",
      },
      {
        title: "Release and runtime proof",
        body:
          "We verify that every release matches its source before it serves, and the full technical proof — branch, commit, build identity, and runtime checks — is published on the release page at /release.",
      },
      {
        title: "Billing data boundary",
        body:
          "Card entry is delegated to the payment provider when billing is configured. PAT stores provider identifiers and reconciliation status; it does not store raw card numbers.",
      },
      {
        title: "Subprocessors",
        body:
          "PAT relies on a small set of infrastructure and service providers to operate. We inherit each provider's own infrastructure controls; PAT does not claim its own external certification.",
        bullets: [
          "Vercel — application hosting and edge/serverless compute.",
          "Neon — managed PostgreSQL database (pooled, with connection management).",
          "Stripe — payment processing and provider-hosted checkout when billing is configured.",
          "Anthropic — large-language-model provider powering optional AI-assisted features (no customer data is used to train third-party models).",
        ],
      },
      {
        title: "Data practices and methodology",
        body:
          "Data is transmitted over encrypted connections. Retention is configured per data class with a soft-delete window before hard purge, and tested tenant export and deletion paths exist for contractual data-subject requests. How PAT computes its scores and benchmarks — including the integrity walls that keep demo data and vendor self-report out of peer aggregates — is published on the versioned methodology page at /methodology.",
      },
    ],
  },
  support: {
    key: "support",
    href: "/support",
    label: "Support",
    eyebrow: "Support and contact",
    title: "How to contact PAT support.",
    summary:
      "How to reach PAT support. Always-on public support is not claimed here.",
    statusLabel: "Support draft",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "What to include",
        body:
          "For product issues, include your role path, the page URL, the assessment or product you were using, and the release ID shown in the footer or release transparency page.",
      },
      {
        title: "If something fails",
        body:
          "Report which access path you used (vendor, firm, consultant, or admin) and any command or step that failed.",
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
    eyebrow: "Billing policy",
    title: "PAT billing policy draft.",
    summary:
      "How PAT billing behaves when a payment provider is configured — and how the UI stays honest when it isn't.",
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
  methodology: {
    key: "methodology",
    href: "/methodology",
    label: "Methodology",
    eyebrow: "Aggregation methodology",
    title: "How Patalign computes its scores and benchmarks.",
    summary:
      "The stated, versioned methodology behind every alignment score, divergence reading, and peer benchmark: equal-weight averaging, sample floors, confidence bands, minimum-n benchmark suppression, and the integrity walls that keep demo data and vendor self-report out of peer aggregates.",
    statusLabel: "Versioned · public",
    lastUpdated: "July 10, 2026",
    sections: [
      {
        title: "Directional, not professional advice",
        body:
          "Figures are plain averages with the sample size shown — never weighted, percentile, or significance-tested statistics, and never professional advice. Where evidence is thin, the surface says so; where a peer benchmark cannot be published responsibly, an insufficient-data state is shown instead of a number.",
      },
      {
        title: "Versioned and changelogged",
        body:
          "Material changes to the methodology are versioned with a public changelog. The full detail — averaging, divergence floor, confidence bands, suppression, integrity walls, and rounding — is rendered below and mirrors the source aggregation-methodology document.",
      },
    ],
  },
  patGovernance: {
    key: "patGovernance",
    href: "/trust/pat",
    label: "How Pat is governed",
    eyebrow: "AI governance",
    title: "How Pat is governed.",
    summary:
      "Pat is Patalign's AI assistant. It helps with questions, reminders, and reports. Here is exactly how we keep it in bounds — these are system controls, not policies.",
    statusLabel: "System controls",
    lastUpdated: TRUST_SURFACE_LAST_UPDATED,
    sections: [
      {
        title: "A person approves what matters.",
        body:
          "Pat drafts; designated humans review and approve customer-facing messages before they send. Approval requirements loosen only with a track record, never by default.",
      },
      {
        title: "Everything is logged.",
        body:
          "Every Pat action is recorded in an audit log — what ran, what it read, what it produced, and who approved it.",
      },
      {
        title: "Spending is capped.",
        body:
          "Every Pat run has hard cost and step limits. Runaway behavior stops itself.",
      },
      {
        title: "A named person can stop it.",
        body:
          "A designated owner can pause any Pat function immediately, platform-wide. Owner on file: C. Garrett.",
      },
      {
        title: "Pat says what it is.",
        body:
          "Every Pat-drafted message is labeled as AI-drafted and human-reviewed. Pat never poses as a person.",
      },
      {
        title: "Your data stays small.",
        body:
          "Pat only sees the minimum data needed for the task at hand, and client assessment answers are never used to train third-party AI models.",
      },
      {
        title: "Versions are pinned and tested.",
        body:
          "Pat runs on specific, tested AI model versions. Upgrades happen only after our regression checks pass — never silently.",
      },
      {
        title: "When something goes wrong, there's a procedure.",
        body:
          "Detect, pause, notify affected customers, fix, and record the post-mortem in the audit log.",
      },
      {
        title: "Standards alignment.",
        body:
          "Our approach is aligned with the NIST AI Risk Management Framework. The math behind every number Pat cites is public on our Methodology page.",
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
