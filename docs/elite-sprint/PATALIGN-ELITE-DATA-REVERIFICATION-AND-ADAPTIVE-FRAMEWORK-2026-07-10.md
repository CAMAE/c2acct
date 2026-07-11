# Elite Data Re-Verification + Adaptive-Modules → Elite Framework
### July 10, 2026 · Independent second codebase sweep (file:line verified) · Includes the correction amendment for Claude Code — read Part 1 first, it matters for the build running right now

---

# PART 1 — RE-VERIFICATION VERDICT

Second sweep, independent of the first inventory. Result: **four of the six v2 surfaces are confirmed on the best available data. Two of my own claims were wrong and need an amendment to Claude Code before it builds on them.** Catching this is exactly why you asked for re-verification.

## 1.1 What I got wrong (owning it precisely)

**F1 error — "BenchmarkRun already stores p10-p90; CompanyBenchmark stores percentile" was HALF true.** The tables and columns exist in the schema — but the sweep proved they are **fully dark: zero writers and zero readers anywhere in the codebase.** No job has ever populated them; the schema was built ahead of the pipeline. So the percentile data isn't "stored and discarded" — it's *designed and never computed*. The fix is right and still very buildable: a boundary-aware compute job (suppression-gated, versioned per the methodology page) that populates BenchmarkRun + CompanyBenchmark from SurveySubmission — the same pool the live suppressed peer benchmark already uses. F1's design stands; its data path was understated by one step.

**F3 error — same shape.** FirmMaturitySnapshot/Momentum have rich trend fields but are **written only by the demo seed** — no production writer, no reader. Real trajectory must be computed from SurveySubmission history, which IS fully indexed for it (`[companyId, moduleId, createdAt]`, all versions retained). Production momentum = a computation over submission history that *also* backfills the snapshot tables so they become real.

Also sharpened: **V2's** "review velocity" and "divergence trend" are net-new time-series (computable from indexed createdAt, but nothing computes them today — consistent with what I said about swap logging). **V3** should reuse the per-utility firm-vs-vendor aggregation already computed in vendorProductInsightEngine (lines 507-575) and the consultant coverage map (`vendorCoverageMapForVendor`, ecosystem.ts:428) — the heatmap is an assembly job, not new math. **One governance note:** the current Elite copy constant hard-codes "never a percentile claim" — that was the right rule when percentiles weren't computable; with a real suppressed pipeline it becomes wrong. Percentiles go into the methodology page as a versioned addition (n≥5, >25% dominance, "convention not significance" note), Elite-only. You approved percentile-led design in the v2 verdict; this is the paperwork that makes it legal under our own rules.

**F2, V1 — CONFIRMED as specced** (gap list computed live today; vendor comparison over the suppressed pool). No changes.

## 1.2 Valuable assets the first pass underweighted (new findings)

1. **The open-ended free-text corpus** flows only to admin/consultant surfaces today. It is the only verbatim voice-of-the-firm data we hold. Post-launch Elite candidate: themed, suppressed qualitative panels ("what firms say," anonymized) — the ProfitCents narrative idiom fed by real language. Not for July 23 (needs theming discipline + privacy review), but it's real inventory.
2. **Answer-quality signals** (signalIntegrityScore + named integrity flags: straightlining, low variance, skew) are computed and persisted on firm finals — flags never surfaced. Caveat found: on vendor assessments and drafts the field is overloaded as draft-resume state, so any use is firm-finals-only. Near-term value is internal (data-quality weighting for benchmarks) rather than customer-facing.
3. **Consultant-exclusive computations** (per-firm hot-divergence counts, confidence distributions, risk/opportunity panels) already rank entities in ways firms/vendors never see — an Elite "how the consultant sees you" teaser is cheap surface area and reinforces the consultant-portal launch story.
4. **Badges/EngagementQuarter/notification streams** — recognition and engagement analytics inventory for the post-launch artifact program (badges/quadrant), noted and parked.

## 1.3 AMENDMENT FOR CLAUDE CODE — paste this to it now

> AMENDMENT to the Elite Insights v2 build (verdict doc §4/§6), from the independent re-verification — adjust before building F1/F3:
> 1. **F1:** BenchmarkRun/CompanyBenchmark are dark tables — nothing populates them. Build the compute pipeline first: a boundary-aware, suppression-gated (n≥5, >25% dominance) aggregation job over final SurveySubmissions that writes BenchmarkRun (n, mean, stdev, p10-p90, versioned) and CompanyBenchmark (score, percentile) per cohort×metric; wire it into the validation chain and a scheduled/computed-on-write path; F1 reads ONLY these tables. Add the percentile methodology section (versioned changelog entry) to /methodology and update the Elite copy constant: percentile claims are now permitted in Elite surfaces only, always suppression-gated, labeled as ranking conventions not statistical significance.
> 2. **F3:** FirmMaturitySnapshot/Momentum are demo-seed-only. Compute real trajectory from SurveySubmission history (the [companyId, moduleId, createdAt] index; all versions retained) and make the production path backfill/write the snapshot+momentum tables so they become live. Demo accounts keep seeded history for full-looking demos.
> 3. **V3:** assemble the heatmap from the existing per-utility aggregation in vendorProductInsightEngine (~:507-575) and the consultant coverage map (ecosystem.ts vendorCoverageMapForVendor) — do not re-derive the math.
> 4. Everything else in the v2 prompt stands, including SandboxSwapEvent logging and mandatory charts. Note in your ledger which of F1/F3 changed from "read stored data" to "compute then read."

---

# PART 2 — ADAPTIVE MODULES → ELITE INSIGHTS FRAMEWORK

Your instinct is correct, and the research agrees: **the adaptive question sets are Elite fuel — probably the strongest Elite moat we will ever have** — because they generate data no competitor in this vertical possesses: calibrated, item-level, longitudinally re-measured capability evidence on CPA firms. G2 has reviews; Rosenberg has an annual questionnaire. Nobody has *instrumented assessment*.

## 2.1 What exists today (sweep-verified)

The schema is ahead of the wiring, deliberately: ModuleTemplate/ModuleItem/ModuleSource/ModuleUnlockRule all exist; the 90-item bank imports (27 easy/45 moderate/18 hard, 6 anchors, sources enforced); the exam-serving logic (stress-weighted by discrimination, 30/50/20 mix, anchors always included, Latin-square order) is written and tested — but **dark**: nothing calls it at runtime, the template sits in DRAFT pending the CPA founder's approval, and ModuleUnlockRule (the score-geared unlock engine) has zero readers.

**The one decisive gap:** the current survey path stores slider/scale answers and never grades anything. There is **no per-item correct/incorrect capture** — no pathway compares an answer to ModuleItem.correctKey and persists the result. Without that, every item-level insight below is impossible, and pValue/discrimination stay hand-set seeds forever.

**→ Prerequisite Zero: an `ItemResponse` table** (submissionId, itemKey, chosenKey, correct, answeredAt) written by the graded-exam submission path, boundary-tagged, from the first live sitting. One table, cheap now, impossible to retrofit history onto later. This is the single most important architectural decision of the adaptive program.

## 2.2 The framework: every answer is one row of Pro and one column of Elite

The mental model: **Pro consumes the score; Elite consumes the pattern.** A completed adaptive module gives Pro exactly what today's modules give — a score, a pass, an unlock. Elite gets the analytics that only exist *because* the items are calibrated, sourced, and re-measured. Six insight classes, ordered by how directly the data supports them:

**E1 · Score Depth (robustness).** Two firms at 68 are not the same firm: one clears hard, high-discrimination items (durable capability); one survives on easy items (fragile). Hard-item performance vs easy-item performance = a *quality dimension on the score itself* that no averages product can offer. Pro: 68. Elite: 68, and whether it's load-bearing. Requires: ItemResponse only.

**E2 · Item-level peer difficulty ("only 24% of firms clear this").** Anchor items are answered by every firm unchanged — they're a perfect cross-firm thread. Per-item clear-rates (suppressed, n≥5) tell a firm which specific practices separate the field. This is Culture Amp's driver analysis rebuilt on assessment data, and feeds F2's gap list with item-level precision. Requires: ItemResponse + modest sitting volume.

**E3 · Verified improvement (the ROI proof).** Your unlock loop — weak spot → diagnostic → remediation reading → re-assessment — produces the platform's most commercially precious number: **measured before/after on the same calibrated instrument.** "Integration: 52 → 71 after remediation, re-measured on anchored items" is simultaneously an F3 trajectory point, a renewal argument, and the marketing claim every competitor has to fake. Elite-only surface; Pro sees the new score, Elite sees the verified delta and what drove it.

**E4 · Pattern-cohort peer groups (solves the missing firm-size field).** The research said custom peer groups are a top-3 premium gate, and we lack firm-size data. The adaptive engine's scoring-pattern subsets ARE peer groups — "firms with your shape" is a *better* comparison set than "firms with your headcount," and it's native to our data. Elite percentile position within your pattern cohort (n≥5 floor, exactly the Payscale rule) upgrades F1 from "vs all firms" to "vs firms like you." Requires: pattern-subset assignment live (the ModuleUnlockRule engine).

**E5 · Strength-forensics library ("what the top quartile does").** Strength modules capture the practices behind high scores. Aggregated and suppressed, that's a premium content product: "practices reported by top-quartile firms on Governance" — benchmark gold that also feeds remediation reading for everyone else. Elite = access to the library; the library grows itself from the pattern data.

**E6 · Vendor demand map (the V2/V3 multiplier).** Aggregated firm weaknesses at item/category level = a live map of what the market cannot do — precisely what vendors pay to know. "38% of firms in your ecosystem fail reconciliation-practice items; your integration story addresses this" turns firm diagnostics into vendor pipeline intelligence, suppressed and anonymized, COI wall intact (a vendor never sees data that scores that vendor). This is the adaptive engine feeding V2 Demand Signals and V3 whitespace with content no swap-log can produce.

Plus the calibration loop as infrastructure: real p-values and discrimination accrue from ItemResponse, items that stop discriminating get retired quarterly — which silently makes E1-E4 sharper every quarter. And it all honors the build-to-last constraint: capability-level, pattern-keyed vectors are exactly what the future pairing engine needs.

## 2.3 Tier line and sequencing

**Pro:** take modules, get scores, unlock next modules, see own gap list. **Elite:** depth/robustness read, item-level peer difficulty, verified-improvement history, pattern-cohort percentile, forensics library, (vendor) demand map. The line is clean: *doing* the assessment is Pro; *learning from everyone's assessments* is Elite.

Sequence: (0) ItemResponse table + graded submission path — schedule with the first adaptive build, pre-NASBA, non-negotiable; (1) CPA approval flips the first bank to APPROVED and serving goes live (human gate — Leslie/clarity + CPA/accuracy per the locked two-signature rule); (2) unlock-rule engine (pattern subsets); (3) E1+E3 first (single-firm honest at any n — no peer floors needed); (4) E2/E4/E5/E6 as sitting volume crosses suppression floors. None of this is July 23 scope; Prerequisite Zero is the only thing that must be *designed* before the first adaptive module ships, or we burn unrecoverable data.

---
*Both agent reports (competitive tiering with URLs; second-sweep file:line inventory) preserved in session; ask to export as appendices.*
