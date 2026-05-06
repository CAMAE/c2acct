import Link from "next/link";
import { AdminMetricCard, AdminPanel } from "@/app/components/admin/AdminShell";
import type {
  AdminCompanyBriefing,
  AdminProductBriefing,
  BriefingConfidenceEntry,
  BriefingModuleHeatmapItem,
  BriefingProductOpenEndedResponse,
  BriefingProductSummary,
  BriefingRiskOpportunity,
} from "@/lib/adminBriefingEngine";
import { filterBriefingOpenEndedResponses } from "@/lib/adminBriefingEngine";

function formatPercent(value: number | null) {
  return value === null ? "--" : `${Math.round(value)}%`;
}

function formatConfidence(value: number | null) {
  return value === null ? "--" : `${Math.round(value * 100)}%`;
}

function formatDate(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function ProductOpenEndedResponsesPanel({
  title,
  description,
  responses,
  searchAction,
  searchQuery,
  emptyState,
  showProductLinks = false,
  truncateAnswers = false,
  printMode = false,
}: {
  title: string;
  description: string;
  responses: BriefingProductOpenEndedResponse[];
  searchAction: string;
  searchQuery?: string;
  emptyState: string;
  showProductLinks?: boolean;
  truncateAnswers?: boolean;
  printMode?: boolean;
}) {
  const normalizedQuery = searchQuery?.trim() ?? "";
  const filteredResponses = filterBriefingOpenEndedResponses(responses, normalizedQuery);

  return (
    <AdminPanel title={title} description={description}>
      {!printMode ? (
        <form action={searchAction} className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            name="q"
            defaultValue={normalizedQuery}
            className="pat-input"
            placeholder="Search product, question, or answer text"
          />
          <button type="submit" className="pat-button-secondary">
            Search responses
          </button>
          {normalizedQuery ? (
            <Link href={searchAction} className="pat-button-secondary text-center">
              Clear
            </Link>
          ) : (
            <div />
          )}
        </form>
      ) : null}

      <div className="mb-5 text-xs uppercase tracking-[0.16em] text-[var(--shell-muted)]">
        {normalizedQuery
          ? `${filteredResponses.length} of ${responses.length} latest vendor response${responses.length === 1 ? "" : "s"} match "${normalizedQuery}"`
          : `${responses.length} latest vendor response${responses.length === 1 ? "" : "s"} searchable in this briefing`}
      </div>

      {filteredResponses.length === 0 ? (
        <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 text-sm leading-6 text-[var(--shell-muted)]">
          {emptyState}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredResponses.map((response) => (
            <div
              key={`${response.productId}-${response.questionId}`}
              className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                    {response.sectionTitle}
                  </div>
                  <div className="mt-2 text-base font-semibold text-[var(--shell-ink)]">
                    {response.questionPrompt}
                  </div>
                </div>
                <div className="text-right text-xs text-[var(--shell-muted)]">
                  <div>{response.productName}</div>
                  <div>{formatDate(response.submittedAt)}</div>
                </div>
              </div>

              <div className="mt-3 text-xs leading-5 text-[var(--shell-muted)]">
                Vendor: {response.vendorName}
              </div>

              <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                {truncateAnswers ? truncateText(response.responseText, 240) : response.responseText}
              </p>

              {showProductLinks ? (
                <div className="mt-4">
                  <Link
                    href={`${searchAction}/products/${response.productId}${
                      normalizedQuery ? `?q=${encodeURIComponent(normalizedQuery)}` : ""
                    }`}
                    className="pat-button-secondary text-center"
                  >
                    Open product briefing
                  </Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AdminPanel>
  );
}

export function ExecutiveSummaryCard({
  briefing,
  printHref,
}: {
  briefing: AdminCompanyBriefing;
  printHref?: string | null;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
      <div className="pat-card p-8">
        <div className="pat-label">Executive summary</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {briefing.executiveSummary.headline}
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--shell-muted)]">
          {briefing.executiveSummary.summary}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-[var(--shell-muted)]">
          <span>
            Canonical firm score:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {formatPercent(briefing.executiveSummary.canonicalFirmScore)}
            </span>
          </span>
          <span>
            Confidence:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {briefing.executiveSummary.confidenceLabel}
            </span>
          </span>
          <span>
            Latest update:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {formatDate(briefing.company.latestUpdatedAt)}
            </span>
          </span>
        </div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          {briefing.executiveSummary.confidenceSummary}
        </p>
      </div>

      <div className="grid gap-4">
        <AdminMetricCard
          label="Firm modules"
          value={`${briefing.firmLayer.completedModuleCount}/5`}
          detail="Completed canonical firm alignment modules in the current briefing."
        />
        <AdminMetricCard
          label="Reviewed products"
          value={String(briefing.productLayer.reviewedProductCount)}
          detail="Firm-side product reviews included in the current stack."
        />
        <AdminMetricCard
          label="People assessed"
          value={String(briefing.individualLayer.peopleAssessed)}
          detail="Linked users with individual PAT submissions."
        />
        {printHref ? (
          <Link href={printHref} className="pat-button-secondary print:hidden text-center">
            Open print view
          </Link>
        ) : null}
      </div>
    </section>
  );
}

export function ModuleHeatmap({ modules }: { modules: BriefingModuleHeatmapItem[] }) {
  return (
    <AdminPanel
      title="Module heatmap"
      description="Canonical firm module scores stay separate from confidence. Section values show evidence clusters inside each module."
    >
      <div className="grid gap-4">
        {modules.map((module) => (
          <div
            key={module.key}
            className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{module.title}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  Raw score {formatPercent(module.canonicalScore)} · confidence {formatConfidence(module.confidenceScore)} · {formatDate(module.latestSubmittedAt)}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {module.sectionScores.map((section) => (
                <div
                  key={section.key}
                  className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-4"
                >
                  <div className="text-sm font-semibold text-[var(--shell-ink)]">{section.title}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
                    {formatPercent(section.score)}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                    {section.answeredCount}/{section.questionCount} scored answers
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminPanel>
  );
}

export function ProductStackSummary({
  companyId,
  productBasePath,
  products,
}: {
  companyId: string;
  productBasePath?: string;
  products: BriefingProductSummary[];
}) {
  return (
    <AdminPanel
      title="Product stack summary"
      description="Company-reviewed product scores, vendor self-reported posture, and the combined current PAT readout stay distinct."
    >
      <div className="grid gap-4">
        {products.length === 0 ? (
          <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 text-sm leading-6 text-[var(--shell-muted)]">
            No firm-side product reviews have been recorded yet.
          </div>
        ) : (
          products.map((product) => (
            <Link
              key={product.productId}
              href={`${productBasePath ?? `/admin/briefings/${companyId}`}/products/${product.productId}`}
              className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5 transition hover:border-[rgba(6,54,116,0.32)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{product.productName}</div>
                  <div className="mt-1 text-sm text-[var(--shell-muted)]">{product.vendorName}</div>
                </div>
                <div className="text-right text-sm text-[var(--shell-muted)]">
                  <div>Firm raw score {formatPercent(product.canonicalFirmReviewScore)}</div>
                  <div>{product.confidenceLabel}</div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                {product.combinedCurrentReadout}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--shell-muted)]">
                {product.utilityLabels.slice(0, 4).map((utility) => (
                  <span
                    key={utility}
                    className="rounded-full border border-[var(--shell-border)] px-3 py-1.5"
                  >
                    {utility}
                  </span>
                ))}
              </div>
              <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                Latest vendor narrative answers: {product.openEndedResponseCount} · vendor update {formatDate(product.latestVendorAssessmentSubmittedAt)}
              </div>
            </Link>
          ))
        )}
      </div>
    </AdminPanel>
  );
}

export function RiskOpportunityPanel({
  title,
  items,
}: {
  title: string;
  items: BriefingRiskOpportunity[];
}) {
  return (
    <AdminPanel title={title}>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <div
            key={`${item.layer}-${index}`}
            className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-4"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
              {item.layer}
            </div>
            <div className="mt-2 text-base font-semibold text-[var(--shell-ink)]">{item.title}</div>
            <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{item.detail}</div>
          </div>
        ))}
      </div>
    </AdminPanel>
  );
}

export function ConfidenceEvidencePanel({
  entries,
}: {
  entries: BriefingConfidenceEntry[];
}) {
  return (
    <AdminPanel
      title="Confidence and evidence appendix"
      description="Confidence reflects evidence coverage and freshness. It never replaces the canonical PAT raw score."
    >
      <div className="grid gap-4">
        {entries.map((entry) => (
          <div
            key={entry.layer}
            className="rounded-[20px] border border-[var(--shell-border)] bg-white/80 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{entry.layer}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">
                  Sample {entry.sampleSize} · raw score {formatPercent(entry.canonicalScore)} · latest {formatDate(entry.latestUpdatedAt)}
                </div>
              </div>
              <div className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--shell-ink)]">
                {entry.confidenceLabel}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{entry.confidenceSummary}</p>
            {entry.caveats.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-[var(--shell-muted)]">
                {entry.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </AdminPanel>
  );
}

export function CompanyBriefingView({
  briefing,
  printMode = false,
  searchQuery,
  basePath,
  printHref,
}: {
  briefing: AdminCompanyBriefing;
  printMode?: boolean;
  searchQuery?: string;
  basePath?: string;
  printHref?: string | null;
}) {
  const resolvedBasePath = basePath ?? `/admin/briefings/${briefing.company.id}`;

  return (
    <div className={`space-y-8 ${printMode ? "print:space-y-5" : ""}`}>
      <ExecutiveSummaryCard
        briefing={briefing}
        printHref={typeof printHref === "undefined" ? `${resolvedBasePath}/print` : printHref}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Person-level"
          value={formatPercent(briefing.individualLayer.averageScore)}
          detail={`${briefing.individualLayer.peopleAssessed}/${briefing.individualLayer.totalUsers} users assessed`}
        />
        <AdminMetricCard
          label="Firm"
          value={formatPercent(briefing.firmLayer.averageScore)}
          detail={`${briefing.firmLayer.completedModuleCount} completed firm modules`}
        />
        <AdminMetricCard
          label="Products"
          value={formatPercent(briefing.productLayer.averageFirmReviewScore)}
          detail={`${briefing.productLayer.reviewedProductCount} reviewed products`}
        />
        <AdminMetricCard
          label="Ecosystem"
          value={briefing.ecosystemLayer.confidenceLabel}
          detail={briefing.ecosystemLayer.confidenceSummary}
        />
      </section>

      <AdminPanel title="Insight narrative">
        <div className="text-sm leading-7 text-[var(--shell-muted)]">{briefing.insightNarrative}</div>
      </AdminPanel>

      <AdminPanel title="Layer summaries">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5">
            <div className="text-lg font-semibold text-[var(--shell-ink)]">Person-level layer</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{briefing.individualLayer.summary}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5">
            <div className="text-lg font-semibold text-[var(--shell-ink)]">Firm layer</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{briefing.firmLayer.summary}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5">
            <div className="text-lg font-semibold text-[var(--shell-ink)]">Product layer</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{briefing.productLayer.summary}</p>
          </div>
          <div className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5">
            <div className="text-lg font-semibold text-[var(--shell-ink)]">Ecosystem layer</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{briefing.ecosystemLayer.summary}</p>
          </div>
        </div>
      </AdminPanel>

      <ModuleHeatmap modules={briefing.firmLayer.moduleHeatmap} />
      <ProductStackSummary
        companyId={briefing.company.id}
        productBasePath={resolvedBasePath}
        products={briefing.productLayer.products}
      />
      <ProductOpenEndedResponsesPanel
        title="Latest vendor open-ended product responses"
        description="These cards come directly from the latest completed vendor product assessment for each reviewed product in the current firm stack."
        responses={briefing.productLayer.openEndedResponses}
        searchAction={resolvedBasePath}
        searchQuery={searchQuery}
        emptyState={
          searchQuery?.trim()
            ? "No latest vendor open-ended responses match the current search."
            : "No latest vendor open-ended product responses are available for the reviewed product stack yet."
        }
        showProductLinks
        truncateAnswers
        printMode={printMode}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <RiskOpportunityPanel title="Risks" items={briefing.risks} />
        <RiskOpportunityPanel title="Opportunities" items={briefing.opportunities} />
      </section>

      <AdminPanel title="30 / 60 / 90 next actions">
        <div className="grid gap-4 md:grid-cols-3">
          {briefing.nextActions.map((item) => (
            <div
              key={item.window}
              className="rounded-[22px] border border-[var(--shell-border)] bg-white/80 p-5"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                {item.window}
              </div>
              <div className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">{item.title}</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{item.detail}</p>
              <p className="mt-3 text-xs leading-5 text-[var(--shell-muted)]">{item.evidence}</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <ConfidenceEvidencePanel entries={briefing.confidenceAppendix} />
    </div>
  );
}

export function ProductBriefingView({
  briefing,
  searchQuery,
  basePath,
}: {
  briefing: AdminProductBriefing;
  searchQuery?: string;
  basePath?: string;
}) {
  const resolvedBasePath = basePath ?? `/admin/briefings/${briefing.company.id}`;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Product briefing</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {briefing.product.productName}
        </h2>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--shell-muted)]">
          {briefing.narrative}
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm text-[var(--shell-muted)]">
          <span>Firm raw score <span className="font-semibold text-[var(--shell-ink)]">{formatPercent(briefing.latestCompanyReview.canonicalScore)}</span></span>
          <span>Review confidence <span className="font-semibold text-[var(--shell-ink)]">{formatConfidence(briefing.latestCompanyReview.confidenceScore)}</span></span>
          <span>Vendor self-report <span className="font-semibold text-[var(--shell-ink)]">{formatPercent(briefing.product.vendorSelfReportedScore)}</span></span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminPanel title="Current product basis">
          <div className="grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
            <div>Vendor: <span className="font-semibold text-[var(--shell-ink)]">{briefing.product.vendorName}</span></div>
            <div>Confidence: <span className="font-semibold text-[var(--shell-ink)]">{briefing.product.confidenceLabel}</span></div>
            <div>{briefing.product.confidenceSummary}</div>
            <div>{briefing.product.combinedCurrentReadout}</div>
            <div>Divergence: <span className="font-semibold text-[var(--shell-ink)]">{briefing.product.divergenceLabel}</span></div>
          </div>
        </AdminPanel>
        <AdminPanel title="Product stack metadata">
          <div className="grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
            <div>Utilities: {briefing.product.utilityLabels.length ? briefing.product.utilityLabels.join(", ") : "No utility declarations yet"}</div>
            <div>Taxonomy: {briefing.product.taxonomyTitles.length ? briefing.product.taxonomyTitles.join(", ") : "No taxonomy assignments yet"}</div>
            <div>Capabilities: {briefing.product.capabilityKeys.length ? briefing.product.capabilityKeys.join(", ") : "No capability mappings yet"}</div>
            <div>Latest vendor open-ended responses: {briefing.latestVendorAssessment.responseCount}</div>
            <div>Latest vendor assessment: {formatDate(briefing.latestVendorAssessment.submittedAt)}</div>
            {briefing.product.website ? (
              <div>
                Website:{" "}
                <a className="text-[var(--shell-accent)] underline" href={briefing.product.website}>
                  {briefing.product.website}
                </a>
              </div>
            ) : null}
          </div>
        </AdminPanel>
      </section>

      <ProductOpenEndedResponsesPanel
        title="Latest vendor open-ended responses"
        description="These answers are surfaced directly from the latest completed vendor product assessment for this product. PAT does not synthesize or rewrite them."
        responses={briefing.latestVendorAssessment.openEndedResponses}
        searchAction={`${resolvedBasePath}/products/${briefing.product.productId}`}
        searchQuery={searchQuery}
        emptyState={
          searchQuery?.trim()
            ? "No latest vendor open-ended responses match the current search."
            : "No latest vendor open-ended responses are available for this product yet."
        }
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <RiskOpportunityPanel title="Product risks" items={briefing.risks} />
        <RiskOpportunityPanel title="Product opportunities" items={briefing.opportunities} />
      </section>

      <ConfidenceEvidencePanel entries={briefing.confidenceAppendix} />
    </div>
  );
}
