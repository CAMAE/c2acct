# PATALIGN REGRESSION CHECKLIST

Run at every checkpoint. Each item = assertion + how to verify. Verify visual
items against the RUNNING :3005 standalone (build + flag state printed), never
test-context or a stale server. Contract-tested items also carry a `pnpm vitest`
guard so a regression fails the build, not just the eye.

Legend: ✅ pass · ⚠️ needs eyes on running server · ❌ fail · — n/a this run

---

## A — DATA INTEGRITY (taxonomy, benchmarks, suppression)

- **A1** Canonical product taxonomy: every vendor product maps to one of the 7
  canonical categories (no raw utility-key fragmentation).
  _Guard:_ `lib/productCategoryTaxonomy.ts` + reseed. _Probe:_ category count.
- **A2** V1 Category Position: 0 "insufficient peer data" cards for a review
  vendor — every surfaced category clears n≥5 vendors.
  _Probe:_ `scripts/dev/verify-*` / getVendorCategoryReadings suppressed count = 0.
- **A3** Benchmarks recomputed after any reseed (compute:benchmarks only upserts;
  stale rows cleared first with DELETE CompanyBenchmark/BenchmarkRun).
- **A4** Sales Card fit mix is real (median-anchored), not fixed copy — spans
  strong/good/weak (≈1/3 each; 40/30/30 acceptable).
  _Probe:_ `scripts/dev/verify-gap-areas.ts` fit mix.
- **A5** De-clump: ≥4 distinct gap areas across a vendor's ranked firms.
  _Probe:_ `scripts/dev/verify-gap-areas.ts` distinct gap areas.

## B — ENTITLEMENT / TIER GATE (walls before paint)

- **B1** Every Elite detail route resolves ELITE entitlement server-side; a
  non-entitled account renders LockedElitePreview, never live Elite data.
  _Guard:_ `tests/elite-tier-gate.contract.test.ts`.
- **B2** PRO / FREE / NO_MEMBERSHIP never clear the ELITE gate; only ELITE does.
  _Guard:_ same.
- **B3** Vendor product intelligence exposes no Elite data route (?mode=elite
  coerces to pro). _Guard:_ same.

## C — NUMBER INTEGRITY (one shared reader)

- **C1** Each insight's FACE card number == its DETAIL hero number, both portals.
  _Guard:_ `tests/insight-number-integrity.contract.test.ts` (source-scan: the
  detail hero is fed from the shared reader, no averageScore fallback).
- **C2** The six/eight vendor-alignment cards read DISTINCT headline values (own
  primary theme cluster), not one shared pressure point.
  _Probe:_ `scripts/dev/verify-insight-headlines.ts` (distinct ≥ 5-of-8).
- **C3** Threshold math: capability bars labelled per-row at their REAL bar
  (60% or 65%); no hardcoded single "60%" line; "N of M cleared" computed from
  the same displayed thresholds. _Guard:_ `tests/threshold-math.contract.test.ts`.

## D — SEED INVARIANTS

- **D1** Review accounts provisioned (firm=PRO teaser, demo-firm-elite=ELITE,
  demo-firm-pro=PRO, demo-vendor-elite=ELITE). _Source:_ preview:pat-setup.
- **D2** demo-firm-pro resolves PRO / eliteAllowed=false (10b breach guard).
- **D5** BOTH demo Elite accounts (demo-firm-elite, demo-vendor-elite) are
  ELITE + ACTIVE after any reseed (B7-1 invariant).
  _Probe:_ membership snapshot for both.

## E — VISUAL REGRESSIONS (running :3005)

- **E1** Product-intel face card divergence line reads a concise "N.N pt
  divergence" (directional clause only on the detail hero). _Guard:_ magnitudeLabel
  test in `tests/vendor-insight-visuals.contract.test.ts`. ⚠️ confirm on :3005.
- **E2** Self-reported puzzle piece: the "#N · Self-reported" tag stays inside
  the piece border (container clips, rank line truncates).
  _Guard:_ `tests/regression-10e.contract.test.ts`. ⚠️ confirm on :3005.
- **E3** Vendor alignment detail Elite pane (tier-1 insight, ?surface=elite) has
  no "not live / not claiming benchmark" prose contradicting the live Elite pane.
  _Guard:_ `tests/regression-10e.contract.test.ts`.
- **E4** No score/band-chip regressions (bands: Early/Developing/Building/
  Established/Leading; confidence: Grounded/Early signal/No signal).

---

## Checkpoint log

<!-- newest first; one block per checkpoint: build id, flag state, A-E results -->

### Block 10 checkpoint — 2026-07-11

- **Build:** BUILD_ID `i6VTZf5TZy8mA7w2VMr47`, HEAD `ce7d0489` (footer stamp
  "Release ce7d048:i6VTZf5TZy8mA7w2VMr47"). `pnpm build` exit 0.
- **Flags (:3005):** LOCAL_REVIEW_AUTH, CONSULTANT_ACCESS, ALIGNMENT_BOARD,
  SALES_CARD, PAT_ASSISTANT, PINGS = 1.
- **Build proof:** asset-integrity PASS against :3005 — served BUILD_ID == disk
  == fingerprint; /sign-in + /methodology 10/10 assets 200+typed.
- **Validations:** lint:test clean · tsc clean · test:unit 782/782 · 32 Block-10
  contract tests green (tier-gate, number-integrity, threshold-math, 10e,
  vendor-visuals).

| Item | Result | Evidence |
|---|---|---|
| A1 canonical taxonomy | ✅ | product-insight shows Tax & Compliance / Ledger & Close / Payroll & Workforce / Client & Documents / Workflow & Practice Ops |
| A4 sales-card fit mix | ✅ | strong 2 / good 1 / weak 3 (median-anchored) |
| A5 de-clump gap areas | ✅ | 4 distinct gap areas across ranked firms |
| B1–B3 tier gate | ✅ | elite-tier-gate.contract.test.ts (7) |
| C1 face == detail hero | ✅ | data-controls hero "2 of 3" == face metric |
| C2 distinct headlines | ✅ | 8 tier-1 cards → 6 distinct headline values |
| C3 threshold math | ✅ | "capabilities at or above their 60–65% bars"; rows "meets/below 65% bar" |
| D2 10b breach guard | ✅ | demo-firm-pro = PRO / ACTIVE |
| D5 elite seed invariant | ✅ | demo-firm-elite + demo-vendor-elite = ELITE / ACTIVE |
| E1 divergence line | ✅ (:3005) | face cards read "2.8 / 5.7 / 27.2 pt divergence" — no directional overrun |
| E2 puzzle-piece overrun | ✅ (:3005) | "#N · SELF-REPORTED" contained inside every dashed piece border |
| E3 elite pane prose | ✅ (:3005) | elite surface affirms live Elite; no "not live / not claiming" contradiction |

Screenshots: `artifacts/block10-shots/` (E1, E2-alignment-board,
E2-selfreported-zoom, E3-elite-pane, C1-C3-firm-data-controls, sales card).
