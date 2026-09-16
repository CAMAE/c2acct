import prisma from "@/lib/prisma";
import { getAlignmentBoardData, isAlignmentBoardEnabled } from "@/lib/alignmentBoard";
import { getBenchmarkArtifactMeta } from "@/lib/benchmarkArtifact";
import { resolveCompanyBoundary } from "@/lib/dataBoundary";
import { buildFirmPeerPosition } from "@/lib/eliteInsightsV2";
import { getFirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import { getFirmProductCatalog } from "@/lib/firmPat";
import type { FirmWorkspaceDashboard } from "@/lib/firmWorkspaceDashboard";
import { ordinal } from "@/lib/ordinal";
import { isPingsEnabled } from "@/lib/patAssistant/flags";
import { getVendorRefreshBoard } from "@/lib/vendorRefresh";
import type { VendorWorkspaceDashboard } from "@/lib/vendorWorkspaceDashboard";

/**
 * R28 (box 2b, 2026-09-14): the live number each workspace card carries, keyed
 * by the card id (firmWorkspaceCards / vendorWorkspaceCards) plus the two
 * pings-gated cards ("firm-benchmark", "vendor-review-refresh"). Flag-on only —
 * the firm/vendor homes call these beside the dashboard loaders. Every value
 * that the dashboard already carries is reused; the four numbers it does not
 * carry (products to review, stack alignment, benchmark percentile + days to
 * cutoff, refresh window) come from the same loaders their own pages use, each
 * wrapped so a failure leaves the card without a number rather than without a
 * page.
 */
/** R32 (box 2c): value is one short token that never wraps ("90th", "68%", "5/5"); unit
 *  sits under it ("percentile"); context is the optional third line ("15 days to cutoff"). */
export type WorkspaceCardStat = { value: string; unit: string; context?: string | null };
export type WorkspaceCardStats = Record<string, WorkspaceCardStat>;

async function settle<T>(work: Promise<T>): Promise<T | null> {
  return work.catch(() => null);
}

export async function getFirmWorkspaceCardStats(companyId: string, dashboard: FirmWorkspaceDashboard): Promise<WorkspaceCardStats> {
  const [catalog, board, peer] = await Promise.all([
    settle(getFirmProductCatalog(companyId)),
    isAlignmentBoardEnabled() ? settle(getAlignmentBoardData(companyId)) : Promise.resolve(null),
    isPingsEnabled()
      ? settle(
          (async () => {
            const [boundary, signal] = await Promise.all([resolveCompanyBoundary(companyId), getFirmAlignmentSignal(companyId)]);
            return buildFirmPeerPosition(prisma, companyId, boundary, signal);
          })()
        )
      : Promise.resolve(null),
  ]);
  const stats: WorkspaceCardStats = {
    "firm-alignment-assessment": {
      value: `${dashboard.completedModules}/${dashboard.totalModules}`,
      unit: "modules complete",
      context: dashboard.lastFullAssessmentAt ? `on record since ${dashboard.lastFullAssessmentAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : null,
    },
  };
  if (catalog) {
    const toReview = catalog.filter((item) => item.firmReviewStatus === "available" || item.firmReviewStatus === "in-progress").length;
    stats["firm-product-assessments"] = { value: String(toReview), unit: toReview === 1 ? "product to review" : "products to review", context: `${catalog.length} in your catalog` };
  }
  if (dashboard.alignmentIndex !== null) {
    stats["firm-insights"] = { value: String(dashboard.alignmentIndex), unit: "alignment index", context: dashboard.latestInsight ? `latest: ${dashboard.latestInsight.title}` : null };
  }
  if (board && board.currentAlignment !== null) {
    stats["firm-alignment-sandbox"] = { value: `${Math.round(board.currentAlignment)}%`, unit: "stack alignment", context: `${board.stack.length} piece${board.stack.length === 1 ? "" : "s"} on the board` };
  }
  if (isPingsEnabled()) {
    const meta = getBenchmarkArtifactMeta();
    const days = `${meta.daysToCutoff} day${meta.daysToCutoff === 1 ? "" : "s"} to cutoff`;
    stats["firm-benchmark"] =
      peer?.overall
        ? { value: ordinal(peer.overall.percentile), unit: "percentile", context: days }
        : { value: "—", unit: "percentile", context: days };
  }
  return stats;
}

export async function getVendorWorkspaceCardStats(companyId: string, dashboard: VendorWorkspaceDashboard): Promise<WorkspaceCardStats> {
  const refresh = isPingsEnabled() ? await settle(getVendorRefreshBoard(companyId)) : null;
  const stats: WorkspaceCardStats = {
    "product-assessment": { value: `${dashboard.productsFinal}/${dashboard.productsDeclared}`, unit: "products final", context: null },
    "product-insight": { value: String(dashboard.firmReviewsOnFile), unit: dashboard.firmReviewsOnFile === 1 ? "firm review on file" : "firm reviews on file", context: dashboard.latestReadout ? `latest: ${dashboard.latestReadout.productName}` : null },
    "alignment-insights": dashboard.largestDivergence
      ? { value: `${dashboard.largestDivergence.points} pt`, unit: "largest divergence", context: dashboard.largestDivergence.productName }
      : { value: "—", unit: "largest divergence", context: null },
    "vendor-battlecard": { value: String(dashboard.nextBriefing.firmsReviewing), unit: dashboard.nextBriefing.firmsReviewing === 1 ? "firm reviewing" : "firms reviewing", context: `next briefing ${dashboard.nextBriefing.dateLabel}` },
  };
  if (refresh) {
    stats["vendor-review-refresh"] = { value: String(refresh.summary.refreshWindow), unit: "entering the refresh window", context: `${refresh.summary.reviews} reviews on file` };
  }
  return stats;
}
