# PATALIGN (PAT) — LAUNCH RELEASE CRITERIA  *(DRAFT — re-dated, not for signature)*
**Launch:** TBD-pending-vendor · patalign.com
**Owner / signatory:** Cameron Garrett, C2Acct Inc.
**Prepared for signature:** TBD-pending-vendor
**Production state at drafting (2026-07-21):** patalign.com serving **Block 15 `6ad96a73`** (cloud-build), 4 prod gates green, no waivers. **Engagement-v1 (Blocks 16–19, HEAD `78247050`) is the pending deploy candidate**; it inherits every criterion in §2, adds §2.7, and follows the migration-first rule in §3.

> **DRAFT NOTICE.** This is a re-date of `~/work/PATALIGN-RELEASE-CRITERIA-2026-07-23.md`
> (prepared 2026-07-16, launch July 23). That launch date and its July 20/21/23
> calendar are **stale** — the engagement-v1 deploy is still pre-go on 2026-07-21 and
> the new date is vendor-driven (TBD). Changes from the source: (a) all date fields →
> TBD-pending-vendor; (b) prod-state header → Block 15 live + engagement-v1 candidate;
> (c) five previously-deferred scope items promoted into **§2.7** per the §6 standing
> rule; (d) §3 calendar marked stale; (e) §5 rollback target → `6ad96a73`. **Do not
> sign** until Cam sets the vendor date and Mythos completes the engagement-v1
> Proof-A/Proof-B render verification (`docs/release/block-20-prod-deploy-readiness-2026-07-21.md`).

---

## 1. Purpose and how to read this document

This document exists so that the signatory can verify the launch state by reading evidence, not by trusting assertions. Every criterion below cites its proof artifact: a commit hash, a printed deploy gate, a test file, a ledger entry with a date, or a browser-verified observation recorded in the deploy ledger (`docs/release/founders-preview-2026-07-14-LEDGER.md`, "the ledger"). The standing regression checklist (`PATALIGN-MEMORY/REGRESSION-CHECKLIST.md`, sections A–F, landmines L1–L7) is the test basis; item numbers below (A1, E5, etc.) refer to it.

Status vocabulary: **MET** — verified with a cited artifact, re-verified or covered by the standing regression run. **MET-WITH-NOTE** — verified, with a documented caveat. **DEFERRED** — deliberately out of scope; listed in §4. **PENDING-PROOF** — a §2.7 engagement-v1 addition whose evidence is the deploy-night Proof-A/Proof-B run, not yet executed.

To audit any line: open the cited ledger section or run the cited test/gate. If a citation cannot be reproduced, the criterion is not met, regardless of what this document says.

---

## 2. Launch criteria

*(§2.1–§2.6 below are carried verbatim from the source doc — the signed evidence basis for the Block 14/15 prod state, unchanged. The engagement-v1 deploy re-verifies the affected rows per the remap in `block-20-prod-deploy-readiness-2026-07-21.md §4.1`; new engagement-v1 scope is §2.7.)*

### 2.1 Security & Access

| # | Criterion | Status | Evidence |
|---|---|---|---|
| S1 | Role walls: consultant/admin/firm/vendor each confined to their portal; company binding wins over ADMIN role; company-less operators only reach `/admin` | MET | Block 13a `92618e95`, deployed `bdd4884` 2026-07-14. `tests/audience-role-wall.contract.test.ts` — 47 passing. Browser-proven on patalign.com (Mythos sweep, ledger 2026-07-16). |
| S2 | No dev/diagnostic leaks on public sign-in | MET | Block 13b: `authRuntime.diagnosticsVisible` gated to non-production; prod `/sign-in/firm` HTML verified zero auth diagnostics (ledger 2026-07-14). `92618e95`. |
| S3 | Auth paths: `/sign-in` canonical; provisioned auth works; already-authenticated accounts redirected home (E6) | MET | `resolveUserAudienceHome` defense-in-depth (13a); 5 review accounts JWT/stateless (ledger Step 7). |
| S4 | Local-review auth cannot function on prod | MET | `PAT_ENABLE_LOCAL_REVIEW_AUTH` absent from Production, double-guarded by loopback-origin in `lib/auth/localReview.ts` (ledger Step 5). |
| S5 | Cross-tenant isolation: wrong-audience routes redirect; cross-tenant access stays 404 (E5) | MET | Cross-tenant 404 proven live (Gate 1, 2026-07-14); unauth walls → 307 verified post-deploy. |
| S6 | Credentials hygiene: review-account passwords terminal-only | MET | `scripts/demo/prod-review-accounts.ts` prints to terminal only; re-provision rotates all 5 (ledger Step 7). |

### 2.2 Data Integrity

| # | Criterion | Status | Evidence |
|---|---|---|---|
| D1 | Number equalities: face==detail (A3); Elite⊇Pro (A1); trajectory "now"==Alignment Index (A4) | MET | A3 reconcile closed 2026-07-16 (13k). Standing checklist re-runs at every checkpoint. |
| D2 | Boundary walls: demo never leaks into customer numbers (A7) | MET | Prod assert green 2026-07-14; idempotency locked via `PAT_EXPECT_FIRMS/VENDORS`. |
| D3 | Suppression floors untouched: n≥5, >25% dominance, divergence ≥3 (A8) | MET | Category 4/5 for Meridian, Payroll suppressed on principle (ledger 13k). |
| D4 | D0-PROD canonical counts recorded and asserted | MET-WITH-NOTE | D0-PROD = 114 DEMO firms / 24 DEMO vendors. NOTE: vendor boosts add firms; keep `PAT_EXPECT_FIRMS` current per boost. |
| D5 | Demo Elite accounts ELITE+ACTIVE after every reseed | MET | 51 ELITE, all ACTIVE, asserted on prod (ledger Step 3b). |
| D6 | Orphan discipline: no purges without L6 per-row assertions | MET-WITH-NOTE | 9 June-era orphans HELD under L6 (detection-only). |

### 2.3 Platform Truth

| # | Criterion | Status | Evidence |
|---|---|---|---|
| P1 | Fingerprint honesty: served releaseId == baked commit+buildId | MET | Gate 2b fix `c6a5b331`; prod gate `releaseId=eb6bfb6:…` (ledger). |
| P2 | Asset integrity: served BUILD_ID == fingerprint; proof-route assets 200 | MET-WITH-NOTE | 10/10 assets 200+typed. NOTE: `asset-integrity-check.mjs` anchors to LOCAL `.next/BUILD_ID` → false FAIL on cloud-build; governing check is served==fingerprint via prod HTML. |
| P3 | Health: `/api/health/db` 200 ok:true | MET-WITH-NOTE | Green every gate since 2026-07-14. NOTE: connectivity probe only, not schema currency (P4). |
| P4 | Migration currency: prod schema == app; migration gate BEFORE all data | MET | 2026-07-14 P2022 incident produced the permanent migrate-first rule; 6 migrations clean, no drift. **Engagement-v1's 2 migrations (`add_cadence_config`, `add_nudge_draft`) MUST follow the same order.** |
| P5 | Deploy discipline: cloud-build → SSO preview → `vercel --prod` same commit → 4 printed gates | MET | Followed for the 6-deploy chain through `eb6bfb6`; "No gate, no deploy." |
| P6 | qa-smoke runs against the TRUE fingerprint (no stale pin) | MET | `PAT_QA_EXPECTED_COMMIT` pin removed 2026-07-14. |

### 2.4 Product Surfaces

| # | Criterion | Status | Evidence |
|---|---|---|---|
| R1 | Every launch surface reviewable via the 5 shared review accounts | MET | Provisioned 2026-07-14; Mythos 5-account sweep 2026-07-14/16. |
| R2 | Three-lane BattleCards on both tour vendors: balanced, no all-red walls | MET | Meridian 4/2/12, Bridgepath 2/5/18, recompute-stable (13k CLOSED 2026-07-16). |
| R3 | Honest empty/locked states: no "Coming soon" for live features | MET | 13c/13d copy (`4747a3ad`); membership reframed Elite LIVE (`6495bb49`). |
| R4 | Ask Pat live: grounded answers with sources, no ungrounded generation | MET | P0a/P0b resolved; browser-verified grounded answer, `insufficientContext=false` (ledger 2026-07-16). |
| R5 | Visual law: one card grammar across portals (C1); inline expand; no dev-speak (B1) | MET | 13h/13i shipped; Block 14 hero chips verified; `validate:launch` VL_EXIT=0, 879 unit (2026-07-17). |

### 2.5 Governance

| # | Criterion | Status | Evidence |
|---|---|---|---|
| G1 | Trust page `/trust/pat`: C. Garrett named, softened data sentence, build-driven "Last updated" (E2, B7) | MET | Standing checklist E2/B7, banked sweep. |
| G2 | AI-disclosure capability for AI-generated notifications | MET-WITH-NOTE → **see §2.7 E-G2** | Migration `20260711210000` applied 2026-07-14. Source NOTE assumed "no generators exist at launch." **Engagement-v1 changes this premise** — generators ship dark; re-ruled in §2.7. |
| G3 | HITL posture: no human-posing, no autonomous outbound at volume | MET → **see §2.7 E-G3** | Governance addendum 2026-07-11. **Engagement-v1 ships the generators (dark)** — HITL re-confirmed in §2.7. |
| G4 | Banned-vocabulary enforcement on customer surfaces | MET | `banned-vocabulary.contract.test.ts` across 7 membership surfaces (`6495bb49`). |
| G5 | Billing honesty: dark until 4 founder signatures | MET | 13d/13e plan-aware CTAs; no-live-charge copy preserved. Stripe flip = deploy-night decision (§3.4). |

### 2.6 Docs & Support

| # | Criterion | Status | Evidence |
|---|---|---|---|
| X1 | Manuals delivered: Founders' Manual (15pp) + Consultant Guide (10pp), v2 PDFs | MET-WITH-NOTE | Guides v2 approved, founders email SENT 2026-07-16. NOTE: describe pre-engagement surfaces; a 16a/17-B addendum may be wanted (Cam call). |
| X2 | Help corpus baseline live and retrievable (36 articles) | MET-WITH-NOTE | Ask Pat retrieval proven (R4). Verify count via `scripts/demo/diagnose-help-retrieval.ts` before signing. |

### 2.7 Engagement-v1 additions (Blocks 16–19) — NEW, promoted from §4 deferrals

*Per the §6 standing rule, every surface engagement-v1 ships gets its own evidence-cited line before it deploys. Evidence for the PENDING-PROOF rows is the deploy-night Proof-A (dark parity) / Proof-B (live-delta render) run defined in `block-20-prod-deploy-readiness-2026-07-21.md §2`. Flag-off values required in §2.2 of that doc.*

| # | Criterion | Status | Evidence / gate |
|---|---|---|---|
| E-16a | Freshness chips (evidence-age) on vendor BattleCard rows + product-insight page render under honest-decay law | PENDING-PROOF (LIVE) | Rides `PAT_ENABLE_BATTLECARD` (on). 16a `37dafcec`/`10e0b7f3`. Proof-B: chips correct, absent when `assessmentCount===0`. Mythos ruled WANTED (2026-07-21). |
| E-17B | BattleCard v2 anatomy (why-it-fits / risk flags / discovery Qs / objection prep), Elite-gated, Pro sees upsell wall | PENDING-PROOF (LIVE) | Rides `PAT_ENABLE_BATTLECARD` (on). 17-B `83946ffb`/`4c8a3c95`. `battlecard-anatomy.contract` + `customer-lexicon.contract` green. Proof-B: Elite shows 4 blocks, Pro sees "Reveal with Elite", zero lexicon leaks. Was §4 F12. Mythos ruled WANTED (improves founders' demo mid-preview). |
| E-16d | Delta re-assessment "what changed?" link + cadence-config foundation; clock-reset behavior intended | PENDING-PROOF (LIVE) | No flag; renders for completed modules. 16d `f5341755`/`197dce5e`. Migration `add_cadence_config` (additive). Proof-B: link present + flow correct. Mythos ruled WANTED. |
| E-17A | Provisioned-pilot sign-in same-origin redirect fix (no silent bounce) | PENDING-PROOF (LIVE) | No flag; unconditional auth fix. 17-A `181f2002`. Proof-B: pilot sign-in lands on workspace. Re-verifies S3. Mythos ruled WANTED (bug founders hit). |
| E-16bc | Staleness-alert + nudge-draft generators ship DARK; zero outbound with flags off | PENDING-PROOF (DARK) | Gated `PAT_ENABLE_PINGS` + `PAT_ENABLE_STALENESS_ALERTS` (both OFF). 16b/16c/17-C. Migration `add_nudge_draft` (additive). Proof-A: sweep = NOOP, zero rows written; NudgeDraft POST stays PENDING, no Notification. Was §4 "Block 16". |
| E-16efg | Consultant freshness board + vendor review-refresh + firm benchmark artifact ship DARK | PENDING-PROOF (DARK) | Gated `PAT_ENABLE_PINGS` (OFF) → `notFound`/no-panel. 16e/16f/16g. Proof-A: routes byte-equivalent to today. |
| E-18F14 | Consultant scoped read-only Alignment Board ships DARK under scoped authorization (not a route exemption) | PENDING-PROOF (DARK) | Gated `PAT_ENABLE_ALIGNMENT_BOARD` (OFF) → honest-empty hero. 18-F14 `cb6f47d6`. Proof-A: honest-empty; 13a wall intact. Was §4 F14 (Cam's "scoped auth, never a bypass" ruling satisfied). |
| E-19FD | V7 product-native front door ships DARK behind `PAT_ENABLE_NEW_FRONT_DOOR`; current front page byte-unchanged when off | PENDING-PROOF (DARK) | `app/page.tsx` early-returns only when on. 19 `d3f9878c`+fixes. Proof-A: `/` byte-equivalent (signed-out). Not in the source doc at all. |
| E-G2 | AI-disclosure wiring present for the (dark) generators; flag-flip would disclose | PENDING-PROOF | `aiGenerated` column + `PAT_AI_GENERATED_HEADER_*` present. With PINGS off: zero outbound ⇒ no undisclosed AI by construction. **Mythos re-ruling requested.** |
| E-G3 | HITL guarantee holds with generators present-but-dark: no autonomous outbound path | PENDING-PROOF | NudgeDraft = consultant-approve only, no auto-send seam. Proof-A confirms no dispatch with flags off. **Mythos re-ruling requested.** |

---

## 3. Deploy-night checklist — **DATE TBD-pending-vendor** *(source dated July 21; superseded)*

> **Stale-calendar flag.** The source doc's July 20 dry-run / July 21 deploy-night /
> July 23 launch-morning dates are moot. The **operative** deploy-night procedure for
> the engagement-v1 deploy is `docs/release/block-20-prod-deploy-readiness-2026-07-21.md §3`
> (quiesce-first ordering, E8 Neon check, migration-gate-before-data, L1/L2 promote
> rules, un-quiesce last — approved by Mythos 2026-07-21). The rotations + Stripe
> decision points below still apply and fold into that checklist's phases.

**3.0 Backups first.** DB snapshot; `.env.prod` timestamped backup; ops bundle current.

**3.1 Rotations (runbook order, one at a time — verify, then next; never batch):** Neon (REDO — reset app-role password, update pooled + DIRECT_URL in `.env.prod` + Vercel, re-render launchd plists, bootout/bootstrap supervisor; artifact `artifacts/rotations/<date>-neon.md`) → AUTH_SECRET (32+ bytes; all sessions invalidate = proof) → Cam's admin password + demo/review-account passwords (`prod-review-accounts.ts --provision`).

**3.2 qa-smoke pin status.** CHECK only — confirm `.env.local` carries no `PAT_QA_EXPECTED_COMMIT`; qa-smoke green against the true post-rotation fingerprint.

**3.3 Deploy (engagement-v1).** Cloud-build → SSO preview gate → `vercel --prod` same commit → 4 printed gates. **Migration-first:** `add_cadence_config` + `add_nudge_draft` via DIRECT_URL, re-verified with a data-bearing read on a migrated table BEFORE any seed (P4 rule; commands in the block-20 doc §1.3).

**3.4 Stripe decision point.** IF all 4 founder signatures exist: Cam enters bank details, live prices, test-mode smoke, then flag. OTHERWISE billing stays dark (approved config, not a failure). No partial flip.

**3.5 Final full regression.** Standing checklist A–F; `validate:launch` exit 0; Mythos browser sweep on patalign.com incl. authed render of BOTH boosted vendors + **Proof-A/Proof-B for the §2.7 additions**.

**3.6 Launch-morning smoke (date TBD, before demo).** Fingerprint == expected commit; health/db 200; sign-in on one firm + one vendor account; Ask Pat one grounded question; BattleCard three lanes; trust page. Printed proof, then hands off.

---

## 4. Known-open register (deliberate deferrals)

*(F12, F14, and "Block 16" removed — promoted to §2.7 above. Remaining deferrals unchanged.)*

| Item | What | Why deferred |
|---|---|---|
| F8 | Help corpus ×5 role/tier sets | Content work; baseline corpus live and grounding Ask Pat. |
| F11 | review.vendor BattleCard fit-mix rebalance | Structural (curate reviewing-firm set) = Cam decision, safe pre/post-launch. |
| F15 | C2Acct data integration (metadata + C2X routing) | Ruled post-launch. (F15-0b blocked on Cam's creds.) |
| F13 | product tier-2 Elite routes | Honest-pending panes today; held. |

Also tracked (smaller): F6 upsell toggles, F7 Module 6+ adaptive serving, F10 AgentOutcome→revenue join.

---

## 5. Rollback posture

- **App rollback (minutes):** re-alias patalign.com to the last known-good deployment (`vercel rollback`/promote prior). LKG target is the last ledger entry with 4 green gates — **currently `6ad96a73` (Block 15)**; before it, `eb6bfb6`.
- **Local serving discipline:** always `release:promote-known-good` after local builds services will serve (L2).
- **DB migrations:** additive (new tables); app-behind-schema is safe, so app rollback does NOT require schema rollback. The P4 migrate-first gate prevents the dangerous app-ahead-of-schema direction. Engagement-v1's two tables are empty + dark — they can stay on an app rollback. Deploy-night DB snapshot + Neon PITR is the hard fallback. Never reseed under running servers (L3).
- **Rehearsal:** the pre-launch dry run (date TBD) includes one deliberate rollback exercise.

---

## 6. Sign-off

Signing certifies the signatory has reviewed each criterion in §2 (incl. §2.7) against its cited evidence and accepts the §4 deferrals as launch decisions. **Signature certifies criteria review — not the absence of all defects.**

**Standing rule:** any scope change after signing — feature, flag, data change, or customer-surface copy — requires a new line item with its own evidence citation before it ships. No silent additions.

| | |
|---|---|
| Name | Cameron Garrett, C2Acct Inc. |
| Signature | ______________________________ |
| Date | **TBD-pending-vendor** |
| Witness (optional) | ______________________________ |

*Re-dated 2026-07-21 from `~/work/PATALIGN-RELEASE-CRITERIA-2026-07-23.md`. Not for signature until the vendor-driven launch date is set and Mythos completes the engagement-v1 Proof-A/Proof-B run.*
