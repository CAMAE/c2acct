import prisma from "@/lib/prisma";
import { getFirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import { buildFirmProInsightCards, getFirmInsightReports } from "@/lib/firmInsightEngine";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";
import { getFirmAssessmentProgress, summarizeFirmAlignmentProgress, type FirmModuleProgress } from "@/lib/firmPat";

/**
 * Depth box 1 (2026-09-09): the firm workspace home is the firm's dashboard —
 * the visitor's own numbers above the fold. Every figure here is the SAME
 * builder the insights hub uses (alignment signal, module progress, insight
 * reports), so the home never disagrees with /firm/insights.
 */
export type FirmWorkspaceDashboard = {
  companyName: string;
  alignmentIndex: number | null;
  modules: FirmModuleProgress[];
  completedModules: number;
  totalModules: number;
  capabilitiesMet: number;
  capabilitiesTotal: number;
  radarAxes: { key: string; label: string; value: number | null }[];
  nextStep: { title: string; body: string; href: string; label: string };
  latestInsight: { key: string; title: string; value: string | null; caption: string | null; summary: string; href: string } | null;
  sinceLastVisit: { sinceLabel: string | null; assessmentsSubmitted: number; insightsRefreshed: number };
  lastFullAssessmentAt: Date | null;
};

function shortLabel(title: string) {
  return title.split(/[,:]| and /)[0]?.trim() || title;
}

export async function getFirmWorkspaceDashboard(companyId: string, companyName: string, userId: string | null): Promise<FirmWorkspaceDashboard> {
  const [moduleProgress, unlocked, insightReports, alignmentSignal, user] = await Promise.all([
    getFirmAssessmentProgress(companyId),
    evaluateUnlocked({ companyId }),
    getFirmInsightReports(companyId),
    getFirmAlignmentSignal(companyId),
    userId ? prisma.user.findUnique({ where: { id: userId }, select: { lastLoginAt: true } }) : Promise.resolve(null),
  ]);
  const summary = summarizeFirmAlignmentProgress(moduleProgress);
  const unlockedKeys = new Set(unlocked.map((item) => item.key));
  const capabilityByKey = new Map<string, boolean>();
  for (const report of insightReports.values()) {
    for (const capability of report.contributingCapabilities) {
      capabilityByKey.set(capability.key, (capabilityByKey.get(capability.key) ?? false) || capability.meetsThreshold);
    }
  }
  const proCards = buildFirmProInsightCards({ reports: insightReports, unlockedKeys });
  const firstLive = proCards.find((card) => card.tone === "active" && card.metric) ?? proCards.find((card) => card.tone === "active") ?? null;
  const since = user?.lastLoginAt ?? null;
  const [assessmentsSubmitted, insightsRefreshed] = since
    ? await Promise.all([
        prisma.surveySubmission.count({ where: { companyId, createdAt: { gte: since } } }),
        prisma.firmMaturitySnapshot.count({ where: { companyId, computedAt: { gte: since } } }),
      ])
    : [0, 0];
  const nextModule = summary.nextModule;
  return {
    companyName,
    alignmentIndex: alignmentSignal.alignmentIndex,
    modules: moduleProgress,
    completedModules: summary.completedModules,
    totalModules: summary.totalModules,
    capabilitiesMet: Array.from(capabilityByKey.values()).filter(Boolean).length,
    capabilitiesTotal: capabilityByKey.size,
    radarAxes: moduleProgress.map((module) => ({ key: module.key, label: shortLabel(module.title), value: module.latestScore })),
    nextStep: nextModule
      ? {
          title: nextModule.title,
          body:
            nextModule.status === "in-progress"
              ? `${nextModule.draftAnsweredCount} of ${nextModule.questionCount} answers saved — resume where you left off.`
              : `${nextModule.questionCount} questions, about four minutes. Each module you finish opens more of the readout.`,
          href: nextModule.href,
          label: nextModule.status === "in-progress" ? "Resume module" : "Start module",
        }
      : {
          title: "Review your firm insights",
          body: "All five modules are on record. The readout is grounded; open it to see what the evidence unlocks next.",
          href: "/firm/insights",
          label: "Open insights",
        },
    latestInsight: firstLive
      ? {
          key: firstLive.key,
          title: firstLive.title,
          value: firstLive.metric?.value ?? null,
          caption: firstLive.metric?.caption ?? null,
          summary: firstLive.summary,
          href: `/firm/insights/${firstLive.key}`,
        }
      : null,
    sinceLastVisit: {
      sinceLabel: since ? since.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
      assessmentsSubmitted,
      insightsRefreshed,
    },
    lastFullAssessmentAt: summary.lastFullAssessmentAt,
  };
}
