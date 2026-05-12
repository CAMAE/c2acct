import { getVendorProductInsightContent } from "@/lib/insightContent";
import { PRODUCT_TIER2_INSIGHTS, VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import type {
  VendorProductInsightRecord,
  VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

export type VendorProductInsightCardModel = {
  key: string;
  kind: "metric" | "pro" | "elite";
  href: string;
  title: string;
  eyebrow: string;
  summary: string;
  indicators: string[];
  locked: boolean;
};

export type VendorProductInsightDetailModel = {
  key: string;
  title: string;
  eyebrow: string;
  locked: boolean;
  heroSummary: string;
  heroValue: string;
  confidenceText: string;
  sampleText: string;
  freshnessText: string;
  whatItIs: string;
  howCalculated: string;
  vendorTakeaway: string;
  exactAssessmentBasis: string;
  evidencePanels: Array<{
    title: string;
    body: string;
  }>;
  notClaimed: string;
  lockedDisclaimer: string | null;
};

function formatScore(score: number | null) {
  if (score === null) {
    return "--";
  }
  return `${Math.round(score)}%`;
}

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

function summarizeSections(
  sections: VendorProductInsightSnapshot["vendorSelfReported"]["sectionEvidence"],
  mode: "strongest" | "weakest"
) {
  const sorted = [...sections]
    .filter((section) => section.averageScore !== null)
    .sort((left, right) =>
      mode === "strongest"
        ? (right.averageScore ?? 0) - (left.averageScore ?? 0)
        : (left.averageScore ?? 0) - (right.averageScore ?? 0)
    )
    .slice(0, 2);

  if (sorted.length === 0) {
    return "No vendor section evidence is live yet.";
  }

  return sorted.map((section) => `${section.title} (${formatScore(section.averageScore)})`).join(", ");
}

function summarizeUtilities(
  utilities: VendorProductInsightSnapshot["firmReviewed"]["utilityEvidence"],
  mode: "strongest" | "weakest"
) {
  const sorted = [...utilities]
    .filter((utility) => utility.averageScore !== null)
    .sort((left, right) =>
      mode === "strongest"
        ? (right.averageScore ?? 0) - (left.averageScore ?? 0)
        : (left.averageScore ?? 0) - (right.averageScore ?? 0)
    )
    .slice(0, 2);

  if (sorted.length === 0) {
    return "No firm utility evidence is live yet.";
  }

  return sorted.map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`).join(", ");
}

function buildMetricCards(snapshot: VendorProductInsightSnapshot, productHref: string) {
  return [
    {
      key: "vendor-self-reported-signal",
      kind: "metric" as const,
      href: `${productHref}/vendor-self-reported-signal`,
      eyebrow: "Metric",
      title: "Vendor self-reported signal",
      summary:
        snapshot.vendorSelfReported.latestScore === null
          ? "No vendor product assessment is recorded yet."
          : "The latest vendor product assessment score for this product.",
      indicators: [
        `Score ${formatScore(snapshot.vendorSelfReported.latestScore)}`,
        `Sections ${snapshot.vendorSelfReported.sectionEvidence.length}`,
        `Freshness ${formatFreshness(snapshot.vendorSelfReported.submittedAt)}`,
      ],
      locked: false,
    },
    {
      key: "firm-reviewed-signal",
      kind: "metric" as const,
      href: `${productHref}/firm-reviewed-signal`,
      eyebrow: "Metric",
      title: "Firm-reviewed signal",
      summary:
        snapshot.firmReviewed.assessmentCount === 0
          ? "No firm product reviews are live yet."
          : "Average firm-reviewed score tied to this product.",
      indicators: [
        `Score ${formatScore(snapshot.firmReviewed.averageScore)}`,
        `Sample ${snapshot.firmReviewed.assessmentCount}`,
        `Freshness ${formatFreshness(snapshot.firmReviewed.latestSubmittedAt)}`,
      ],
      locked: false,
    },
    {
      key: "combined-current-pat-readout",
      kind: "metric" as const,
      href: `${productHref}/combined-current-pat-readout`,
      eyebrow: "Metric",
      title: "Combined current PAT readout",
      summary: snapshot.divergence.label,
      indicators: [
        `Divergence ${snapshot.divergence.points === null ? "--" : `${Math.abs(snapshot.divergence.points)} pts`}`,
        `Confidence ${snapshot.confidenceLabel}`,
        `Freshness ${formatFreshness(snapshot.latestUpdatedAt)}`,
      ],
      locked: false,
    },
  ] satisfies VendorProductInsightCardModel[];
}

function buildProCards(snapshot: VendorProductInsightSnapshot, productHref: string) {
  return snapshot.insightRecords.map((insight) => ({
    key: insight.key,
    kind: "pro" as const,
    href: `${productHref}/${insight.key}`,
    eyebrow: "Pro insight",
    title: insight.title,
    summary: insight.currentStateSummary,
    indicators: [
      `Confidence ${insight.confidenceLabel}`,
      `Vendor sections ${insight.vendorSectionEvidence.length}`,
      `Firm utilities ${insight.strongestFirmUtilities.length}`,
    ],
    locked: false,
  }));
}

function buildEliteCards(snapshot: VendorProductInsightSnapshot, productHref: string) {
  return PRODUCT_TIER2_INSIGHTS.map((insight) => {
    const content = getVendorProductInsightContent(insight.key);
    return {
      key: insight.key,
      kind: "elite" as const,
      href: `${productHref}/${insight.key}`,
      eyebrow: "Elite insight",
      title: insight.title,
      summary:
        content?.lockedState?.summary ??
        "This Elite detail remains honestly locked until a broader evidence layer exists.",
      indicators: [
        "Status Locked",
        `Confidence ${snapshot.confidenceLabel}`,
        `Freshness ${formatFreshness(snapshot.latestUpdatedAt)}`,
      ],
      locked: true,
    };
  });
}

export function getVendorProductInsightOverviewCards(snapshot: VendorProductInsightSnapshot) {
  const productHref = `/vendor/product-insight/${snapshot.product.id}`;
  return [
    ...buildMetricCards(snapshot, productHref),
    ...buildProCards(snapshot, productHref),
    ...buildEliteCards(snapshot, productHref),
  ];
}

function buildMetricDetail(snapshot: VendorProductInsightSnapshot, key: string): VendorProductInsightDetailModel | null {
  if (key === "vendor-self-reported-signal") {
    return {
      key,
      title: "Vendor self-reported signal",
      eyebrow: "Metric detail",
      locked: false,
      heroSummary:
        snapshot.vendorSelfReported.latestScore === null
          ? "No vendor product assessment submission is live yet for this product."
          : "This card isolates the latest vendor-authored product assessment score from the rest of the product intelligence stack.",
      heroValue: formatScore(snapshot.vendorSelfReported.latestScore),
      confidenceText: snapshot.vendorSelfReported.latestScore === null ? "No vendor-authored signal yet" : snapshot.confidenceLabel,
      sampleText:
        snapshot.vendorSelfReported.latestScore === null ? "No vendor submission yet" : "Latest vendor final submission",
      freshnessText: formatFreshness(snapshot.vendorSelfReported.submittedAt),
      whatItIs:
        "A single-product vendor score based on the latest submitted vendor product assessment for this product only.",
      howCalculated:
        "PAT uses the latest final vendor product assessment submission, keeps the raw product score intact, and separates this vendor-authored view from firm-reviewed signal instead of blending them.",
      vendorTakeaway:
        snapshot.vendorSelfReported.latestScore === null
          ? "The product still needs a vendor product assessment before PAT can describe vendor posture from live self-reported evidence."
          : `Treat ${formatScore(snapshot.vendorSelfReported.latestScore)} as the current vendor-authored posture, then compare it against later firm-reviewed signal rather than assuming outside confirmation.`,
      exactAssessmentBasis: `Latest vendor score: ${formatScore(snapshot.vendorSelfReported.latestScore)}. Utility scope: ${snapshot.product.utilityScopeLabel}. Section evidence count: ${snapshot.vendorSelfReported.sectionEvidence.length}. Freshness: ${formatFreshness(snapshot.vendorSelfReported.submittedAt)}.`,
      evidencePanels: [
        {
          title: "Strongest live section evidence",
          body: summarizeSections(snapshot.vendorSelfReported.sectionEvidence, "strongest"),
        },
        {
          title: "Weakest live section evidence",
          body: summarizeSections(snapshot.vendorSelfReported.sectionEvidence, "weakest"),
        },
      ],
      notClaimed:
        "This card does not claim firm confirmation, benchmark standing, forecast support, or intelligence beyond the latest vendor product assessment.",
      lockedDisclaimer: null,
    };
  }

  if (key === "firm-reviewed-signal") {
    return {
      key,
      title: "Firm-reviewed signal",
      eyebrow: "Metric detail",
      locked: false,
      heroSummary:
        snapshot.firmReviewed.assessmentCount === 0
          ? "No firm product reviews are live yet for this product."
          : "This card isolates the current firm-reviewed average for this product from vendor self-reported signal.",
      heroValue: formatScore(snapshot.firmReviewed.averageScore),
      confidenceText: snapshot.confidenceLabel,
      sampleText: `${snapshot.firmReviewed.assessmentCount} firm assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}`,
      freshnessText: formatFreshness(snapshot.firmReviewed.latestSubmittedAt),
      whatItIs:
        "A product-specific average built from firm product assessments tied to this same product record.",
      howCalculated:
        "PAT averages the current firm product assessment scores for this product and keeps the result separate from vendor self-report so outside-in signal stays explicit.",
      vendorTakeaway:
        snapshot.firmReviewed.assessmentCount === 0
          ? "There is no firm-reviewed product signal yet, so PAT should not imply external confirmation."
          : `Treat ${formatScore(snapshot.firmReviewed.averageScore)} across ${snapshot.firmReviewed.assessmentCount} firm assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"} as the current buyer-side readout, with confidence constrained by sample size.`,
      exactAssessmentBasis: `Firm-reviewed average: ${formatScore(snapshot.firmReviewed.averageScore)} across ${snapshot.firmReviewed.assessmentCount} assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}. Utility scope: ${snapshot.product.utilityScopeLabel}. Freshness: ${formatFreshness(snapshot.firmReviewed.latestSubmittedAt)}.`,
      evidencePanels: [
        {
          title: "Strongest live utility evidence",
          body: summarizeUtilities(snapshot.firmReviewed.utilityEvidence, "strongest"),
        },
        {
          title: "Weakest live utility evidence",
          body: summarizeUtilities(snapshot.firmReviewed.utilityEvidence, "weakest"),
        },
      ],
      notClaimed:
        "This card does not claim broad market proof, benchmark rank, or forward-looking demand. It is only the live firm-reviewed average currently in PAT.",
      lockedDisclaimer: null,
    };
  }

  if (key === "combined-current-pat-readout") {
    return {
      key,
      title: "Combined current PAT readout",
      eyebrow: "Metric detail",
      locked: false,
      heroSummary: snapshot.combinedCurrentPatReadout,
      heroValue:
        snapshot.divergence.points === null ? snapshot.divergence.label : `${Math.abs(snapshot.divergence.points)} pts`,
      confidenceText: snapshot.confidenceLabel,
      sampleText: `${snapshot.firmReviewed.assessmentCount} firm assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}`,
      freshnessText: formatFreshness(snapshot.latestUpdatedAt),
      whatItIs:
        "A current-state interpretation of how vendor self-reported signal and firm-reviewed signal relate to each other right now.",
      howCalculated:
        "PAT compares the latest vendor product score with the current firm-reviewed average, measures the point gap when both exist, and uses that live relationship to label the current calibration picture.",
      vendorTakeaway:
        snapshot.divergence.points === null
          ? "There is not enough shared signal yet to describe calibration between vendor and firm views."
          : `The live calibration gap is ${Math.abs(snapshot.divergence.points)} points, so the vendor should read both the vendor-authored posture and firm-reviewed posture together rather than assuming they currently agree.`,
      exactAssessmentBasis: `Vendor score: ${formatScore(snapshot.vendorSelfReported.latestScore)}. Firm-reviewed average: ${formatScore(snapshot.firmReviewed.averageScore)}. Utility scope: ${snapshot.product.utilityScopeLabel}. Divergence label: ${snapshot.divergence.label}.`,
      evidencePanels: [
        {
          title: "Live evidence in scope",
          body: `Utility scope: ${snapshot.product.utilityScopeLabel}. Vendor section evidence: ${snapshot.vendorSelfReported.sectionEvidence.length}. Firm utility evidence: ${snapshot.firmReviewed.utilityEvidence.filter((utility) => utility.averageScore !== null).length}.`,
        },
        {
          title: "Confidence and freshness context",
          body: `${snapshot.confidenceSummary} ${snapshot.confidenceCaveats[0] ?? ""} Latest update: ${formatFreshness(snapshot.latestUpdatedAt)}.`,
        },
      ],
      notClaimed:
        "This card does not claim causation, benchmark positioning, or prediction. It only describes the current relationship between live vendor and firm PAT signal.",
      lockedDisclaimer: null,
    };
  }

  return null;
}

function buildProInsightDetail(
  snapshot: VendorProductInsightSnapshot,
  insight: VendorProductInsightRecord
): VendorProductInsightDetailModel {
  const content = getVendorProductInsightContent(insight.key);

  return {
    key: insight.key,
    title: insight.title,
    eyebrow: "Pro insight detail",
    locked: false,
    heroSummary: insight.currentStateSummary,
    heroValue: insight.confidenceLabel,
    confidenceText: insight.confidenceLabel,
    sampleText: `${snapshot.firmReviewed.assessmentCount} firm assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}`,
    freshnessText: formatFreshness(snapshot.latestUpdatedAt),
    whatItIs: insight.what,
    howCalculated: [
      insight.exactAssessmentBasis,
      content?.basisTemplate ? `Basis template: ${content.basisTemplate}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    vendorTakeaway: insight.currentStateSummary,
    exactAssessmentBasis: insight.exactAssessmentBasis,
    evidencePanels: [
      {
        title: "Vendor section evidence",
        body:
          insight.strongestVendorSections.length > 0
            ? `Strongest: ${insight.strongestVendorSections
                .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
                .join(", ")}. Weakest: ${
                insight.weakestVendorSections.length > 0
                  ? insight.weakestVendorSections
                      .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
                      .join(", ")
                  : "No weaker section separation yet."
              }.`
            : "No vendor section evidence is live yet for this insight slice.",
      },
      {
        title: "Firm utility evidence",
        body:
          insight.strongestFirmUtilities.length > 0
            ? `Strongest: ${insight.strongestFirmUtilities
                .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
                .join(", ")}. Weakest: ${
                insight.weakestFirmUtilities.length > 0
                  ? insight.weakestFirmUtilities
                      .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
                      .join(", ")
                  : "No weaker utility separation yet."
              }.`
            : "No firm utility evidence is live yet for this insight slice.",
      },
      {
        title: "Confidence caveats",
        body:
          insight.confidenceCaveats.length > 0
            ? insight.confidenceCaveats.join(" ")
            : "No additional caveats are recorded beyond the current confidence label.",
      },
    ],
    notClaimed:
      content?.confidenceDisclaimerTemplate ??
      "This detail is current-state PAT interpretation only. It does not claim unsupported benchmarks, forecasts, or richer intelligence than the live evidence supports.",
    lockedDisclaimer: null,
  };
}

function buildEliteInsightDetail(
  snapshot: VendorProductInsightSnapshot,
  key: string
): VendorProductInsightDetailModel | null {
  const content = getVendorProductInsightContent(key);
  if (!content?.lockedState) {
    return null;
  }

  return {
    key,
    title: content.title,
    eyebrow: "Elite insight detail",
    locked: true,
    heroSummary: content.lockedState.summary,
    heroValue: "Locked",
    confidenceText: snapshot.confidenceLabel,
    sampleText: `${snapshot.firmReviewed.assessmentCount} firm assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}`,
    freshnessText: formatFreshness(snapshot.latestUpdatedAt),
    whatItIs: content.lockedState.what,
    howCalculated: content.lockedState.basis,
    vendorTakeaway: content.lockedState.how,
    exactAssessmentBasis: content.lockedState.basis,
    evidencePanels: [
      {
        title: "What evidence is live",
        body:
          "Only the current product snapshot is live here: vendor self-reported signal, firm-reviewed signal, confidence, and freshness. This locked card does not expose a separate benchmark, forecast, or simulation layer because that evidence is not live.",
      },
      {
        title: "Current product context",
        body: `${snapshot.combinedCurrentPatReadout} Utility scope: ${snapshot.product.utilityScopeLabel}.`,
      },
    ],
    notClaimed: content.lockedState.disclaimer,
    lockedDisclaimer: content.lockedState.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER,
  };
}

export function getVendorProductInsightDetail(
  snapshot: VendorProductInsightSnapshot,
  cardKey: string
): VendorProductInsightDetailModel | null {
  const metric = buildMetricDetail(snapshot, cardKey);
  if (metric) {
    return metric;
  }

  const proInsight = snapshot.insightRecords.find((insight) => insight.key === cardKey);
  if (proInsight) {
    return buildProInsightDetail(snapshot, proInsight);
  }

  return buildEliteInsightDetail(snapshot, cardKey);
}
