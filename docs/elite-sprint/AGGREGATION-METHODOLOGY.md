# PAT Aggregation Methodology (statistician's charter response)

**Filed:** 2026-07-09 (R2, in response to the Data Integrity Audit CLASS 2/3).
Reviewable content artifact — CPA-founder approvable like the question banks.
This document is the STATED methodology; the audit's rule is "defensible if
stated, indefensible if implied otherwise." Nothing in the copy may imply
weighting or statistical significance beyond what is written here.

## 1. Averaging — equal-weight by design (the 3 flagged sites)

All three sites average **self-normalized 0–100 unit scores**, and the equal
weighting is intentional, not an oversight. Weighting by response/sample counts
was considered and rejected per site below.

| Site | Code | Unit averaged | Why equal-weight is correct |
|---|---|---|---|
| Firm alignment index | `adminPlatformPicture` firm index, `adminBriefingEngine` canonicalFirmScore | the firm's 5 module scores (each already 0–100) | The 5 modules are equal **pillars** of the alignment framework. Each module score is self-normalized, so within-module question count is already absorbed — a 4-question module and a 20-question module both emit one 0–100 pillar score, and the framework weights pillars equally by design. Weighting by question count would distort the framework's stated structure. |
| Vendor averageModuleScore | `vendorAlignmentInsightEngine` | the cross-firm mean per module (0–100) | Same equal-pillar rationale: the vendor reading is "how do firms score across the 5 modules," each module one pillar. Per-module sample size is surfaced separately (`sampleSize`) so thin modules are visible, not hidden. |
| Firm-reviewed product average | `vendorProductInsightEngine.firmReviewed.averageScore` | one 0–100 score per firm review | **One firm, one vote.** Each firm's review of a product counts once. Weighting by utility count would let multi-utility reviews dominate the market read, which is not desired — a firm's overall verdict is a firm's overall verdict. |

**Copy rule:** surfaces present these as "average" / "mean across N firms" with the
sample size shown; none claim a weighted, percentile, or significance-tested
figure. The confidence band (§3) qualifies thin samples.

## 2. Divergence sample floor (IMPLEMENTED — behavioral)

`DIVERGENCE_MIN_FIRM_REVIEWS = 3` (`lib/vendorProductInsightEngine.ts`). Below the
floor PAT never asserts a directional "divergence" or "hot divergence" — the gap
is still computed but labelled **"Early signal · N firm reviews — too few to read
divergence"** and `divergence.belowFloor = true`. Enforced at every divergence
assertion: `summarizeDivergence`, the "points apart" calibration caveat,
`adminPlatformPicture` hot-divergence count/rows, `ecosystem.countHotDivergences`,
and `briefs.buildSelfVsMarketDelta.isHotDivergence`. Locked by contract tests
(ecosystem floor test; vendor-product 2-review → early-signal; 3-review → caveat).

## 3. Confidence bands — UX conventions, one shared constant (R3)

Band thresholds are **UX conventions with no claimed statistical basis** — they
keep thin evidence visibly qualified; copy never implies significance, p-values,
or confidence intervals. **Unified into ONE shared definition**
(`lib/confidenceBands.ts`), replacing the per-engine thresholds the audit flagged
(board/salesCard 3/6, product engine 1/4/8, alignment engine 5/10):

- `no_signal` (n ≤ 0) · `sample_thin` (n < 3) · `emerging` (n < 6) · `grounded` (n ≥ 6)

The sample UNIT differs by surface (firm reviews of a product / reviewed products /
completed modules / firms) — the band is applied to whatever count of independent
data points a surface has; that unit is stated per surface in EVIDENCE-LINEAGE.md.
Engine-specific label/summary copy is preserved but keyed off the shared band.
Locked by `tests/confidence-bands.contract.test.ts`.

## 4. Rounding — single authoritative pass at display

The **user-facing value is rounded once, to an integer, at display**
(`formatScore` / `Math.round` at render). Internal aggregates carry `round1`
(one-decimal) precision as a legacy convenience; this intermediate step is bounded
to ≤0.05 points and cannot change any integer-displayed value or any band/score
threshold (all thresholds are ≥1 point apart). This is the stated convention: PAT
does not present sub-integer precision to users and does not imply it.

## 5. Benchmark suppression — minimum-n safe harbor (Governance Phase 2)

Confidence bands (§3) *label* thin evidence; suppression *removes* it. A cross-firm
/ peer benchmark cut is **not published** when either guard fails
(`lib/benchmarkSuppression.ts`):

- **Too few contributors:** fewer than **5 distinct contributing firms**.
- **Single-contributor dominance:** any one firm supplies more than **25%** of the
  cut's weight.

This is the compensation-survey "safe harbor" rule, adopted verbatim, and is
STRICTER than a thin-data label. A suppressed cut renders an **"insufficient peer
data"** state — never a number. Equal-weight (one-firm-one-vote) cuts of n≥5 always
clear the dominance rule by construction (1/5 = 0.20 ≤ 0.25). Suppression composes
with the confidence band: a published cut may still carry a thin/emerging band.

Related integrity walls, stated here for one place of record: (a) **demo/synthetic
data** is excluded from every customer-facing pool (`lib/dataBoundary.ts`); (b) the
**conflict-of-interest wall** — a vendor's own self-report never enters the
firm-review peer mean it is measured against (`tests/coi-wall.contract.test.ts`).

## Change log
- 2026-07-10 (v1.1): added §5 benchmark suppression (minimum-n safe harbor:
  n≥5 contributors, no single contributor >25%). Documented the COI wall and the
  demo dataBoundary wall as the two companion integrity guards.
- 2026-07-09 (v1.0): created (R2). Divergence floor implemented; averaging +
  rounding documented as intentional conventions; confidence bands unified.
