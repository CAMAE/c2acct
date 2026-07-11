# PAT — DATA INTEGRITY AUDIT (Full Halt Review)
### July 9, 2026 · Statistician's charter · Independent of Claude Code · Sources: 3 deep engine audits (scoring core · reviews/divergence · benchmarks/aggregates) + the P0/P2-pre findings that triggered the halt
### Verdict up front: Cam's halt was correct. Three distinct integrity classes exist. One is launch-blocking. None is unfixable. Estimated remediation: 3-5 focused days — inside the July 23 window.

---
## CLASS 1 — CRITICAL, LAUNCH-BLOCKING: Demo data contaminates real aggregates

**The finding:** Production's database holds synthetic data (demo-benchmark seed, demo-expand namespace) alongside what will be real customer data — and **no aggregate query filters them apart.** The `dataBoundary` marker exists ONLY on PilotCohort tables; it was never propagated to Company or SurveySubmission, where every cross-entity computation actually reads. Consequences, all verified at file:line by the audit:

- The admin **average alignment index** and **hot-divergence count** pool ALL firms/products — demo included.
- **Vendor alignment bundles** (module/capability cross-firm averages) include demo firms; worse, demo firms can push a metric's sample size over the "grounded" confidence threshold — **fake data manufacturing real-looking confidence.**
- The Sandbox's "drawn from cross-firm benchmarks" claim draws from the same unfiltered pool.
- Self-amplifying artifact: seeded vendor self-scores vs seeded firm reviews generate synthetic "divergence" that inflates platform divergence counts.

**Why it happened:** demo data was seeded as ordinary rows for demo realism; every engine was built against "all rows in scope." Each choice was locally reasonable; nobody owned the boundary as an invariant. (Same failure shape as the FTS column and the fingerprint: correct pieces, unowned seam.)

**The fix (architectural, ~2-3 days):**
1. Add `dataBoundary` (REAL | DEMO | PILOT) to Company + propagate to SurveySubmission (or resolve via company join) — additive migration + backfill from known demo identifiers (seed IDs, demo-expand-* namespace, @pat.local/@patalign.test companies).
2. One shared helper — `getBenchmarkWhere()` / boundary-aware variant of `getSurveyFinalWhere()` — used by EVERY aggregate; customer-facing pools = REAL only (+ PILOT per policy decision below); operator/admin views may include demo but must LABEL the mix and offer the real-only cut.
3. **Contract tests as the wall:** seed a demo row + a real row in test, assert every benchmark/aggregate endpoint excludes the demo row. One test per engine. This is the regression-proof part.
4. Empty-pool honesty: with demo excluded, early-days real pools are tiny — surfaces must show "insufficient real-firm data" states (the AAE confidence discipline) instead of quietly falling back to demo-inflated numbers. **Decision for Cam:** do pilot-cohort firms count in customer-facing benchmarks at launch? (Recommend: yes, labeled "pilot benchmark · N firms".)

## CLASS 2 — HIGH: Aggregation methodology (biased math, honest inputs)

- **Averages-of-averages, unweighted (3 sites):** firm alignment index = flat mean of 5 module scores (modules have different question counts); vendor averageModuleScore = mean of pre-averaged modules (unequal firm counts per module); firm-reviewed product average = flat mean over submissions (multi-utility reviews weigh same as single). Result: thin-evidence inputs punch above their weight. Fix: weight by response/sample counts, or formally document unweighted as the methodology (defensible if stated — indefensible if implied otherwise). ~1 day + tests.
- **No sample floor on divergence assertions:** a single firm review can trigger "HOT DIVERGENCE — firms read this product lower." One reviewer is an anecdote, not a divergence. Fix: minimum-N floor (≥3 firm reviews) before divergence language; below floor → "early signal · N reviews." ~half day.
- **Dual aggregation pathway** for firm averages (submission-level pooled vs utility-level fallback) can yield different numbers for the same product depending on path. Unify or document. ~half day.

## CLASS 3 — MEDIUM: Statistical hygiene

- Confidence-band thresholds (thin <5, emerging 5-9, grounded ≥10) are UX conventions with no stated statistical basis — fine, but document them as conventions; never let copy imply significance. Also: thresholds differ between engines — unify to one shared constant.
- Multi-stage rounding (round1 applied at module then bundle stage) — consolidate to display-time rounding.
- Score bands (Established ≥70 etc.) applied to thin samples without qualifier — pair band chips with the existing confidence labels everywhere.
- Null-silence: products where all firm scores are null go silent rather than saying "no scorable firm evidence."

## VERIFIED CLEAN (equally important — the core is sound)

✓ Draft exclusion (scoreVersion=0) correctly applied at every audited final-metric query · ✓ zero-is-a-valid-answer handled intentionally, with contract test · ✓ tenancy walls hold in every engine audited (no cross-ecosystem leakage found — again) · ✓ post-d4fd4d87, vendor self-report is evidence-graded and segregated in board + sales card, with the ranking floor and provenance labels enforced by 5 contract tests · ✓ no hidden self-report→"firm-verified" leaks found beyond the one Cam caught (now fixed) · ✓ score-scale (0-5) handling correct · ✓ no true feedback loops (metrics feeding their own inputs) — the "gearing itself" risk is the demo contamination above, not recursive math.

## RELEASE CRITERIA (nothing ships until all true)

1. dataBoundary propagated + backfilled; every aggregate goes through the boundary-aware helper; per-engine contract tests green proving demo exclusion.
2. Divergence sample floor live; weighted (or formally documented) averaging at the 3 sites; single rounding pass.
3. EVIDENCE-LINEAGE.md extended to cover every metric in this report, each row naming its pool (REAL/PILOT/DEMO/mixed-labeled).
4. Confidence thresholds unified into one shared constant + copy audit so no label overclaims.
5. My re-verification pass: I independently re-trace the five worst paths post-fix, plus one live check — a real (non-demo) test firm's brief must show pool sizes that exclude demo rows.
6. Cam signs this document's checklist. Then, and only then, un-halt feature work (P2/P3) and resume the launch runway.
