import type { MembershipPlan, MembershipStatus } from "@prisma/client";
import {
  DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM,
  DEMO_PAT_ECOSYSTEM_VERSION,
} from "@/data/demoPatEcosystem";
import { FIRM_MODULE_DEFINITIONS, FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import { getLocalReviewAuthPolicy, LOCAL_REVIEW_USERS } from "@/lib/auth/localReview";
import { getDemoPatEcosystemHealth, type DemoPatEcosystemHealth } from "@/lib/demoPatEcosystemHealth";
import {
  emptyPilotCohortHealth,
  getPilotCohortHealth,
  type PilotCohortHealth,
} from "@/lib/pilotCohortHealth";
import prisma from "@/lib/prisma";
import {
  getPublicReleaseFingerprintView,
  getReleaseFingerprint,
  type PublicReleaseFingerprintView,
} from "@/lib/release/fingerprint";
import { VENDOR_PRODUCT_MODULE_KEY } from "@/lib/vendorPat";

type MetricTone = "ok" | "warn" | "neutral";

export type AdminLaunchMetric = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: MetricTone;
};

export type AdminLaunchTableRow = {
  key: string;
  cells: string[];
  tone?: MetricTone;
};

export type AdminLaunchLink = {
  href: string;
  label: string;
  description: string;
};

export type AdminLaunchControlView = {
  queryError: string | null;
  summaryCards: AdminLaunchMetric[];
  assessmentCards: AdminLaunchMetric[];
  insightCards: AdminLaunchMetric[];
  pilotCards: AdminLaunchMetric[];
  billingCards: AdminLaunchMetric[];
  localReviewCards: AdminLaunchMetric[];
  membershipDistributionRows: AdminLaunchTableRow[];
  failedWebhookRows: AdminLaunchTableRow[];
  pilotCohortRows: AdminLaunchTableRow[];
  releaseRows: AdminLaunchTableRow[];
  demoSeedVersion: string;
  demoHealth: DemoPatEcosystemHealth;
  pilotHealth: PilotCohortHealth;
  remediationLinks: AdminLaunchLink[];
};

export type AdminLaunchMembershipDistribution = {
  plan: MembershipPlan;
  status: MembershipStatus;
  count: number;
};

export type AdminLaunchWebhookFailure = {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  processingStatus: string;
  processingError: string | null;
  createdAt: Date;
  processedAt: Date | null;
};

export type AdminLaunchControlSource = {
  queryError?: string | null;
  counts: {
    vendors: number;
    vendorProfiles: number;
    firms: number;
    users: number;
    products: number;
  };
  assessments: {
    vendorProductExpected: number;
    vendorProductCompleted: number;
    firmAlignmentExpected: number;
    firmAlignmentCompleted: number;
    firmProductExpected: number;
    firmProductCompleted: number;
  };
  insights: {
    total: number;
    active: number;
    ruleBackedActive: number;
    productProfiles: number;
    productSignals: number;
    insightReadyProducts: number;
  };
  memberships: {
    total: number;
    distribution: AdminLaunchMembershipDistribution[];
  };
  billing: {
    customers: number;
    providerSubscriptions: number;
    unreconciledProviderSubscriptions: number;
    webhookEvents: number;
    failedWebhookEvents: number;
    recentFailedWebhookEvents: AdminLaunchWebhookFailure[];
  };
  localReview: {
    flagEnabled: boolean;
    credentialsProviderAvailable: boolean;
    runtimeAllowed: boolean;
    reason: string | null;
    seededUserCount: number;
    expectedUserCount: number;
  };
  release: PublicReleaseFingerprintView;
  demoHealth: DemoPatEcosystemHealth;
  pilotHealth: PilotCohortHealth;
};

const EMPTY_RELEASE: PublicReleaseFingerprintView = {
  releaseId: "unavailable",
  branch: "unavailable",
  commitSha: "unavailable",
  buildId: "unavailable",
  buildTimestamp: "unavailable",
  authMode: "unavailable",
  buildSourceType: "unavailable",
  canonicalRootName: "unavailable",
  releaseFingerprintSeed: "unavailable",
  startCommand: "unavailable",
  gitDirty: "unknown",
};

function formatPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return "0%";
  }

  return `${Math.round((numerator / denominator) * 100)}%`;
}

function formatCoverage(numerator: number, denominator: number) {
  return `${numerator}/${denominator} (${formatPercent(numerator, denominator)})`;
}

function coverageTone(numerator: number, denominator: number): MetricTone {
  if (denominator <= 0) {
    return "warn";
  }

  return numerator >= denominator ? "ok" : "warn";
}

function countByPlanStatus(
  distribution: AdminLaunchMembershipDistribution[],
  plan: MembershipPlan,
  status: MembershipStatus
) {
  return distribution.find((entry) => entry.plan === plan && entry.status === status)?.count ?? 0;
}

function totalForStatus(distribution: AdminLaunchMembershipDistribution[], status: MembershipStatus) {
  return distribution
    .filter((entry) => entry.status === status)
    .reduce((sum, entry) => sum + entry.count, 0);
}

function buildMembershipRows(distribution: AdminLaunchMembershipDistribution[]) {
  const plans: MembershipPlan[] = ["FREE", "PRO", "ELITE"];
  const statuses: MembershipStatus[] = [
    "ACTIVE",
    "TRIAL",
    "PENDING_CHECKOUT",
    "PAST_DUE",
    "CANCELED",
    "INCOMPLETE",
    "UNPAID",
    "PAYMENT_ACTION_REQUIRED",
  ];

  return statuses.map((status) => {
    const total = totalForStatus(distribution, status);
    const tone: MetricTone =
      total > 0 && ["PAST_DUE", "INCOMPLETE", "UNPAID", "PAYMENT_ACTION_REQUIRED"].includes(status)
        ? "warn"
        : "neutral";
    return {
      key: status,
      cells: [
        status,
        ...plans.map((plan) => String(countByPlanStatus(distribution, plan, status))),
        String(total),
      ],
      tone,
    };
  });
}

function buildReleaseRows(release: PublicReleaseFingerprintView): AdminLaunchTableRow[] {
  return [
    ["Release ID", release.releaseId],
    ["Branch", release.branch],
    ["Commit", release.commitSha],
    ["Build ID", release.buildId],
    ["Build timestamp", release.buildTimestamp],
    ["Canonical root", release.canonicalRootName],
    ["Auth mode", release.authMode],
    ["Build source", release.buildSourceType],
    ["Start command", release.startCommand],
    ["Git dirty", release.gitDirty],
  ].map(([label, value]) => ({
    key: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    cells: [label, value],
    tone: label === "Git dirty" && value !== "clean" ? "warn" : "neutral",
  }));
}

export function buildEmptyAdminLaunchControlSource(error: string): AdminLaunchControlSource {
  return {
    queryError: error,
    counts: {
      vendors: 0,
      vendorProfiles: 0,
      firms: 0,
      users: 0,
      products: 0,
    },
    assessments: {
      vendorProductExpected: 0,
      vendorProductCompleted: 0,
      firmAlignmentExpected: 0,
      firmAlignmentCompleted: 0,
      firmProductExpected: DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM,
      firmProductCompleted: 0,
    },
    insights: {
      total: 0,
      active: 0,
      ruleBackedActive: 0,
      productProfiles: 0,
      productSignals: 0,
      insightReadyProducts: 0,
    },
    memberships: {
      total: 0,
      distribution: [],
    },
    billing: {
      customers: 0,
      providerSubscriptions: 0,
      unreconciledProviderSubscriptions: 0,
      webhookEvents: 0,
      failedWebhookEvents: 0,
      recentFailedWebhookEvents: [],
    },
    localReview: {
      flagEnabled: false,
      credentialsProviderAvailable: false,
      runtimeAllowed: false,
      reason: "unavailable",
      seededUserCount: 0,
      expectedUserCount: LOCAL_REVIEW_USERS.length,
    },
    release: EMPTY_RELEASE,
    demoHealth: {
      ok: false,
      error,
      vendorCount: 0,
      productCount: 0,
      firmCount: 0,
      productProfileCount: 0,
      vendorProductPlanCount: 0,
      firmProductPlanCount: 0,
      productSignalCount: 0,
      vendorProductAssessmentCount: 0,
      firmAlignmentSubmissionCount: 0,
      firmProductAssessmentCount: 0,
      firmVendorRelationshipCount: 0,
      vendorProductScoreSpread: 0,
      firmProductScoreSpread: 0,
      firmAlignmentModuleScoreSpread: 0,
      highAlignmentProductCount: 0,
      lowAlignmentProductCount: 0,
      vendorSelfHigherThanFirmCount: 0,
      closeVendorFirmAlignmentCount: 0,
      routeReady: false,
    },
    pilotHealth: emptyPilotCohortHealth(error),
  };
}

export function buildAdminLaunchControlView(
  source: AdminLaunchControlSource
): AdminLaunchControlView {
  const demoTone: MetricTone = source.demoHealth.routeReady ? "ok" : "warn";
  const pilotBoundaryIsClean =
    source.pilotHealth.memberCount > 0 &&
    source.pilotHealth.pilotBoundaryMemberCount === source.pilotHealth.memberCount &&
    source.pilotHealth.demoBoundaryMemberCount === 0 &&
    source.pilotHealth.productionBoundaryMemberCount === 0;
  const pilotSupportAssigned = source.pilotHealth.rows.some((row) => row.supportContact !== "Unassigned");
  const billingNeedsAttention =
    source.billing.failedWebhookEvents > 0 || source.billing.unreconciledProviderSubscriptions > 0;
  const localReviewStatus = source.localReview.credentialsProviderAvailable
    ? "Available"
    : source.localReview.flagEnabled
      ? "Blocked"
      : "Disabled";

  return {
    queryError: source.queryError ?? source.demoHealth.error ?? source.pilotHealth.error,
    demoSeedVersion: DEMO_PAT_ECOSYSTEM_VERSION,
    demoHealth: source.demoHealth,
    pilotHealth: source.pilotHealth,
    summaryCards: [
      {
        key: "vendors",
        label: "Vendors",
        value: String(source.counts.vendors),
        detail: `${source.counts.vendorProfiles} vendor profiles linked`,
        tone: source.counts.vendors > 0 ? "ok" : "warn",
      },
      {
        key: "firms",
        label: "Firms",
        value: String(source.counts.firms),
        detail: "Firm customer accounts under launch review",
        tone: source.counts.firms > 0 ? "ok" : "warn",
      },
      {
        key: "users",
        label: "Users",
        value: String(source.counts.users),
        detail: "Operator, customer, consultant, and review users",
        tone: source.counts.users > 0 ? "ok" : "warn",
      },
      {
        key: "products",
        label: "Products",
        value: String(source.counts.products),
        detail: "Vendor-linked and firm-reviewed product records",
        tone: source.counts.products > 0 ? "ok" : "warn",
      },
    ],
    assessmentCards: [
      {
        key: "vendor-product-assessments",
        label: "Vendor product coverage",
        value: formatCoverage(
          source.assessments.vendorProductCompleted,
          source.assessments.vendorProductExpected
        ),
        detail: "Completed vendor product assessments over expected product records",
        tone: coverageTone(
          source.assessments.vendorProductCompleted,
          source.assessments.vendorProductExpected
        ),
      },
      {
        key: "firm-alignment-assessments",
        label: "Firm alignment coverage",
        value: formatCoverage(
          source.assessments.firmAlignmentCompleted,
          source.assessments.firmAlignmentExpected
        ),
        detail: "Completed firm alignment submissions over firm/module expectation",
        tone: coverageTone(
          source.assessments.firmAlignmentCompleted,
          source.assessments.firmAlignmentExpected
        ),
      },
      {
        key: "firm-product-assessments",
        label: "Firm product coverage",
        value: formatCoverage(
          source.assessments.firmProductCompleted,
          source.assessments.firmProductExpected
        ),
        detail: "Completed firm product reviews over launch relationship expectation",
        tone: coverageTone(
          source.assessments.firmProductCompleted,
          source.assessments.firmProductExpected
        ),
      },
    ],
    insightCards: [
      {
        key: "active-insights",
        label: "Active insights",
        value: `${source.insights.active}/${source.insights.total}`,
        detail: `${source.insights.ruleBackedActive} active insights have unlock or capability rules`,
        tone: source.insights.active > 0 ? "ok" : "warn",
      },
      {
        key: "insight-ready-products",
        label: "Insight-ready products",
        value: String(source.insights.insightReadyProducts),
        detail: `${source.insights.productProfiles} profiles · ${source.insights.productSignals} product signals`,
        tone: source.insights.insightReadyProducts > 0 ? "ok" : "warn",
      },
      {
        key: "demo-seed",
        label: "Demo seed",
        value: source.demoHealth.routeReady ? "Ready" : "Blocked",
        detail: `${DEMO_PAT_ECOSYSTEM_VERSION} · ${source.demoHealth.firmVendorRelationshipCount} firm/vendor links`,
        tone: demoTone,
      },
    ],
    pilotCards: [
      {
        key: "pilot-cohorts",
        label: "Pilot cohorts",
        value: String(source.pilotHealth.cohortCount),
        detail: `${source.pilotHealth.memberCount} pilot members tracked outside demo health`,
        tone: source.pilotHealth.cohortCount > 0 ? "ok" : "warn",
      },
      {
        key: "pilot-boundary",
        label: "Pilot data boundary",
        value: formatCoverage(
          source.pilotHealth.pilotBoundaryMemberCount,
          source.pilotHealth.memberCount
        ),
        detail: `Demo ${source.pilotHealth.demoBoundaryMemberCount} · Production ${source.pilotHealth.productionBoundaryMemberCount}`,
        tone: pilotBoundaryIsClean ? "ok" : "warn",
      },
      {
        key: "pilot-readiness",
        label: "Pilot readiness",
        value: source.pilotHealth.june1PilotReady ? "Ready" : "Blocked",
        detail: `${source.pilotHealth.activeCount} active · ${source.pilotHealth.provisioningCount} provisioning · ${source.pilotHealth.invitedCount} invited`,
        tone: source.pilotHealth.june1PilotReady ? "ok" : "warn",
      },
      {
        key: "pilot-support",
        label: "Pilot support",
        value: pilotSupportAssigned ? "Assigned" : "Unassigned",
        detail:
          source.pilotHealth.rows[0]?.supportContact ??
          "No pilot support contact is recorded",
        tone: pilotSupportAssigned ? "ok" : "warn",
      },
    ],
    billingCards: [
      {
        key: "billing-customers",
        label: "Billing customers",
        value: String(source.billing.customers),
        detail: "Provider customer records stored without raw card data",
        tone: "neutral",
      },
      {
        key: "provider-subscriptions",
        label: "Provider subscriptions",
        value: String(source.billing.providerSubscriptions),
        detail: `${source.billing.unreconciledProviderSubscriptions} missing last reconciliation timestamp`,
        tone: source.billing.unreconciledProviderSubscriptions > 0 ? "warn" : "ok",
      },
      {
        key: "webhook-events",
        label: "Webhook events",
        value: String(source.billing.webhookEvents),
        detail: `${source.billing.failedWebhookEvents} failed provider events`,
        tone: billingNeedsAttention ? "warn" : "ok",
      },
    ],
    localReviewCards: [
      {
        key: "local-review-auth",
        label: "Local review auth",
        value: localReviewStatus,
        detail: source.localReview.reason ?? "Loopback policy permits deterministic local review sign-in",
        tone: source.localReview.credentialsProviderAvailable ? "ok" : "neutral",
      },
      {
        key: "local-review-users",
        label: "Review users",
        value: `${source.localReview.seededUserCount}/${source.localReview.expectedUserCount}`,
        detail: "Seeded deterministic review accounts for local QA",
        tone:
          source.localReview.seededUserCount >= source.localReview.expectedUserCount ? "ok" : "warn",
      },
    ],
    membershipDistributionRows: buildMembershipRows(source.memberships.distribution),
    failedWebhookRows:
      source.billing.recentFailedWebhookEvents.length > 0
        ? source.billing.recentFailedWebhookEvents.map((event) => ({
            key: event.id,
            cells: [
              event.provider,
              event.eventType,
              event.processingStatus,
              event.processingError ?? "No error message recorded",
              event.createdAt.toISOString(),
            ],
            tone: "warn",
          }))
        : [
            {
              key: "no-failed-webhooks",
              cells: ["No failed webhook events", "No remediation needed", "", "", ""],
              tone: "ok",
            },
          ],
    pilotCohortRows:
      source.pilotHealth.rows.length > 0
        ? source.pilotHealth.rows.map((row) => ({
            key: row.key,
            cells: [
              row.name,
              row.dataBoundary,
              row.startsAt ?? "No start date",
              `${row.memberCount} total · ${row.vendorMemberCount} vendors · ${row.firmMemberCount} firms · ${row.userMemberCount} users`,
              `${row.activeCount} active · ${row.provisioningCount} provisioning · ${row.invitedCount} invited · ${row.blockedCount} blocked`,
              row.ownerContact,
              row.supportContact,
            ],
            tone: row.dataBoundary === "PILOT" && row.blockedCount === 0 ? "ok" : "warn",
          }))
        : [
            {
              key: "no-pilot-cohorts",
              cells: [
                "No pilot cohorts",
                "UNVERIFIED",
                "",
                "0 total",
                "0 active",
                "Unassigned",
                "Unassigned",
              ],
              tone: "warn",
            },
          ],
    releaseRows: buildReleaseRows(source.release),
    remediationLinks: [
      {
        href: "/admin/runtime",
        label: "Runtime controls",
        description: "Portal visibility, diagnostics, billing webhook status, and audit feed.",
      },
      {
        href: "/admin/organizations",
        label: "Customer accounts",
        description: "Organization membership, provider status, users, and product context.",
      },
      {
        href: "/admin/users",
        label: "User accounts",
        description: "Role assignment, company linkage, and individual membership state.",
      },
      {
        href: "/admin/products",
        label: "Products",
        description: "Product records, taxonomy assignments, and capability mapping coverage.",
      },
      {
        href: "/admin/briefings",
        label: "Briefings",
        description: "Operator-ready readiness, risk, and assessment coverage summaries.",
      },
      {
        href: "/release",
        label: "Public build proof",
        description: "Public release fingerprint fields served by the current build.",
      },
    ],
  };
}

function safeReleaseFingerprint() {
  try {
    return getPublicReleaseFingerprintView(getReleaseFingerprint());
  } catch {
    return EMPTY_RELEASE;
  }
}

export async function getAdminLaunchControlData(): Promise<AdminLaunchControlView> {
  try {
    const firmModuleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);
    const localReviewPolicy = getLocalReviewAuthPolicy();
    const localReviewEmails = LOCAL_REVIEW_USERS.map((user) => user.email);

    const [
      vendors,
      vendorProfiles,
      firms,
      users,
      products,
      vendorModule,
      firmProductModule,
      firmModules,
      activeInsights,
      totalInsights,
      ruleBackedActiveInsights,
      membershipGroups,
      membershipTotal,
      billingCustomers,
      providerSubscriptions,
      unreconciledProviderSubscriptions,
      webhookEvents,
      failedWebhookEvents,
      recentFailedWebhookEvents,
      seededLocalReviewUsers,
      demoHealth,
      pilotHealth,
    ] = await Promise.all([
      prisma.company.count({ where: { type: "VENDOR" } }),
      prisma.vendorProfile.count(),
      prisma.company.count({ where: { type: "FIRM" } }),
      prisma.user.count(),
      prisma.product.count(),
      prisma.surveyModule.findUnique({
        where: { key: VENDOR_PRODUCT_MODULE_KEY },
        select: { id: true },
      }),
      prisma.surveyModule.findUnique({
        where: { key: FIRM_PRODUCT_MODULE_KEY },
        select: { id: true },
      }),
      prisma.surveyModule.findMany({
        where: { key: { in: firmModuleKeys } },
        select: { id: true },
      }),
      prisma.insight.count({ where: { active: true } }),
      prisma.insight.count(),
      prisma.insight.count({
        where: {
          active: true,
          OR: [
            { InsightUnlockRule: { some: {} } },
            { InsightCapabilityRule: { some: {} } },
          ],
        },
      }),
      prisma.membershipSubscription.groupBy({
        by: ["plan", "status"],
        _count: { _all: true },
      }),
      prisma.membershipSubscription.count(),
      prisma.billingCustomer.count().catch(() => 0),
      prisma.membershipSubscription.count({
        where: { provider: { not: null } },
      }).catch(() => 0),
      prisma.membershipSubscription.count({
        where: {
          provider: { not: null },
          lastReconciledAt: null,
        },
      }).catch(() => 0),
      prisma.billingWebhookEvent.count().catch(() => 0),
      prisma.billingWebhookEvent.count({
        where: {
          OR: [
            { processingStatus: "failed" },
            { processingError: { not: null } },
          ],
        },
      }).catch(() => 0),
      prisma.billingWebhookEvent.findMany({
        where: {
          OR: [
            { processingStatus: "failed" },
            { processingError: { not: null } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          provider: true,
          providerEventId: true,
          eventType: true,
          processingStatus: true,
          processingError: true,
          createdAt: true,
          processedAt: true,
        },
      }).catch(() => []),
      prisma.user.count({ where: { email: { in: localReviewEmails } } }).catch(() => 0),
      getDemoPatEcosystemHealth(),
      getPilotCohortHealth(),
    ]);

    const productIds = await prisma.product.findMany({ select: { id: true } });
    const productIdValues = productIds.map((product) => product.id);
    const firmModuleIds = firmModules.map((module) => module.id);

    const [
      productProfileCount,
      productSignalCount,
      insightReadyProducts,
      vendorProductCompleted,
      firmAlignmentCompleted,
      firmProductCompleted,
    ] = await Promise.all([
      prisma.productProfile.count({
        where: { productId: { in: productIdValues } },
      }),
      prisma.productSignal.count({
        where: { productId: { in: productIdValues } },
      }),
      prisma.product.count({
        where: {
          ProductProfile: { isNot: null },
          ProductSignal: { some: {} },
        },
      }),
      vendorModule
        ? prisma.surveySubmission.count({
            where: {
              moduleId: vendorModule.id,
              Subject: { productId: { not: null } },
              scoreVersion: { gt: 0 },
            },
          })
        : Promise.resolve(0),
      prisma.surveySubmission.count({
        where: {
          moduleId: { in: firmModuleIds },
          Company: { type: "FIRM" },
          scoreVersion: { gt: 0 },
        },
      }),
      firmProductModule
        ? prisma.surveySubmission.count({
            where: {
              moduleId: firmProductModule.id,
              Subject: { productId: { not: null } },
              scoreVersion: { gt: 0 },
            },
          })
        : Promise.resolve(0),
    ]);

    const source: AdminLaunchControlSource = {
      counts: {
        vendors,
        vendorProfiles,
        firms,
        users,
        products,
      },
      assessments: {
        vendorProductExpected: products,
        vendorProductCompleted,
        firmAlignmentExpected: firms * firmModules.length,
        firmAlignmentCompleted,
        firmProductExpected: DEMO_FIRM_VENDOR_RELATIONSHIP_MINIMUM,
        firmProductCompleted,
      },
      insights: {
        total: totalInsights,
        active: activeInsights,
        ruleBackedActive: ruleBackedActiveInsights,
        productProfiles: productProfileCount,
        productSignals: productSignalCount,
        insightReadyProducts,
      },
      memberships: {
        total: membershipTotal,
        distribution: membershipGroups.map((group) => ({
          plan: group.plan,
          status: group.status,
          count: group._count._all,
        })),
      },
      billing: {
        customers: billingCustomers,
        providerSubscriptions,
        unreconciledProviderSubscriptions,
        webhookEvents,
        failedWebhookEvents,
        recentFailedWebhookEvents,
      },
      localReview: {
        flagEnabled: localReviewPolicy.flagEnabled,
        credentialsProviderAvailable: localReviewPolicy.credentialsProviderAvailable,
        runtimeAllowed: localReviewPolicy.runtimeAllowed,
        reason: localReviewPolicy.reason,
        seededUserCount: seededLocalReviewUsers,
        expectedUserCount: LOCAL_REVIEW_USERS.length,
      },
      release: safeReleaseFingerprint(),
      demoHealth,
      pilotHealth,
    };

    return buildAdminLaunchControlView(source);
  } catch (error) {
    return buildAdminLaunchControlView(
      buildEmptyAdminLaunchControlSource(error instanceof Error ? error.message : String(error))
    );
  }
}
