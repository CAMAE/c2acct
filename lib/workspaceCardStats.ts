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
export type WorkspaceCardStat = { value: string; label: string };
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
    "firm-alignment-assessment": { value: `${dashboard.completedModules}/${dashboard.totalModules}`, label: "modules complete" },
  };
  if (catalog) {
    const toReview = catalog.filter((item) => item.firmReviewStatus === "available" || item.firmReviewStatus === "in-progress").length;
    stats["firm-product-assessments"] = { value: String(toReview), label: toReview === 1 ? "product to review" : "products to review" };
  }
  if (dashboard.alignmentIndex !== null) {
    stats["firm-insights"] = { value: String(dashboard.alignmentIndex), label: "alignment index" };
  }
  if (board && board.currentAlignment !== null) {
    stats["firm-alignment-sandbox"] = { value: `${Math.round(board.currentAlignment)}%`, label: "stack alignment" };
  }
  if (isPingsEnabled()) {
    const meta = getBenchmarkArtifactMeta();
    const days = `${meta.daysToCutoff} day${meta.daysToCutoff === 1 ? "" : "s"} to cutoff`;
    stats["firm-benchmark"] =
      peer?.overall
        ? { value: `${ordinal(peer.overall.percentile)} percentile`, label: days }
        : { value: "—", label: days };
  }
  return stats;
}

export async function getVendorWorkspaceCardStats(companyId: string, dashboard: VendorWorkspaceDashboard): Promise<WorkspaceCardStats> {
  const refresh = isPingsEnabled() ? await settle(getVendorRefreshBoard(companyId)) : null;
  const stats: WorkspaceCardStats = {
    "product-assessment": { value: `${dashboard.productsFinal}/${dashboard.productsDeclared}`, label: "products final" },
    "product-insight": { value: String(dashboard.firmReviewsOnFile), label: dashboard.firmReviewsOnFile === 1 ? "firm review on file" : "firm reviews on file" },
    "alignment-insights": dashboard.largestDivergence
      ? { value: `${dashboard.largestDivergence.points} pt`, label: "largest divergence" }
      : { value: "—", label: "largest divergence" },
    "vendor-battlecard": { value: String(dashboard.nextBriefing.firmsReviewing), label: dashboard.nextBriefing.firmsReviewing === 1 ? "firm reviewing" : "firms reviewing" },
  };
  if (refresh) {
    stats["vendor-review-refresh"] = { value: String(refresh.summary.refreshWindow), label: "entering the refresh window" };
  }
  return stats;
}
