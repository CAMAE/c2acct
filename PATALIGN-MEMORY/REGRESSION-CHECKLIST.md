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

## F — VISUAL UNIFICATION (Block 11)

- **F1** All portal + consultant cards use the `pat-card` law (28px radius,
  --shell-panel bg, pat-card-interactive hover) — no off-law rounded-[24px] /
  soft-panel one-offs. _Sources:_ PortalSurfaceCard, EcosystemListCard.
- **F2** Face cards carry NO score-band chip (number + one line only); the band
  word appears only in the detail hero. _Guard:_ vendor-alignment + vendor-product
  Pro card builders set no band statusLabel.
- **F3** Clicking an insight card lands on the Pro/data pane — never Help — on
  every surface (firm, vendor-alignment, product-insight), and cards expand the
  Pro readout in place with "Open full view" → the unchanged detail route.
  _Guard:_ `tests/insight-click-ux.contract.test.ts`.
- **F4** V1 Category Position renders F1-style percentile band rows (no bell
  curve); shares PercentileBand's visual language.
- **F5** Product-insight Elite toggle is a non-entitled upsell only (blurred
  preview, zero data); entitled Elite vendors never see a locked pane. A direct
  ?surface=elite hit by an entitled vendor falls back to the data pane.
- **F6** Demo replica names all carry a region tag (no bare-name vs "· Region"
  collision); firm tier-2 elite copy is entitlement-consistent (no "not available
  yet" above "Live with Elite membership" for an entitled firm), while the
  non-entitled locked copy stays governance-compliant ("not a live Elite
  interpretation", no named-feature teasing).

## LANDMINES (session-hardened traps — check before shipping)

- **L1 — LKG promotion after a local build.** A bare `pnpm build` advances
  `expected-live-release` but NOT `last-known-good`, so `com.c2acct.app`
  source-integrity exit-1s on every KeepAlive spawn (stderr's stale "Dirty git
  tree" line is a red herring — the git check returns clean). Fix: `pnpm
  release:promote-known-good` (commit first / keep tree clean), then kickstart.
  If it then reports `buildTimestamp_mismatch`, delete
  `last-known-good-release.json` and re-promote so LKG copies the CURRENT
  fingerprint, validate, then start. Simplest: `pnpm validate:launch` does it
  atomically. See [[feedback_launch_gates_app_service_race]].
- **L2 — demo company id derives from the display NAME.** Renaming a demo
  firm/vendor changes its key-derived id, so a reseed CREATES parallel rows and
  orphans the old ones (N1 spawned 44 duplicate firms). `ensureCompany` now
  resolves by stable id first, but the name→key coupling is still there: after
  any demo rename, verify no orphans (`Company` count by id-prefix, with vs
  without the expected suffix) and clean + recompute benchmarks + re-run
  preview:pat-setup.
- **L3 — preview:pat-setup hangs after DONE** (dangling Prisma handle) — kill
  after the DONE marker, it is not a deadlock.
- **L4 — quiesce app + watchdog before any local build** (watchdog first, so it
  can't resurrect the app) or the launchd service races `.next`.
- **L6 — `prisma migrate diff` picks up pre-existing DB drift.** The local DB
  has a manually-managed `KnowledgeChunk.tsv` tsvector column not in schema.prisma;
  `migrate diff` wants to DROP it. When generating a new migration, HAND-EDIT the
  SQL to keep ONLY your intended DDL — never ship the unrelated DropColumn.
- **L5 — governance copy on LOCKED elite surfaces** must not tease named Elite
  features (peer benchmark / forecast) or claim they are "live" — only the
  ENTITLED path may. A contract test (`firm-unlocks`) enforces this; N2's first
  cut broke it.

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

**Both ports serving the Block 10 build:** :3005 (flagged review standalone) and
:3000 (launchd `com.c2acct.app`) both HTTP 200, asset-integrity PASS on both.
Quiescing app+watchdog before `pnpm build` (per the .next-race rule) advanced
`expected-live-release` but left `last-known-good` at the prior release 6bf25bd,
so the app service's `validate-source-integrity` gate (`last_known_good_release_
not_current`) blocked startup with exit 1 — working as designed, not a Block 10
bug. Resolved with `pnpm release:promote-known-good` (HEAD==fingerprint guard
passed) → LKG 6bf25bd → 0c19939; :3000 came back on the new build. Watchdog
reloaded (300 s interval, last exit 0). **Checkpoint reproduction note:** always
`release:promote-known-good` after a local `pnpm build`, or :3000 will refuse to
restart.

### Block 11 checkpoint — 2026-07-12

- **Build:** BUILD_ID `iJjTwaEH2ZEgRnDl2Pe0U`, HEAD `39481c8` (footer
  "Release 39481c8:iJjTwaEH2ZEgRnDl2Pe0U"). Both ports serving it.
- **Build proof:** asset-integrity PASS on :3005 (served == disk == fingerprint).
- **Validations:** lint clean · tsc clean · test:unit 789/789 · Block-11 contract
  tests green (insight-click-ux, +updated vendor-product-insight & firm-unlocks).
- **Demo data:** clean at 176 firms / 32 vendors, all region-tagged, 0 orphans.

| Item | Result | Evidence (running :3005) |
|---|---|---|
| F1 card law | ✅ | vendor home PortalSurfaceCards match insight cards |
| F2 no face-card band chip | ✅ | alignment cards "54 · Operating discipline…", no chip |
| F3 inline Pro expansion | ✅ | "Open readout" expands Pro pane inline + "Open full view" |
| F4 percentile band rows | ✅ | Category Position: p25–p75 pack + top-quartile zone + you marker |
| F5 non-entitled Elite upsell | ✅ | contract-tested; entitled never sees a locked pane |
| F6 replica naming / elite copy | ✅ | region-tagged names; entitled firm shows live Trajectory |
| N1 / N2 | ✅ | verified earlier this checkpoint chain |

Screenshots: `artifacts/b11-shots/`, `artifacts/b11cp-shots/`. Mythos live sweep next.
