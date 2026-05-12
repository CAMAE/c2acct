import Link from "next/link";
import { notFound } from "next/navigation";
import TrackPageEvent from "@/app/components/telemetry/TrackPageEvent";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { getVendorProductInsightDetail } from "@/lib/vendorProductInsightCards";
import { getVendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
  cardKey: string;
};

export default async function VendorProductInsightCardDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { productId, cardKey } = await params;
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();

  if (!sessionUser?.companyId) {
    notFound();
  }

  const snapshot = await getVendorProductInsightSnapshot(sessionUser.companyId, productId);
  if (!snapshot) {
    notFound();
  }

  const detail = getVendorProductInsightDetail(snapshot, cardKey);
  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <TrackPageEvent
        distinctId={`${sessionUser.companyId}:${productId}:${cardKey}`}
        event="insight_card_open"
        properties={{
          surface: "vendor_product_insight",
          productId,
          cardKey,
        }}
      />

      <section
        className={`p-8 ${
          detail.locked
            ? "rounded-[28px] border border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)]"
            : "pat-card"
        }`}
      >
        <div className="pat-label">{detail.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">{detail.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{detail.heroSummary}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Readout: <span className="font-semibold text-[var(--shell-ink)]">{detail.heroValue}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.confidence}: <span className="font-semibold text-[var(--shell-ink)]">{detail.confidenceText}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.sample}: <span className="font-semibold text-[var(--shell-ink)]">{detail.sampleText}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.freshness}: <span className="font-semibold text-[var(--shell-ink)]">{detail.freshnessText}</span>
          </div>
        </div>
        {detail.lockedDisclaimer ? (
          <div className="mt-4 rounded-[18px] border border-[rgba(79,191,226,0.32)] bg-[rgba(255,255,255,0.45)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {detail.lockedDisclaimer}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1fr]">
        <div className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.whatItIs}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{detail.whatItIs}</p>
        </div>
        <div className="pat-card p-6">
          <div className="pat-label">How it was calculated</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{detail.howCalculated}</p>
        </div>
        <div className="pat-card p-6">
          <div className="pat-label">What the vendor should understand</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{detail.vendorTakeaway}</p>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">{messages.insights.shared.exactAssessmentBasis}</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{detail.exactAssessmentBasis}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {detail.evidencePanels.map((panel) => (
          <div key={panel.title} className="pat-card p-6">
            <div className="pat-label">{panel.title}</div>
            <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{panel.body}</p>
          </div>
        ))}
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">What is not being claimed</div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
          <p>{detail.notClaimed}</p>
          <p>{messages.common.liveEvidenceEnglishOnly}</p>
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link className="pat-button-secondary" href={`/vendor/product-insight/${snapshot.product.id}`}>
          Back to product intelligence
        </Link>
        <Link className="pat-button-secondary" href="/vendor/product-insight">
          Back to product catalog
        </Link>
      </section>
    </div>
  );
}
