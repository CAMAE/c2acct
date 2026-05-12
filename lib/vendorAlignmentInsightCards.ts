import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import type { VendorAlignmentInsightReport } from "@/lib/vendorAlignmentInsightEngine";

export type VendorAlignmentOverviewCard = {
  key: string;
  href: string;
  title: string;
  summary: string;
  confidenceLabel: string;
  metaLine: string;
  locked: boolean;
  lockedTitle: string | null;
};

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

function firstSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const match = trimmed.match(/^.+?[.!?](?:\s|$)/);
  return match?.[0]?.trim() ?? trimmed;
}

export function getVendorAlignmentOverviewCard(report: VendorAlignmentInsightReport): VendorAlignmentOverviewCard {
  const content = getVendorAlignmentInsightContent(report.key);
  const summary = report.locked
    ? firstSentence(content?.lockedState?.summary ?? report.currentStateSummary)
    : firstSentence(report.currentStateSummary);

  return {
    key: report.key,
    href: `/vendor/alignment-insights/${report.key}`,
    title: report.title,
    summary,
    confidenceLabel: report.confidenceLabel,
    metaLine: report.locked
      ? `Staged only · ${formatFreshness(report.latestUpdatedAt)}`
      : `${report.sampleSize} firm sample${report.sampleSize === 1 ? "" : "s"} · ${formatFreshness(report.latestUpdatedAt)}`,
    locked: report.locked,
    lockedTitle: report.locked ? content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER : null,
  };
}
