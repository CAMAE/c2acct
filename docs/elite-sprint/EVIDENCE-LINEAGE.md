# Evidence Lineage — displayed-number provenance audit

**Filed:** 2026-07-09 (P2-pre, launch-critical). **Scope:** every displayed number
on the Sandbox, BattleCard, consultant vendor brief, the vendor/firm insight
surfaces, and the planned Elite insights (P2). This is the source of truth for
the evidence-lineage policy; contract tests
(`tests/evidence-lineage-policy.contract.test.ts`) lock the enforced parts.

## Policy (enforced in code, not prose)

1. **Firm-reviewed is primary.** Whenever firm-review evidence exists for a
   metric, it is used; self-report is never substituted where firm-review exists.
2. **Self-report is always labelled.** Any metric that uses vendor self-report —
   alone or blended — carries a visible provenance label (the Sandbox's red
   caption / orange chip is the canonical pattern).
3. **No silent self-report.** Nothing renders vendor self-report as if it were
   firm-verified.

Evidence grades: `firm-reviewed` · `vendor self-reported` · `blended`
(firm-reviewed primary, self-report fallback) · `benchmark aggregate` (cross-firm).

---

## Surface 1 — Alignment Sandbox (`app/components/firm/AlignmentBoardClient.tsx`, `lib/alignmentBoard.ts`)

| Metric (UI) | Source field(s) | Grade | UI provenance label |
|---|---|---|---|
| Current alignment % (banner) | `recomputeProjectedAlignment(boardStack.scoreVsFirm)` ← `getAdminCompanyBriefing().productLayer.products[].canonicalFirmReviewScore` | **firm-reviewed** | "current alignment · {confidenceLabel}" |
| Projected % + delta (banner) | mean of stack scores with swapped piece = candidate `projectedScore` | **firm-reviewed** (ranked candidate) / **blended** (unreviewed candidate) | "projected after swap"; unreviewed candidate → orange radar note (`radarEvidenceNote`) |
| Stack piece score | `piece.scoreVsFirm` ← `canonicalFirmReviewScore` | **firm-reviewed** | confidence label in detail card |
| Radar axes (5 product-fit dims) | `getFirmProductFitDimensionsByProduct` (this firm's per-section review answers) | **firm-reviewed** | "Product-fit dimensions"; thin axes hollow-marked + caption |
| Ranked candidate projected fit | `snapshot.firmReviewed.averageScore` | **firm-reviewed** (cross-firm) | "ranked fits — every rank is backed by real firm reviews" |
| **Not-yet-reviewed candidate projected fit** | `snapshot.vendorSelfReported.latestScore` (no firm reviews) | **vendor self-reported** | **Separate dashed-orange "Not yet firm-reviewed" section**, "Self-reported" tier chip, `data-grade=vendor_reported`, floored below ranked fits |
| Candidate radar projection | `firmReviewed.dimensionEvidence` else `vendorSelfReported.dimensionEvidence` | **firm-reviewed** / **vendor self-reported** | `radarEvidenceNote` orange caption when vendor-reported |

**Enforcement:** `lib/alignmentBoard.ts` splits `candidates` (firm-reviewed, ranked)
from `unreviewedCandidates` (vendor-reported, floored). Contract:
`Sandbox candidate rail policy (floor + grade)`.

---

## Surface 2 — Vendor BattleCard (`app/components/vendor/VendorBattleCardClient.tsx`, `lib/battleCard.ts`)

| Metric (UI) | Source field(s) | Grade | UI provenance label |
|---|---|---|---|
| **Product strength %** | mean of `snapshot.firmReviewed.averageScore` when any exist; else mean of `vendorSelfReported.latestScore` | **firm-reviewed** (primary) / **vendor self-reported** (only if zero firm reviews) | `<EvidenceProvenance>` chip: green "Firm-reviewed · N products (M self-reported-only excluded)" OR orange "Vendor self-reported — not firm-verified" |
| Alignment delta / fit (per firm row) | `vendorStrength − firmAlignment`; `firmAlignment` ← `canonicalFirmScore` | inherits strength grade (firm-reviewed when strength is) | fit bar + tier chip; strength chip carries the grade |
| Firm module score (detail gap table) | `briefing.firmLayer.moduleHeatmap[].canonicalScore` | **firm-reviewed** | firm-reviewed (firm's own assessment) |
| Module headroom | `vendorStrength − moduleScore` | inherits strength grade | "Headroom = product strength − module score" caption |
| Evidence count | `sectionScores[].answeredCount/questionCount` | **firm-reviewed** | "scored" when answers not individually recorded |
| Mini-radar vendor ring | `vendorStrength` (single overall value) | inherits strength grade | dashed ring, "Your product strength (overall)", not per-module |

**Change (P2-pre):** was `firmReviewed.averageScore ?? vendorSelfReported.latestScore`
per product then meaned — a silent per-catalog **blend**. Now firm-reviewed-only
mean (self-report excluded + disclosed), graded, labelled. Contract:
`BattleCard product-strength evidence grade`.

---

## Surface 3 — Consultant Vendor Brief (`app/consultants/.../vendor-brief/`, `lib/briefs.ts`)

| Metric (UI) | Source | Grade | Provenance label (existing) |
|---|---|---|---|
| Firm average | `avgFirmAlignmentScore(catalog)` ← canonicalFirmScore | **firm-reviewed** | "Firm average" + firm-count footer |
| Vendor self-report avg | mean `vendorSelfReported.latestScore` | **vendor self-reported** | labelled "Vendor self-report" |
| Self-vs-market delta | `vendorSelfReported − firmReviewedAverage` | **blended** | adjacent "vendor self-report X · firm avg Y · N firm reviews"; "Hot divergence" chip; "Awaiting firm review" when null |
| Per-firm heatmap cell | `productLayer.products[].canonicalFirmReviewScore` | **firm-reviewed** | band legend; "Not yet reviewed" for null |

**Status:** already labelled (components separate self-report from firm avg). Minor
gap: the delta *number* has directional colour but no explicit "blended" word —
the two source numbers sit adjacent, so provenance is present. **No change
required for launch;** noted for polish.

---

## Surface 4 — Vendor Product Insight (`lib/vendorProductInsightEngine.ts`)

| Metric | Source | Grade | Label |
|---|---|---|---|
| Vendor score | `vendorSelfReported.latestScore` | **vendor self-reported** | "self-reported signal" |
| Firm score | `firmReviewed.averageScore` | **firm-reviewed** | "Firm-reviewed" |
| Divergence | `summarizeDivergence(vendor, firm)` | **blended** | full-sentence divergence copy |
| Section evidence | vendor answers per section | **vendor self-reported** | "Vendor self-reported section evidence" heading |
| Utility evidence | firm answers per utility | **firm-reviewed** | "Firm-reviewed feature evidence" heading |

**Status:** provenance explicit (separate headings, confidence band). No change.

## Surface 5 — Vendor Alignment Insights (`lib/vendorAlignmentInsightEngine.ts`)
All displayed numbers (module/cluster/capability averages, sample size) are
**firm-reviewed** (firm module completions). Confidence band + sample-size basis
shown. No self-report involved. No change.

## Surface 6 — Firm Insights (`app/firm/insights/`, `lib/firmInsightEngine.ts`)
Alignment index, modules-complete, capabilities-met, radar axes — all **this
firm's own firm-reviewed** scores. "current-state evidence only" context. No
self-report. No change.

---

## Surface 7 — Elite Insights v2 (verdict §4, REBUILT — six decision products)

Rebuilt 2026-07-10 (v1 rejected: it shipped averages behind an Elite badge). v2 is
rank / distribution / trajectory / demand / heatmap — the premium gates, from real
stored evidence. All suppression (n≥5), divergence floor (≥3), boundary wall, and
confidence rules unchanged; every projection labelled directional. Charts are
mandatory per card. Builders `lib/eliteInsightsV2.ts`; charts `app/components/charts/*`.

| Surface (key) | Real source | Grade | Chart | Suppression / floor |
|---|---|---|---|---|
| F1 Peer Position (`firm_tier2_benchmark`) | `BenchmarkRun` p10-p90 + `CompanyBenchmark.percentile` (computed by `lib/benchmarks.ts` from latest-per-firm module scores, cohort `firm:{real,demo}`) | **benchmark aggregate** (percentile) | PercentileBand + report card | **suppress <5 firms** per cut |
| F2 Gap Plan (`firm_tier2_recommendation`) | `firmInsightEngine` per-capability score vs threshold (the discarded gap list) | firm-reviewed | RankedBars (gap/watch) | — (watch-list when a top firm has no gaps) |
| F3 Trajectory (`firm_tier2_projection`) | `FirmMaturitySnapshot` history + `FirmMaturityMomentum` (delta/velocity/volatility/trend) | firm-reviewed (directional) | TrajectoryChart line + projection band | needs ≥2 snapshots; projection labelled directional |
| V1 Category Position (`benchmark-comparison`) | `BenchmarkRun`/`CompanyBenchmark` vendor cohort per category (firm-reviewed product strength) | **benchmark aggregate** | DistributionCurve + rank/quartile | **suppress <5 vendors** per category |
| V2 Demand Signals (`forward-projection`) | `SandboxSwapEvent` (first-party intent, boundary-tagged) | first-party behavioral | SwapFlowTiles | early-signal note below 5 events |
| V3 Alignment Gap Map (`scenario-simulation`) | per-product per-dimension firm-review vs vendor self-report (`vendorProductInsightEngine` dimensionEvidence) | blended (firm-reviewed primary) | HeatmapGrid (confirm/dispute) | **≥3 firm reviews** before a cell is scored |

**Dark-data note:** `BenchmarkRun`/`CompanyBenchmark` were empty (no writer existed);
`lib/benchmarks.ts` now computes them from real submission scores. `FirmMaturitySnapshot`
history + demo `SandboxSwapEvent` are seeded for demo accounts (clearly demo rows) so
every card renders full-looking — never fabricated-live. **P2 gate for v2: MET.**

---

## Surface 7-v1 — Elite Insights v1 (P2 / Block 3, SUPERSEDED by v2 above)

Built 2026-07-10 (Block 3). Every number is firm-reviewed-primary with a visible
grade; self-report/benchmark input carries a provenance label; confidence bands on
thin data; truthful-scope copy where evidence can't support a figure. All six are
Elite-gated (Pro keeps the locked "Coming soon"); numbers route through the
boundary helper (`lib/dataBoundary.ts`, viewer-scoped) and cross-firm/peer cuts
carry the Governance Phase 2 minimum-n suppression (`lib/benchmarkSuppression.ts`).
Builders: `lib/eliteInsights.ts`. Contract: `tests/elite-insights.contract.test.ts`.

| Insight (key) | Real source field(s) | Grade | Provenance label | Suppression / band |
|---|---|---|---|---|
| Firm future-state projection (`firm_tier2_projection`) | `getAlignmentBoardData().{currentAlignment, stack[].dimensionScores, candidates[0].projectedScore/grade}` | firm-reviewed (directional) | "projection, not verified" | confidence band on stack size |
| Firm peer benchmark (`firm_tier2_benchmark`) | firm `getAdminCompanyBriefing().firmLayer.{averageScore, moduleHeatmap}` vs `getPeerBenchmark(viewerPool).{overallAverageIndex, modules[].averageScore, contributorCount}` | **benchmark aggregate** | "anonymized platform aggregate, N firms" | **suppress <5 firms / >25% (overall + per-module)** |
| Firm recommendation engine (`firm_tier2_recommendation`) | `buildActionRoadmap([briefing]).{thirtyDay,sixtyDay,ninetyDay}[].{text,detail,signalStrength}` | firm-reviewed | confidence band + per-action signal strength | band on completedModuleCount |
| Vendor benchmark/market comparison (`benchmark-comparison`) | vendor `getVendorProductInsightCatalog().firmReviewed.{averageScore,assessmentCount}` vs `getPlatformProductBenchmark(viewerPool).{marketAverage,contributorCount}` | **benchmark aggregate** | "platform aggregate, N firms" | **suppress <5 firms per cut** |
| Vendor future demand (`forward-projection`) | `getPeerBenchmark(viewerPool).modules[]` ranked ascending average (weakest = demand) | **benchmark aggregate** (firm-reviewed) | "directional" | **suppress modules <5 firms** |
| Vendor expansion simulation (`scenario-simulation`) | `getVendorProductInsightCatalog()` per product: `firmReviewed.averageScore` (ranked) else `vendorSelfReported.latestScore` (floored) | firm-reviewed where reviewed; else vendor self-reported | **grade per candidate (Sandbox floor: firm-reviewed ranked, vendor-reported floored)** | band on firm-reviewed count |

**Empty-pool honesty:** each builder returns `available:false` + truthful-scope copy
(no fabricated number) when its evidence is too thin — e.g. empty stack, zero
firm-reviewed products, or every peer cut below the safe harbor.

**Gate for P2: MET.** Table extended with real source fields + grades + provenance
+ suppression, and locked by `tests/elite-insights.contract.test.ts`.

---

## Surface 8 — Cross-entity aggregates (2026-07-09 audit CLASS 1/2, each names its POOL)

Every aggregate below is boundary-scoped via `lib/dataBoundary.ts` — **DEMO rows
are never in a customer-facing pool.** Pool = REAL (`PRODUCTION`) + PILOT for
customer/operator views; DEMO only for demo viewers. Divergence assertions carry
the ≥3-review floor (`DIVERGENCE_MIN_FIRM_REVIEWS`). Confidence bands come from
the one shared constant (`lib/confidenceBands.ts`, thin 3 / emerging 6).

| Metric (UI) | Source | Grade | Pool | Notes |
|---|---|---|---|---|
| Platform average alignment index | `adminPlatformPicture` firm module submissions | firm-reviewed | **REAL+PILOT** (operator) | `REAL_POOL`; demo excluded |
| Platform firm/vendor counts | `company.count` | n/a | **REAL+PILOT** | demo excluded |
| Platform hot-divergence count/rows | vendor self-report vs firm avg | blended | **REAL+PILOT** | ≥3-review floor |
| Firm league (per-firm index) | firm module submissions | firm-reviewed | **REAL+PILOT** | demo firms excluded |
| Ecosystem avg firm alignment | `ecosystem.avgFirmAlignmentScore` | firm-reviewed | **scoped** (getVendorScopedFirms, boundary-aware) | demo firms never in a real vendor's scope |
| Ecosystem hot-divergence count | `ecosystem.countHotDivergences` | blended | **scoped** | ≥3-review floor (product.firmReviewCount) |
| Vendor module/capability averages | `vendorAlignmentInsightEngine` | firm-reviewed | **scoped** (or REAL+PILOT unscoped) | equal-pillar mean; sample size shown |
| Product firm-review average | `vendorProductInsightEngine.firmReviewed.averageScore` | firm-reviewed | **scoped** | one-firm-one-vote; divergence floored |
| Sandbox candidate vendor pool | `alignmentBoard` vendor query | n/a | **viewer-firm pool** | real firm → no demo vendor products |
| Sandbox candidate projections | firm-reviewed cross-firm / vendor self-report | firm-reviewed / vendor-reported | **viewer-firm pool** | vendor-reported floored to "Not yet firm-reviewed" |

**Empty-pool honesty:** when a real pool is empty after excluding demo, surfaces
show `INSUFFICIENT_REAL_DATA_COPY` / existing "awaiting"/"not yet reviewed" states
— never a demo fallback. Methodology (averaging, floor, rounding, band thresholds)
is documented in `AGGREGATION-METHODOLOGY.md`.
