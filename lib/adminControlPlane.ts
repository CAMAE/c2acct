import {
  CompanyType,
  MembershipPlan,
  MembershipStatus,
  ModuleScope,
  ProductCapabilityCoverage,
  ProductTaxonomyFit,
  QuestionInputType,
  ResearchConfidence,
  TaxonomyBucketKind,
} from "@prisma/client";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { canAccessPortalAdmin } from "@/lib/authz";
import { deriveBillingAdminMetrics, getBillingConfiguration } from "@/lib/billing";
import { getAnalyticsConfiguration } from "@/lib/analytics";
import { getCommercialFeatureFlags } from "@/lib/commercialFlags";
export {
  ADMIN_OVERVIEW_UTILITIES,
  ADMIN_ROUTE_GROUPS,
  getAdminOverviewUtilityHref,
  normalizeAdminOverviewUtility,
  type AdminOverviewUtilityKey,
} from "@/lib/adminOverview";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getPatDiagnosticsSnapshot } from "@/lib/patDiagnostics";
import { getSentryConfiguration } from "@/lib/sentry";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/modules", label: "Modules" },
  { href: "/admin/insights", label: "Insights" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/briefings", label: "Briefings" },
  { href: "/admin/runtime", label: "Runtime" },
] as const;

export const COMPANY_TYPE_OPTIONS = [CompanyType.FIRM, CompanyType.VENDOR] as const;
export const MEMBERSHIP_PLAN_OPTIONS = [
  MembershipPlan.FREE,
  MembershipPlan.PRO,
  MembershipPlan.ELITE,
] as const;
export const MEMBERSHIP_STATUS_OPTIONS = [
  MembershipStatus.ACTIVE,
  MembershipStatus.TRIAL,
  MembershipStatus.PENDING_CHECKOUT,
  MembershipStatus.PAST_DUE,
  MembershipStatus.CANCELED,
] as const;
export const MODULE_SCOPE_OPTIONS = [
  ModuleScope.FIRM,
  ModuleScope.VENDOR,
  ModuleScope.PRODUCT,
  ModuleScope.ENTERPRISE,
] as const;
export const QUESTION_INPUT_TYPE_OPTIONS = [
  QuestionInputType.SLIDER,
  QuestionInputType.SELECT,
  QuestionInputType.MULTISELECT,
  QuestionInputType.BOOLEAN,
  QuestionInputType.NUMBER,
  QuestionInputType.TEXT,
] as const;
export const TAXONOMY_BUCKET_KIND_OPTIONS = [
  TaxonomyBucketKind.FUNCTION,
  TaxonomyBucketKind.WORKFLOW_STAGE,
  TaxonomyBucketKind.COMPLIANCE_DOMAIN,
  TaxonomyBucketKind.DELIVERY_MODEL,
] as const;
export const RESEARCH_CONFIDENCE_OPTIONS = [
  ResearchConfidence.UNKNOWN,
  ResearchConfidence.LOW,
  ResearchConfidence.MEDIUM,
  ResearchConfidence.HIGH,
] as const;
export const PRODUCT_TAXONOMY_FIT_OPTIONS = [
  ProductTaxonomyFit.PRIMARY,
  ProductTaxonomyFit.SECONDARY,
  ProductTaxonomyFit.ADJACENT,
] as const;
export const PRODUCT_CAPABILITY_COVERAGE_OPTIONS = [
  ProductCapabilityCoverage.CORE,
  ProductCapabilityCoverage.SUPPORTING,
  ProductCapabilityCoverage.ADJACENT,
] as const;

export async function requireAdminSession(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in?view=admin&callbackUrl=%2Fadmin");
  }

  if (!canAccessPortalAdmin(sessionUser)) {
    redirect("/");
  }

  return sessionUser;
}

export async function getAdminAccessState() {
  const sessionUser = await getSessionUser();
  return {
    sessionUser,
    isAdmin: canAccessPortalAdmin(sessionUser),
  };
}

export async function getAdminOverviewData() {
  await requireAdminSession();
  const canonicalFirmModuleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);
  const diagnosticsSnapshot = getPatDiagnosticsSnapshot();

  const [
    organizations,
    users,
    products,
    modules,
    sections,
    insights,
    taxonomyBuckets,
    capabilityNodes,
    portals,
    memberships,
    auditEvents,
    billingSubscriptions,
    billingCheckouts,
    billingWebhooks,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.product.count(),
    prisma.surveyModule.count(),
    prisma.surveySection.count().catch(() => 0),
    prisma.insight.count(),
    prisma.taxonomyBucket.count(),
    prisma.capabilityNode.count(),
    prisma.portal.count(),
    prisma.membershipSubscription.count().catch(() => 0),
    prisma.operatorAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        Actor: {
          select: { email: true },
        },
      },
    }).catch(() => []),
    prisma.membershipSubscription.findMany({
      select: {
        plan: true,
        status: true,
        updatedAt: true,
        createdAt: true,
      },
    }).catch(() => []),
    prisma.billingCheckout.findMany({
      select: {
        status: true,
        requestedPlan: true,
        createdAt: true,
        completedAt: true,
      },
    }).catch(() => []),
    prisma.billingWebhookEvent.findMany({
      select: {
        status: true,
        receivedAt: true,
      },
    }).catch(() => []),
  ]);
  const billingMetrics = deriveBillingAdminMetrics({
    subscriptions: billingSubscriptions,
    checkouts: billingCheckouts,
    webhookEvents: billingWebhooks,
  });
  const billingConfig = getBillingConfiguration();
  const commercialFlags = getCommercialFeatureFlags();
  const analyticsConfig = getAnalyticsConfiguration();
  const sentryConfig = getSentryConfiguration();
  const recentPaymentEvents = await prisma.billingWebhookEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: 5,
    select: {
      id: true,
      eventType: true,
      status: true,
      receivedAt: true,
      errorMessage: true,
    },
  }).catch(() => []);

  const canonicalModules = await prisma.surveyModule.findMany({
    where: { key: { in: canonicalFirmModuleKeys } },
    orderBy: { key: "asc" },
    select: {
      key: true,
      title: true,
      active: true,
      _count: {
        select: {
          SurveyQuestion: true,
          SurveySection: true,
          SurveySubmission: true,
        },
      },
    },
  });

  return {
    metrics: {
      organizations,
      users,
      products,
      modules,
      sections,
      insights,
      taxonomyBuckets,
      capabilityNodes,
      portals,
      memberships,
      billing: billingMetrics,
      billingConfigured: billingConfig.enabled,
      liveBillingMethods: billingConfig.liveMethodKeys,
      commercialFlags,
      telemetry: {
        analyticsConfigured: analyticsConfig.enabled,
        sentryConfigured: sentryConfig.enabled,
      },
    },
    canonicalModules,
    diagnosticsSnapshot,
    auditEvents,
    recentPaymentEvents,
  };
}

export { buildOperatorBriefings } from "@/lib/adminBriefings";
