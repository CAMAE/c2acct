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
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import prisma from "@/lib/prisma";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { canAccessPortalAdmin } from "@/lib/authz";
import { isConsultantAccessEnabled } from "@/lib/consultantAccess";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getPatDiagnosticsSnapshot } from "@/lib/patDiagnostics";

export const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/consultants", label: "Consultants" },
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/modules", label: "Modules" },
  { href: "/admin/insights", label: "Insights" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/briefings", label: "Briefings" },
  { href: "/admin/runtime", label: "Runtime" },
] as const;

export function getAdminNavItems() {
  return isConsultantAccessEnabled()
    ? ADMIN_NAV_ITEMS
    : ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin/consultants");
}

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
  MembershipStatus.INCOMPLETE,
  MembershipStatus.UNPAID,
  MembershipStatus.PAYMENT_ACTION_REQUIRED,
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
    redirect(buildCanonicalSignInPath({ callbackUrl: "/admin", view: "admin" }));
  }

  if (!canAccessPortalAdmin(sessionUser)) {
    redirect("/admin");
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
  const canonicalFirmModuleKeys = FIRM_MODULE_DEFINITIONS.map((module) => module.key);
  const diagnosticsSnapshot = getPatDiagnosticsSnapshot();
  const consultantAccessEnabled = isConsultantAccessEnabled();

  const [
    organizations,
    users,
    consultants,
    products,
    modules,
    sections,
    insights,
    taxonomyBuckets,
    capabilityNodes,
    portals,
    memberships,
    auditEvents,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    consultantAccessEnabled
      ? prisma.consultantProfile.count({ where: { active: true } }).catch(() => 0)
      : Promise.resolve(0),
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
  ]);

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
    consultantAccessEnabled,
    metrics: {
      organizations,
      users,
      consultants,
      products,
      modules,
      sections,
      insights,
      taxonomyBuckets,
      capabilityNodes,
      portals,
      memberships,
    },
    canonicalModules,
    diagnosticsSnapshot,
    auditEvents,
  };
}

export { buildOperatorBriefings } from "@/lib/adminBriefings";
