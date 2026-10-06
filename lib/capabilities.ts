import { getLocaleMessages } from "@/lib/locale";

/**
 * pattern box B2 (R61, R-Q): ONE capability table. One row per surface a tier
 * includes — key, label, one sentence, the route (or component) that delivers it,
 * the tiers that have it, the audience. The membership tier bullets and the
 * comparison table on both pages render from these rows; nothing is hand-written
 * beside them. The claim-map test proves every route exists in the app tree and
 * every rendered bullet maps to a row. Labels and cell phrases come from the
 * locale bundle so es/fr follow en.
 */
export type CapabilityAudience = "vendor" | "firm" | "individual";
/** true = included; false = not included; a string = included with that qualifier (a cell phrase). */
export type CapabilityValue = true | false | string;

export type CapabilityRow = {
  key: string;
  label: string;
  sentence: string;
  /** The route that delivers the surface (app/(app) tree; dynamic segments in brackets) — or a component path. */
  route: string;
  component?: string;
  audience: CapabilityAudience;
  /** Optional group header (the individual table groups its rows). */
  category?: string;
  tiers: { free?: CapabilityValue; pro: CapabilityValue; elite: CapabilityValue; enterprise?: CapabilityValue };
};

const COPY = getLocaleMessages("en").membership;
const ROWS = COPY.rows;
const CELL = COPY.cells;

export const VENDOR_CAPABILITIES: readonly CapabilityRow[] = [
  { key: "vendor.productAssessment", label: ROWS.vendor.productAssessment, sentence: "Score each product you sell on the same 20 questions firms answer.", route: "/vendor/product-assessment", audience: "vendor", tiers: { pro: true, elite: true, enterprise: true } },
  { key: "vendor.firmReviews", label: ROWS.vendor.firmReviews, sentence: "The firm product reviews on file for your products, per product.", route: "/vendor/product-insight", audience: "vendor", tiers: { pro: true, elite: true, enterprise: true } },
  { key: "vendor.alignmentInsight", label: ROWS.vendor.alignmentInsight, sentence: "Your self-reported scores beside the firm-reviewed scores, with the divergence by module.", route: "/vendor/alignment-insights", audience: "vendor", tiers: { pro: true, elite: true, enterprise: true } },
  { key: "vendor.productFit", label: ROWS.vendor.productFit, sentence: "The firms in your ecosystem ranked by fit; Pro sees the ranked cards behind a locked preview.", route: "/vendor/battlecard", audience: "vendor", tiers: { pro: CELL.lockedPreview, elite: true, enterprise: true } },
  { key: "vendor.benchmarkDemand", label: ROWS.vendor.benchmarkDemand, sentence: "Category Position and Demand Signals, the Elite insight cards; Pro sees the locked preview.", route: "/vendor/alignment-insights/[key]", audience: "vendor", tiers: { pro: CELL.lockedPreview, elite: true, enterprise: true } },
  { key: "vendor.productFitCardBrief", label: ROWS.vendor.productFitCardBrief, sentence: "One ranked firm at a time, with the brief behind it.", route: "/vendor/battlecard", audience: "vendor", tiers: { pro: CELL.lockedPreview, elite: true, enterprise: true } },
  { key: "vendor.productsCovered", label: ROWS.vendor.productsCovered, sentence: "Which of your products the membership covers.", route: "/vendor/product-assessment", audience: "vendor", tiers: { pro: CELL.declaredProducts, elite: CELL.declaredProducts, enterprise: CELL.allProductLines } },
  { key: "vendor.channelView", label: ROWS.vendor.channelView, sentence: "Category averages, distributions and module positions across the whole channel, above the evidence thresholds.", route: "/enterprise/channels/[verticalId]", audience: "vendor", tiers: { pro: false, elite: false, enterprise: true } },
  { key: "vendor.guideBriefing", label: ROWS.vendor.guideBriefing, sentence: "A quarterly briefing per ecosystem, delivered by an independent Guide.", route: "/enterprise/briefings/[companyId]", audience: "vendor", tiers: { pro: false, elite: false, enterprise: true } },
  { key: "vendor.firmEvidence", label: ROWS.vendor.firmEvidence, sentence: "Firm-level evidence for your own ecosystem; no other vendor sees your firms.", route: "/enterprise/ecosystems/[ecosystemId]", audience: "vendor", tiers: { pro: false, elite: CELL.yourEcosystemOnly, enterprise: CELL.yourEcosystemOnly } },
];

export const FIRM_CAPABILITIES: readonly CapabilityRow[] = [
  { key: "firm.alignmentAssessment", label: ROWS.firm.alignmentAssessment, sentence: "The five modules, 20 scored questions each, with five follow-ups.", route: "/firm/alignment-assessment", audience: "firm", tiers: { pro: true, elite: true } },
  { key: "firm.insightsHub", label: ROWS.firm.insightsHub, sentence: "Your module scores and the drill-down behind each.", route: "/firm/insights", audience: "firm", tiers: { pro: true, elite: true } },
  { key: "firm.productAssessments", label: ROWS.firm.productAssessments, sentence: "Review the products your firm runs; your reviews feed the firm-reviewed score.", route: "/firm/product-assessments", audience: "firm", tiers: { pro: true, elite: true } },
  { key: "firm.sandbox", label: ROWS.firm.sandbox, sentence: "Swap stack pieces and watch the projected alignment recompute; Pro plays with candidate names hidden.", route: "/firm/alignment-board", audience: "firm", tiers: { pro: CELL.candidateNamesHidden, elite: true } },
  { key: "firm.peerBenchmark", label: ROWS.firm.peerBenchmark, sentence: "Your position against the cohort; Pro reads the bands, Elite the exact position.", route: "/firm/benchmark", audience: "firm", tiers: { pro: CELL.cohortBands, elite: CELL.exactPosition } },
  { key: "firm.eliteInsights", label: ROWS.firm.eliteInsights, sentence: "Peer Position, the Gap Plan and Trajectory; Pro sees the locked preview.", route: "/firm/insights/[key]", audience: "firm", tiers: { pro: CELL.lockedPreview, elite: true } },
];

export const INDIVIDUAL_CAPABILITIES: readonly CapabilityRow[] = [
  { key: "individual.alignmentAssessment", label: "Personal alignment assessment", sentence: "The person-level alignment assessment.", route: "/user/alignment-assessment", audience: "individual", category: "Core signal", tiers: { free: true, pro: true, elite: true } },
  { key: "individual.insightDepth", label: "Insight depth", sentence: "How much of the insight catalog opens.", route: "/user/insights", audience: "individual", category: "Core signal", tiers: { free: "Basic", pro: "Full Pro Insights", elite: "Priority queue" } },
  { key: "individual.recommendations", label: "Recommendation engine", sentence: "Recommendations once your answers carry enough signal.", route: "/user/insights/[key]", audience: "individual", category: "Briefings", tiers: { free: false, pro: true, elite: true } },
  { key: "individual.progress", label: "Quarterly progress tracking", sentence: "Your scores quarter by quarter.", route: "/user/insights", audience: "individual", category: "Briefings", tiers: { free: false, pro: true, elite: true } },
  { key: "individual.archive", label: "Personal scorecard archive", sentence: "Every past scorecard, kept.", route: "/user/profile", audience: "individual", category: "Briefings", tiers: { free: false, pro: false, elite: true } },
  { key: "individual.emailSupport", label: "Email support", sentence: "Support by email.", route: "/support", audience: "individual", category: "Support", tiers: { free: true, pro: true, elite: true } },
  { key: "individual.coaching", label: "Coaching session credits", sentence: "Coaching sessions included with the tier.", route: "/user/membership", audience: "individual", category: "Support", tiers: { free: false, pro: false, elite: true } },
];

export function capabilitiesFor(audience: CapabilityAudience): readonly CapabilityRow[] {
  return audience === "vendor" ? VENDOR_CAPABILITIES : audience === "firm" ? FIRM_CAPABILITIES : INDIVIDUAL_CAPABILITIES;
}

export type CapabilityTier = "free" | "pro" | "elite" | "enterprise";

/**
 * The bullets a tier card shows: every row the tier includes, in table order. A
 * qualified inclusion reads "Label: qualifier"; a locked preview is not an inclusion.
 */
export function capabilityBullets(audience: CapabilityAudience, tier: CapabilityTier): string[] {
  const lockedPreview = CELL.lockedPreview;
  return capabilitiesFor(audience)
    .map((row) => ({ row, value: row.tiers[tier] }))
    .filter(({ value }) => value !== undefined && value !== false && value !== lockedPreview)
    .map(({ row, value }) => (value === true ? row.label : `${row.label}: ${value}`));
}

export const CAPABILITY_ROWS: readonly CapabilityRow[] = [...VENDOR_CAPABILITIES, ...FIRM_CAPABILITIES, ...INDIVIDUAL_CAPABILITIES];
