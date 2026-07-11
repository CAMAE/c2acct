# Elite Insights v1 (P2 / Block 3) — data-source map

**Filed:** 2026-07-10, pre-build. Source-field map for the six Elite Insight
surfaces so every displayed number is traceable to stored evidence,
boundary-scoped (`lib/dataBoundary.ts`), confidence-banded (`lib/confidenceBands.ts`),
and (where cross-firm) subject to the minimum-n suppression from Governance
Phase 2 (`lib/benchmarkSuppression.ts`, n≥5 contributors / no single firm >25%).

**Build rules (all six):**
- Elite-gated. Replace the "Coming soon" (`ELITE_PLACEHOLDER_*`) stub with a real
  detail surface for Elite members; keep the locked state for non-Elite.
- Every number through the boundary helper; demo never in a customer-facing pool.
- Register each surface's metric→source→grade in `EVIDENCE-LINEAGE.md` Surface 7
  (this is the **P2 gate row**) before it ships; add a contract test where
  enforceable.
- Confidence bands on thin data; **truthful-scope copy** where evidence can't
  honestly support a number. No p-value / significance / percentile claims.
- Grades: `firm-reviewed` · `vendor self-reported` · `blended` · `benchmark aggregate`.

Shared shapes:
- `InsightSurfaceContent<Key>` (`lib/insightSurface.ts:6-11`): `{ key, title, intro,
  items: {title, body}[] }`. Detail surfaces return this.
- Elite placeholder: `lib/insightContent.ts:24-26` (`ELITE_PLACEHOLDER_TITLE`
  "Coming soon", `_CTA`, `_MESSAGE`); `buildElitePlaceholderSurfaceContent`
  (`lib/insightSurface.ts:55-77`).

---

## FIRM surfaces

### F1 — Firm future-state projection (sandbox per-dimension math)
- Grade: **firm-reviewed (directional)**. Label: "projection, not verified".
- `getAlignmentBoardData(firmCompanyId)` → `AlignmentBoardData`
  (`lib/alignmentBoard.ts:201-359`). Requires firm companyId (tenancy validated by caller).
  - `currentAlignment: number|null` = `recomputeProjectedAlignment(stack.map(p=>p.scoreVsFirm))`
    (`lib/alignmentBoard.ts:138-144`, mean of non-null, rounded int).
  - `stack: BoardPiece[]` (firm's reviewed products, max 8); each `dimensionScores:
    ProductFitDimensionScore[]` (5 product-fit dims).
  - `candidates: BoardCandidate[]` (ranked, each `projectedScore` + `dimensionScores`).
  - `dimensionAxes` = the 5 dims (`lib/productFitDimensions.ts:33-47`): workflow,
    integration, implementation, support, value.
- Projection = re-mean the stack with a swapped candidate; per-dimension = re-mean
  per axis. Thin axes → hollow marker + honest caption (already the Sandbox pattern).

### F2 — Firm peer benchmark (cross-firm module aggregates + Block-1 suppression)
- Grade: **benchmark aggregate**. Label: "anonymized platform aggregate, N firms".
- Firm's own module scores: `getFirmInsightReports(firmCompanyId)` /
  `lib/firmInsightEngine.ts` (alignment index + per-module scores).
- Peer/platform per-module averages + distinct-firm count:
  `getVendorAlignmentInsightBundle({vendorCompanyId})` returns
  `VendorAlignmentInsightBundle` (`lib/vendorAlignmentInsightEngine.ts:1029-1238`)
  with `moduleAggregates: {key,title,averageScore,sampleSize}[]` and
  `benchmarkSuppression` (contributorCount, suppressed). NOTE: this bundle is the
  vendor-facing cross-firm read; for a FIRM peer benchmark, build/adapt an
  equivalent platform per-module aggregate (REAL+PILOT pool) exposing distinct-firm
  count. Platform avg alignment index also in `lib/adminPlatformPicture.ts:111-113`
  (`averageAlignmentIndex`, `scoredFirmCount`).
- **Apply suppression:** any per-module cut with contributorCount < 5 (or a single
  firm >25%) renders the insufficient-peer-data state, not a number.

### F3 — Firm recommendation engine (from action-roadmap engine)
- Grade: **firm-reviewed** + confidence band.
- `buildActionRoadmap(briefings: AdminCompanyBriefing[])` → `VendorBriefRoadmap`
  (`lib/briefs.ts:270-335`): `{ thirtyDay, sixtyDay, ninetyDay: VendorBriefRoadmapItem[] }`.
  - Item (`lib/briefs.ts:96-103`): `{ itemId, window, text, detail, affectedFirmIds,
    signalStrength: "high"|"medium"|"low" }`. Ranked by signalStrength then affected count.
- For a single firm: source its own `nextActions` (from its briefing /
  `getFirmInsightReports`) rather than the cross-firm roadmap, or run the roadmap
  builder over just that firm's briefing.

---

## VENDOR surfaces

### V1 — Vendor market comparison (product vs platform category averages)
- Grade: **benchmark aggregate**. Label: "category aggregate".
- Product cross-firm avg: `VendorProductInsightSnapshot.firmReviewed`
  (`lib/vendorProductInsightEngine.ts:115-122`): `averageScore`, `assessmentCount`.
- Alignment cross-firm module avgs + distinct-firm count:
  `VendorAlignmentInsightBundle.reports[].{averageModuleScore,sampleSize}` and
  `moduleAggregates` (`lib/vendorAlignmentInsightEngine.ts:33-46,1138-1213`).
- **No persisted "category average" exists** — compute from the cross-firm
  aggregates above; apply Block-1 suppression on the contributor count; boundary =
  CUSTOMER_FACING (REAL+PILOT). If a category has <5 contributors → suppress.

### V2 — Vendor future demand projection (firm gap patterns, firm-reviewed)
- Grade: **firm-reviewed / benchmark**. Label: "directional".
- `getVendorAlignmentInsightBundle()` → `bundle.reports[].weakestModules`
  (`lib/vendorAlignmentInsightEngine.ts:91`, sorted lowest avg first) +
  `moduleVariance`. The demand signal is the aggregate weak firm-side modules
  (low averageScore = high demand), with `sampleSize` per module.
- No dedicated "demand" function — derive from weakest modules ranked by ascending
  averageScore, each carrying its distinct-firm sampleSize + confidence band. Keep
  copy directional; suppress modules below n≥5.

### V3 — Vendor expansion simulation (sandbox-for-vendors) — HEAVIEST, net-new
- Grade: **firm-reviewed where reviewed; else vendor self-report** — reuse Sandbox
  floor (firm-reviewed ranked; vendor-reported floored, never outranking).
- **No vendor-side sandbox exists** — `lib/alignmentBoard.ts` is firm-side only.
  Reuse: `buildProductFitDimensions()` (`lib/vendorProductInsightEngine.ts:574`),
  per-product `vendorSelfReported.{latestScore,dimensionEvidence}` +
  `firmReviewed.{averageScore,assessmentCount,dimensionEvidence}` from the snapshot.
  Floor policy mirrors `alignmentBoard.ts:283-317` (unreviewedCandidates floored).
- Simulate adding/expanding a vendor product across the 5 dims; firm-review-backed
  candidates ranked, vendor-self-reported in a separate floored "not yet
  firm-reviewed" section. Confidence band on thin data; truthful-scope copy.

---

## Elite gating / routing (existing patterns to un-stub)

- **Firm:** overview `app/firm/insights/page.tsx` (gates PRO); Elite cards
  `buildFirmEliteInsightCards` (`lib/firmInsightEngine.ts:558`, href:null/locked);
  detail `app/firm/insights/[key]/page.tsx` resolves via
  `FIRM_TIER1/TIER2_INSIGHT_DEFINITIONS`, `getFirmInsightReports`,
  `buildFirmInsightDetailSurfaceContent({report,surface})` (surface pro|elite|help).
- **Vendor product:** `app/vendor/product-insight/[productId]/[insightKey]/page.tsx`
  (`PRODUCT_TIER2_INSIGHTS`, `isTier2`, `buildVendorProductInsightDetailSurfaceContent`).
- **Vendor alignment:** `app/vendor/alignment-insights/[key]/page.tsx`
  (`bundle.reports.find`, `buildVendorAlignmentInsightDetailSurfaceContent`, elite
  case returns placeholder when `report.locked`).
- Elite entitlement: `resolveMembershipEntitlement(user, audience, MEMBERSHIP_PLAN.ELITE)`
  (`lib/membership.ts`). Un-gate the Tier-2 route for Elite; keep locked for Pro.

## Screenshot checkpoint (end of Block 3)
Re-run preview-pat-setup (finishes + prints DONE then hangs on dangling Prisma
handle — kill after DONE, not a deadlock: [[feedback_preview_pat_setup_no_exit]]),
restore all demo accounts, capture all six surfaces, list URLs + accounts for Cam's
review pass.
