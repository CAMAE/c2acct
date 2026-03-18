import { redirect } from "next/navigation";
import InsightDetailPage from "@/app/components/InsightDetailPage";
import { getViewerIntelligencePageData } from "@/lib/intelligence/getProductIntelligencePageData";
import { findOutputCardForReportProfile } from "@/lib/intelligence/outputRegistry";

export const dynamic = "force-dynamic";

export default async function UserInsightDetailPage({
  params,
}: {
  params: Promise<{ insightKey: string }>;
}) {
  const { insightKey } = await params;
  const registryMatch = findOutputCardForReportProfile("firm_baseline_report", insightKey);

  if (!registryMatch) {
    redirect("/user/insights");
  }

  const data = await getViewerIntelligencePageData();
  if (!data) {
    redirect("/login?callbackUrl=%2Fuser%2Finsights");
  }

  const runtimeCard = data.outputSections.flatMap((section) => section.cards).find((card) => (card.insightKey ?? card.id) === insightKey) ?? null;

  return (
    <InsightDetailPage
      roleLabel="User insight detail"
      backHref="/user/insights"
      backLabel="Back to user insights"
      title={registryMatch.card.title}
      subtitle="User insight detail stays inside the current invited-user firm context and does not widen access beyond the existing company-root intelligence seam."
      card={registryMatch.card}
      runtimeCard={runtimeCard}
      chartSeries={data.chartSeries}
    />
  );
}
