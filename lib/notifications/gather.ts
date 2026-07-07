import prisma from "@/lib/prisma";
import { getFirmAssessmentProgress, summarizeFirmAlignmentProgress } from "@/lib/firmPat";
import { deriveVendorProductAssessmentCompletionStatus, VENDOR_PRODUCT_MODULE_KEY } from "@/lib/vendorPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { AUTO_KIND, type PingTarget } from "@/lib/notifications/planPings";

/**
 * Ping-sweep fact gathering (Phase B3b-2b, 2026-06-18). Enumerates every
 * ecosystem and builds a PingTarget (the exact shape planPings consumes) for
 * each firm and vendor company, reusing the existing firm-brief / vendor
 * assessment completion pipelines. Pure DB reads — no writes, no LLM. This is
 * the integration-risk surface: the deterministic decision/plan/execute layers
 * downstream are already covered, so the correctness that matters here is the
 * query shape and the date-fact math.
 *
 * `nowMs` is injected (mirrors planPings / pilot-ops computeHealth) so the
 * "nearest future quarter" lookup is deterministic and unit-testable.
 */

type Audience = "firm" | "vendor";

/** Firm completion (0–100) via the same pipeline the firm brief renders. */
async function firmCompletionPercent(companyId: string): Promise<number> {
  const modules = await getFirmAssessmentProgress(companyId);
  return summarizeFirmAlignmentProgress(modules).completionPercent;
}

/**
 * Vendor completion (0–100). The vendor product assessment is pass/fail per the
 * derive helper, so we map completed → 100, otherwise 0 (the only two states the
 * trigger engine needs vs. a quarter target).
 */
async function vendorCompletionPercent(companyId: string): Promise<number> {
  const vendorModule = await prisma.surveyModule.findUnique({
    where: { key: VENDOR_PRODUCT_MODULE_KEY },
    select: { id: true },
  });
  if (!vendorModule) {
    return 0;
  }
  const latestSubmission = await prisma.surveySubmission.findFirst({
    where: getSurveyFinalWhere({ moduleId: vendorModule.id, companyId }),
    orderBy: { createdAt: "desc" },
    select: { id: true, score: true, createdAt: true, answeredCount: true, answers: true },
  });
  const status = deriveVendorProductAssessmentCompletionStatus({ latestSubmission });
  return status.completed ? 100 : 0;
}

/** Epoch-ms of the company's most recent survey submission, or 0 when none. */
async function lastActivityMs(companyId: string): Promise<number> {
  const latest = await prisma.surveySubmission.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return latest ? latest.createdAt.getTime() : 0;
}

/** Nearest still-open EngagementQuarter (dueDate >= now, soonest), or null. */
async function nearestQuarter(
  companyId: string,
  nowMs: number
): Promise<{ targetPercent: number; dueMs: number } | null> {
  const quarter = await prisma.engagementQuarter.findFirst({
    where: { companyId, dueDate: { gte: new Date(nowMs) } },
    orderBy: { dueDate: "asc" },
    select: { targetPercent: true, dueDate: true },
  });
  return quarter ? { targetPercent: quarter.targetPercent, dueMs: quarter.dueDate.getTime() } : null;
}

/** Automated reminders already sent for this engagement (manual nudges excluded). */
function priorSends(companyId: string, audience: Audience): Promise<number> {
  return prisma.nudgeEvent.count({
    where: { sourceType: "Company", sourceId: companyId, kind: AUTO_KIND[audience], manual: false },
  });
}

/** Prior automated reminders to this company still unread (drives escalation). */
function ignoredCount(companyId: string, audience: Audience): Promise<number> {
  return prisma.notification.count({
    where: { sourceType: "Company", sourceId: companyId, kind: AUTO_KIND[audience], readAt: null },
  });
}

async function recipientUserIds(companyId: string): Promise<string[]> {
  const users = await prisma.user.findMany({ where: { companyId }, select: { id: true } });
  return users.map((u) => u.id);
}

/** Company display name, so Pat can name the account in a consultant escalation. */
async function companyName(companyId: string): Promise<string> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  return company?.name ?? "";
}

async function buildTarget(
  companyId: string,
  audience: Audience,
  consultantUserId: string | null,
  nowMs: number
): Promise<PingTarget> {
  const [completionPercent, lastMs, quarter, sends, ignored, recipients, name] = await Promise.all([
    audience === "firm" ? firmCompletionPercent(companyId) : vendorCompletionPercent(companyId),
    lastActivityMs(companyId),
    nearestQuarter(companyId, nowMs),
    priorSends(companyId, audience),
    ignoredCount(companyId, audience),
    recipientUserIds(companyId),
    companyName(companyId),
  ]);

  return {
    companyId,
    companyName: name,
    audience,
    completionPercent,
    lastActivityMs: lastMs,
    quarterTargetPercent: quarter?.targetPercent ?? null,
    quarterDueMs: quarter?.dueMs ?? null,
    priorSends: sends,
    ignoredCount: ignored,
    recipientUserIds: recipients,
    consultantUserId,
  };
}

/**
 * Gather a PingTarget for every firm and vendor across every ecosystem. The
 * managing consultant's user id rides along on each target for escalation.
 */
export async function gatherPingTargets(nowMs: number = Date.now()): Promise<PingTarget[]> {
  const ecosystems = await prisma.ecosystem.findMany({
    select: {
      id: true,
      vendorCompanyId: true,
      ConsultantProfile: { select: { userId: true } },
      EcosystemFirm: { select: { firmCompanyId: true } },
    },
  });

  const targets: PingTarget[] = [];
  for (const eco of ecosystems) {
    const consultantUserId = eco.ConsultantProfile?.userId ?? null;
    for (const firm of eco.EcosystemFirm) {
      targets.push(await buildTarget(firm.firmCompanyId, "firm", consultantUserId, nowMs));
    }
    if (eco.vendorCompanyId) {
      targets.push(await buildTarget(eco.vendorCompanyId, "vendor", consultantUserId, nowMs));
    }
  }
  return targets;
}
