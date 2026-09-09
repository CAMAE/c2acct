import prisma from "@/lib/prisma";
import type { ConsultantAccessState } from "@/lib/consultantAccess";
import { quarterCutoff } from "@/lib/consultantFreshness";

/**
 * Depth box 4 (2026-09-09): the guide home's NEXT BRIEFING card and "this week"
 * counts. Briefings follow the published quarterly benchmark cut (methodology
 * v1.3): the next briefing is the next cutoff, for the guide's largest
 * ecosystem. "This week" = the trailing seven days across every firm the guide
 * reaches: assessment modules submitted, and firm insight snapshots refreshed.
 */
export type ConsultantWeek = {
  nextBriefing: { vendorName: string; ecosystemName: string; dateLabel: string; firmCount: number } | null;
  thisWeek: { assessmentsSubmitted: number; insightsRefreshed: number; firmsInScope: number; sinceLabel: string };
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getConsultantWeek(access: ConsultantAccessState, now = new Date()): Promise<ConsultantWeek> {
  const firmIds = Array.from(new Set(access.ecosystems.flatMap((scope) => scope.firmCompanies.map((firm) => firm.id))));
  const since = new Date(now.getTime() - WEEK_MS);
  const [assessmentsSubmitted, insightsRefreshed] = firmIds.length
    ? await Promise.all([
        prisma.surveySubmission.count({ where: { companyId: { in: firmIds }, createdAt: { gte: since } } }),
        prisma.firmMaturitySnapshot.count({ where: { companyId: { in: firmIds }, computedAt: { gte: since } } }),
      ])
    : [0, 0];
  const largest = [...access.ecosystems].sort((a, b) => b.firmCompanies.length - a.firmCompanies.length)[0] ?? null;
  const cutoff = quarterCutoff(now);
  const dateLabel = cutoff.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return {
    nextBriefing: largest
      ? {
          vendorName: largest.vendorCompanyName ?? largest.ecosystemName,
          ecosystemName: largest.ecosystemName,
          dateLabel,
          firmCount: largest.firmCompanies.length,
        }
      : null,
    thisWeek: {
      assessmentsSubmitted,
      insightsRefreshed,
      firmsInScope: firmIds.length,
      sinceLabel: since.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    },
  };
}
