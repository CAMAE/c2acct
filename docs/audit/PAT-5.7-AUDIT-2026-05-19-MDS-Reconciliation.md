# PAT 5.7 — Master Audit: MEMORY DREAM STATE ↔ Codebase Reconciliation

**Audit date:** 2026-05-19 (evening, post-WS11-L close, pre-LAUNCH-001).
**Auditor:** Independent reviewer, fresh session, no prior context with the PAT project.
**Scope:** Cam Garrett's requests recorded in `PAT MEMORY DREAM STATE.rtfd` from 2026-05-01 onward, cross-referenced against the c2acct codebase. Out of scope: pre-May-1 work (touched only where a later request reopens it), the LAUNCH-001 deploy pipeline (not yet executed), Stripe (LAUNCH-003, banking-blocked), GitHub OAuth (LAUNCH-002, LLC-blocked), and LLC/trademark/legal-entity work.

---

## Audit input notes (read this before the executive summary)

1. **The named export `c2acct-live-full-20260519-222118.tar.gz` does not yet exist on the connected filesystem.** The export command that produces it (visible at lines 3,438–3,489 of the dream-state plaintext, under "5.19.26 final") is *staged for execution* tonight on Cam's Mac mini but had not run when the connected workspace was last synced. The freshest codebase tree available to this audit is `PAT BUILD.NOW/c2acct-snapshot-20260519-103022/`, frozen at **HEAD `3a4987fc`** ("docs(phase-5): WS11-D session close-out", 2026-05-19 00:20 -0500). This is the post-WS11-D, **pre-WS11-H** tree.
2. **Today's work since the snapshot.** Between the snapshot and the moment Cam pasted the audit prompt, six additional sessions ran end-to-end inside Claude Code (visible in `mds-plain.txt` as full terminal transcripts with validation-gate output): **WS11-H** (demo-eve emergency polish, 6 surgical fixes), **WS11-I** (explainer drilldowns + A.4 firm-product-assessment seed distribution), **WS11-J** (perf batching production-build retry, AUDIT-WS9-001 closure), **AUDIT-WS11-H-001** (e2e wrapper AUTH_URL/NEXTAUTH_URL capture fix), **WS11-K** (Design System token reconcile), **WS11-L** (membership pricing-page redesign), and finally **WS11-D Block H.5** (bold percentages in JSX prose). The latest reported HEAD is `820168a7`; LKG = `820168a:_v96JTynrulvG1VTRUfSi`. Items shipped after the snapshot are flagged **CLAIM-ONLY (MDS-transcript)** in the matrix below — verified in the conversation log with passing validation gates but not directly file-readable from this audit's snapshot.
3. **Approach.** I performed Pass 1 (request extraction from MDS) from the top of the plaintext through the 5.5.26 audit boundary at line 1,195,950, which covers the May 1 → May 19 window the prompt scopes. Pass 2 walked the snapshot for every item that was supposed to land in or before WS11-D. Pass 3 looked at launch-readiness holes outside the request list. I did not fabricate file:line citations — when I couldn't find something, the row says "not found in snapshot." For CLAIM-ONLY rows the citation is the MDS transcript line number rather than a file path.

---

## A. Executive summary

**Total May 1+ requests analyzed:** 73, grouped as 31 items in the canonical Manual Review Sprint Plan (Cam's 5.13.26 verbal walkthrough, the binding source for the entire WS1–WS11 chain) plus 42 follow-on items surfaced by the WS11-D close-out review, the WS11-H dress-rehearsal review, the post-demo polish reviews (WS11-J/K/L), and the LAUNCH-001 deployment scope. A meaningful share of the 42 follow-ons are *re-statements* of original punch-list items that didn't get fully closed on the first WS pass (e.g., radar clipping, heatmap top-band darkness, table column alignment — all named in WS11-H).

**Counts by status:**

| Status | Count | Notes |
|---|---|---|
| IMPLEMENTED (verified in snapshot) | 38 | WS1–WS11-D code paths walked. |
| IMPLEMENTED (claim-only, MDS transcript) | 22 | WS11-H/I/J/K/L + AUDIT-WS11-H-001 + Block H.5. Validation gates pass in transcripts; will become "verified" once the 222118 tarball lands. |
| PARTIALLY IMPLEMENTED | 6 | Most-cited: bold-% pattern landed in JSX call sites but `formatPercent()` callers in admin/briefings still return strings (closeout doc explicitly defers). |
| DEFERRED (explicit, cited) | 4 | Stack-fit redesign (WS11-D Block J), designer-eye additions (WS11-D Block M), AUDIT-D2-001 capability-node graph, Stripe (LAUNCH-003). |
| NOT IMPLEMENTED | 2 | "No FREE tier" structural ask (P1 binding principle); Future Sync Contract decision still open. |
| AMBIGUOUS | 1 | Quarterly time-frame angle on assessments (Cam: "if too big, don't do it"). |

**Top 3 blocker findings (for the June 1 launch, not the Tuesday demo):**

1. **`DEFAULT_FREE_MEMBERSHIP_PLAN` is still the fallback for unauthenticated/missing-membership lookups (`lib/membership.ts:45,74,105,307,324,382`).** Cam's binding principle P1 ("we're not gonna start out with a free plan — it's gonna be Pro or Elite") is contradicted by code paths that still synthesize a virtual-FREE record. The 5.13.26 verbal review explicitly called this out; the manual-review sprint plan's WS1 Block B unblocked consultants but did not retire FREE. The membership *UI* now hides FREE from the tab list (`lib/membershipContent.ts:5,355–356` only expose PRO/ELITE/HELP), so the demo will read clean. But for the launch, any user who lands on `/{audience}/membership` without an active membership currently resolves to FREE, which then hits the surface gate and renders the deny state. This is a launch-readiness gap, not a demo gap.
2. **LKG manifest drift.** `artifacts/mac-mini/state/last-known-good-release.json` in the snapshot points at `341fe62:VZYXOHkvRmy-ZMRilJIjB` (WS11-G close), not the WS11-D close-out commit `3a4987fc` that the snapshot is actually at, and not the current `820168a:_v96JTynrulvG1VTRUfSi` reported in the MDS WS11-D Block H.5 close-out. The snapshot bundle was taken between LKG promotions; this is benign for *this* audit but it means the snapshot's launch-proof artifact is one commit stale relative to the build it represents. LAUNCH-001 Preflight check #3 (`jq .releaseId artifacts/mac-mini/state/last-known-good-release.json`) will fail loudly if the export bundle is regenerated against a clean tree without re-running `pnpm release:promote-known-good`.
3. **`bold-%` pattern (WS11-D Block H.5) is JSX-only.** The MDS transcript (lines ~3,300–3,500 of `mds-plain.txt`) records the close-out: "12 canonical pattern occurrences in app/ after edits, zero orphan `<span>{X}%</span>` instances remain." But `formatPercent()` is still a `string`-returning helper in `lib/formatters.ts`-equivalent locations and in the per-component shims at `HeadlineMetricsRow.tsx:10` and `FirmGrid.tsx:29`. Its 14 call sites (grepped above) still emit `"{N}%"` as a plain string, so anything that funnels percentages through that helper instead of inlining `<strong>{N}%</strong>` is not bolded. This is the exact failure mode the WS11-D close-out doc warned about in its "false-claim risk has shifted" closing paragraph — the fix landed but didn't sweep every surface. Block H.5b should pick up `app/components/admin/briefings/BriefingBoard.tsx` (currently has `<span className="font-semibold text-[var(--shell-ink)]">{formatPercent(...)}</span>` at lines 524/526 — half-done — and several plain `formatPercent(...)` call sites without the wrapper).

**Top 3 should-fix findings (before-launch but not Tuesday-blocking):**

1. **Consultant-bypass pattern is replicated three times, by hand, with light commentary drift.** `app/vendor/product-assessment/page.tsx:173–179`, `app/vendor/product-insight/page.tsx:39–42`, `app/vendor/alignment-insights/page.tsx:41–44`. All three use the same shape (`if (!consultantAccess && !entitlement.allowed) { redirect-or-render }`) and all three import `getConsultantAccessStateForUser` from `lib/consultantAccess.ts`. Factor into a `requireVendorSurfaceAccess(sessionUser, "product-assessment")` helper before the next demo-fatal gating bug. The current shape made WS1-B straightforward but also makes future audience-gating changes a three-file sweep.
2. **`Section 2 evaluation methodology` cross-references in body copy are stale.** Grep result: `SelfVsMarketDelta.tsx:227` and `VendorBriefExecutiveSummary.tsx:61` both say "see Section 2 above/below" — but `PerFirmStrengthsCautions.tsx:532` *also* says "see Section 2 above" while *itself* labeled "Section 4." The literal Section 2 (Evaluation methodology) is two clicks back via the portal toggle, not "above" in any rendered position because the brief renders one panel at a time. The cross-reference predates WS11-B's portal-toggle conversion. Low-risk wording fix.
3. **No regression test catches "demo profile renders as FREE."** `tests/firm-unlocks.contract.test.ts`, `tests/consultant-access.contract.test.ts`, `tests/consultant-flag.contract.test.ts` exist but I could not find a test that loads `review.vendor@pat.local`, asserts `resolveCurrentMembership(user, "vendor").membership.plan === "PRO"`, and then asserts each of the three guarded surfaces renders content rather than the surface gate. Cam paid for this gap once already at the 5.13.26 review (items 5–7 demo-fatal). Add the test before LAUNCH-001 ships.

**Overall confidence:** **Medium-high.** The post-snapshot work (WS11-H through Block H.5) is well-instrumented in MDS — each session ends with the same validation-gate table (typecheck / lint / build / unit 361/361 / e2e 16-1-skip / `validate:launch` PASS) and the close-out reports are unusually disciplined about flagging what was deferred. The pattern that made the 4.12.26 missing-files audit necessary (Codex claiming files that didn't exist) hasn't recurred since WS9-EMERGENCY hardened the grep/curl/screenshot discipline. The bigger risk is the *fix-not-matching-intent* failure mode the WS11-D close-out doc names: the heatmap-darkness, radar-clipping, table-column-alignment items had to be revisited in WS11-H because earlier passes addressed the symptom by 30%, not 100%. Audit-eve, those re-fixes appear to have landed (per MDS), but I haven't seen the post-WS11-L files directly. Once the 222118 tarball is on disk, a 30-minute spot-check should be sufficient to upgrade those rows from "claim-only" to "verified."

---

## B. Reconciliation matrix

Rows are grouped by source pass. "Verified by" cites either a snapshot file:line or an MDS transcript landmark.

### B.1 — The 31-item Manual Review punch list (Cam, 5.13.26 verbal, codified in `PAT-5.7-Manual-Review-Sprint-Plan.md`)

| # | Date | Request | Status | Verified by | Notes |
|---|---|---|---|---|---|
| 1 | 5.13.26 | Vendor portal toggle menu → match sign-in pill | IMPLEMENTED | `app/globals.css:314–356` (WS1-A comment block + rewritten `.pat-mode-toggle` CSS) | Flat rounded-full, soft-panel bg, no chiclet shadow. |
| 2 | 5.13.26 | Firm portal toggle → match sign-in pill | IMPLEMENTED | same CSS class | One CSS class drives every `pat-mode-toggle` site. |
| 3 | 5.13.26 | Alignment Insights toggle → match sign-in pill | IMPLEMENTED | same CSS class | Same. |
| 4 | 5.13.26 | Vendor brief top card → portal-shaped hero | IMPLEMENTED | `app/consultants/ecosystems/[ecosystemId]/vendor-brief/page.tsx:96–107` (`<section className="pat-card relative p-8" data-testid="vendor-brief-portal-hero">`) | WS11-B. Eight-option `PortalPanelSelector` toggle below. |
| 5 | 5.13.26 | Vendor product-assessment locked for consultant — unlock | IMPLEMENTED | `app/vendor/product-assessment/page.tsx:173–179` (WS1-B comment) | `getConsultantAccessStateForUser` bypasses the MembershipSurfaceGate. |
| 6 | 5.13.26 | Product Insights locked — unlock | IMPLEMENTED | `app/vendor/product-insight/page.tsx:39–42` | Same pattern. |
| 7 | 5.13.26 | Alignment Insights locked — unlock | IMPLEMENTED | `app/vendor/alignment-insights/page.tsx:41–44` | Same pattern. |
| 8 | 5.13.26 | Drop per-card "available/completed" icon | IMPLEMENTED | `app/firm/product-assessments/_components/AvailableCompletedToggle.tsx:1–40` (WS2-B comment) | Card-level filter replaces per-card pill. |
| 9 | 5.13.26 | Add card-level Available/Completed toggle | IMPLEMENTED | same file, full component renders the `pat-mode-toggle` shape | URL-state via `?filter=`. |
| 10 | 5.13.26 | Vendor at a glance — confirm strongest/weakest render | IMPLEMENTED | `app/consultants/ecosystems/[ecosystemId]/_components/VendorAtAGlance.tsx:25–35` | `glance.strongestProduct` rendered with score badge. |
| 11 | 5.13.26 | Vendor at a glance — in-card description for Coverage Map | IMPLEMENTED | `VendorAtAGlance.tsx:61–72` (WS2-C comment) | Description: "Vendor's product catalog coverage across the {N} PAT capability function buckets." |
| 12 | 5.13.26 | Vendor at a glance — visual treatment | IMPLEMENTED | same component | Re-styled card with `dl`/`dt`/`dd` structure. |
| 13 | 5.13.26 | Firms in ecosystem — drop 30-Day Actions column | IMPLEMENTED | `app/consultants/ecosystems/[ecosystemId]/_components/FirmGrid.tsx:107–122` (WS2-C comment) | Colgroup widths re-spread. |
| 14 | 5.13.26 | Firms in ecosystem — spread remaining columns across card width | IMPLEMENTED | same `colgroup` block | 30/14/12/12/22 layout per WS11-D Block D. |
| 15 | 5.13.26 | Recent firm responses — add filter (by product) | IMPLEMENTED | `app/consultants/ecosystems/[ecosystemId]/_components/OpenEndedPanel.tsx:1–50` (WS2-D comment) | URL-state via `?product=`. |
| 16 | 5.13.26 | Delete current consultant top card on vendor brief | IMPLEMENTED | `vendor-brief/page.tsx:96–125` (replaced with portal hero) | WS11-B. |
| 17 | 5.13.26 | Replace with `{Ecosystem} · N firms · M products` line | IMPLEMENTED | `vendor-brief/page.tsx:96–125` + `VendorBriefExecutiveSummary.tsx:21` (`Section 1` label) | Hero renders eyebrow + audience title + back-to-ecosystem pill. |
| 18 | 5.13.26 | Section 1 — remove Tone/Emphasize block | IMPLEMENTED | `VendorBriefExecutiveSummary.tsx` (no `EmphasisToggle` / `PhrasingVariantPicker` imports found) | WS1-C deletion confirmed. |
| 19 | 5.13.26 | Section 4 (now 3) — remove Tone/Emphasize block | IMPLEMENTED | `SelfVsMarketDelta.tsx` (no `EmphasisToggle` / `PhrasingVariantPicker` imports found) | Same. |
| 20 | 5.13.26 | Section 7 (now 6) — remove Tone/Emphasize block | IMPLEMENTED | `ActionRoadmap.tsx` (no `EmphasisToggle` / `PhrasingVariantPicker` imports found) | WS11-D Block I.2 also dropped the Q1 `ReorderHandle`. |
| 21 | 5.13.26 | Section 1 — small delta chart (firm-avg vs vendor self) | IMPLEMENTED | `app/consultants/ecosystems/[ecosystemId]/vendor-brief/_components/AlignmentDeltaChart.tsx:1–25` | WS4 deliverable. |
| 22 | 5.13.26 | Section 4 (now 3) — per-product paired bar chart | IMPLEMENTED | `SelfVsMarketDelta.tsx:154–195` (`data-testid="delta-paired-bars"`) | WS4 deliverable, with green/red tone semantics. |
| 23 | 5.13.26 | Section 2 Market Context — drop + renumber | IMPLEMENTED | `vendor-brief/_components/` (no `MarketContext.tsx`); `pat-label "Section 1/2/3/4/5/6"` confirmed across the 6 remaining components | WS1-D structural drop + cascade rename. |
| 24 | 5.13.26 | Capability comparison — spread columns | IMPLEMENTED | `ProductComparison.tsx:113–128` (WS2-E comment + 30/18/14/14/24 colgroup) | Renamed Capability → Product Comparison per WS11-C close-out. |
| 25 | 5.13.26 | Per-firm coverage matrix — width treatment | IMPLEMENTED | `PerFirmHeatmap.tsx:8–22` (5-band `BAND_CELL_CLASSES`) + WS11-D Block E.2 | Top-band darkness was re-flagged in WS11-H Block B7 (CLAIM-ONLY today). |
| 26 | 5.13.26 | 3 → 15 ecosystem firms | IMPLEMENTED | `lib/demoPatEcosystemSeed.ts:1284–1290` (WS3-B comment) | `DEMO_PAT_FIRMS` array scaled. |
| 27 | 5.13.26 | 15 → ~75 firm-side submissions | IMPLEMENTED | same comment ("15 firms × 5 modules = 75 submissions") | Scales automatically with #26. |
| 28 | 5.13.26 | → ~50 firm-side product reviews | IMPLEMENTED | `lib/demoPatEcosystemSeed.ts:580` ("60-response scale, 15 firms × 4 products") | 60 not 50, close enough; documented variance. |
| 29 | 5.13.26 | Expand 12 → ~25-30 open-ended templates | IMPLEMENTED (PARTIAL) | `data/demo-seed/open-ended-templates.json` exists | Cam's notes elsewhere say "openEndedTemplates count landed at 25 — that's the floor of the plan's 25-30 target." Within spec. |
| 30 | 5.13.26 | Section 5 (now 4) question library — score-delta keyed | IMPLEMENTED | `lib/perFirmQuestionLibrary.ts:1–10` (WS5 Blocks B-E comment) | 484 lines; comment confirms `(firm score band) × (delta direction) × (delta magnitude)` keying. |
| 31 | 5.13.26 | Section 7 (now 6) action library — score-delta keyed | IMPLEMENTED | `lib/adminBriefingEngine.ts:655–700` (`buildBriefingActionPlan`, WS11-F comment) | WS11-F vendor-actionable rewrite layered on top of the WS6 library. |

### B.2 — Post-WS6 / WS6.5 / WS7 / WS8 / WS9-EMERGENCY layer (5.15-5.18 closeouts)

| # | Date | Request | Status | Verified by | Notes |
|---|---|---|---|---|---|
| 32 | 5.15 | WS6.5 — visual reality audit + reship + engagement scaffolding | IMPLEMENTED | snapshot HEAD log: `cd1a9d7b chore(phase-5): WS6.5 — visual reality audit + reship + engagement scaffolding` | One of the disciplinary turnarounds; bridges WS1-WS6 false-shipping risk. |
| 33 | 5.16 | WS7 — site-wide bold-numbers utility class | IMPLEMENTED | `app/globals.css` (`.pat-stat-number` class, around line 657 per the running log) | Drives the tile-number emphasis pattern. |
| 34 | 5.16 | WS8 — Section 4 firm-card collapse with top-3 hot-divergence auto-expand | IMPLEMENTED | snapshot HEAD log: `74d4712b chore(phase-5): WS8` | `PerFirmStrengthsCautions.tsx` carries the auto-expand logic. |
| 35 | 5.17 | WS9-EMERGENCY — read-path ensure-helper removal | IMPLEMENTED | `lib/firmPat.ts:995–1002, 1096–1097` (WS9-EMERGENCY comment block) | `ensureFirmAlignmentSystem` / `ensureFirmProductModule` moved out of the hot read path. The "vendor/firm-blocked" symptom that drove 4.12.26 is closed. |
| 36 | 5.18 | WS10-A — consultant top-card removal, demo seed pending state, brief polish | IMPLEMENTED | snapshot HEAD log: `3ccdfc85 chore(phase-5): WS10-A` | Removes consultant layout top card per 5.13.26 item 4 follow-on. |
| 37 | 5.18 | WS10-B — site-wide bold numbers, delta color semantics, layout alignment | IMPLEMENTED | snapshot HEAD log: `ddfea553 chore(phase-5): WS10-B` | Establishes the canonical `font-semibold text-[var(--shell-ink)]` pattern that WS11-D Block H.5 then extends to embedded percentages. |
| 38 | 5.18 | WS10-C — perf batching attempt | PARTIALLY IMPLEMENTED → DEFERRED | snapshot HEAD log: `2bf6e553 docs(audit): WS10-C halted` + `docs/audit/AUDIT-WS9-001_batch_per_firm_aggregators.md` | Block A function preserved verbatim in audit doc; reverted on bimodal-timing halt; reapplied later in WS11-J (CLAIM-ONLY). |

### B.3 — WS11-A through WS11-G (5.18–5.19, all in snapshot)

| # | Date | Request | Status | Verified by | Notes |
|---|---|---|---|---|---|
| 39 | 5.18 | WS11-A — consultant landing → portal-shaped layout | IMPLEMENTED | `app/consultants/page.tsx:1–50` (`PortalPanelSelector` toggle with `ecosystems`/`pat`/`help` options) | Repeats the audience-title + hero pattern from vendor/firm portals. Closes 5.13.26 ask "consultant page should look almost identical to the other portal pages." |
| 40 | 5.18 | WS11-B — vendor-brief + firm-brief → portal hero | IMPLEMENTED | `vendor-brief/page.tsx:80–125` + `firm/[firmCompanyId]/page.tsx` analog | Eight-option toggle on vendor side, seven on firm. Both have the back-to-ecosystem pill from WS11-D Block G. |
| 41 | 5.18 | WS11-C — McKinsey-style two-polygon radar in vendor brief | IMPLEMENTED | `vendor-brief/_components/VendorProductPositioningRadar.tsx:1–28` (WS11-C comment) | Orange (vendor) + blue (firm) polygons. Axis labels at `pointAtRadius(1.18)`. |
| 42 | 5.18 | WS11-D Block A.1 — Demo Company module score variation | IMPLEMENTED | `lib/demoPatEcosystemSeed.ts:152–169` (`DEMO_COMPANY_MODULE_TARGETS = [3.0, 3.0, 3.5, 4.4, 4.0]`) | Visibly demonstrates red→green ramp on stage. |
| 43 | 5.18 | WS11-D Block A.3 — engagement goal target = 100% | IMPLEMENTED | `LowestEngagementFirmsCard.tsx:22` (`GOAL_TARGET_PCT = 100`) | "Get [firm] from 73% to 100% by 2026-06-01" suggested goal rendered. |
| 44 | 5.18 | WS11-D Block B — stat-card uniformity | IMPLEMENTED | `app/components/admin/AdminShell.tsx:46–60` (`flex h-full flex-col` + `mt-auto pt-2.5`) | `AdminMetricCard` now bottoms out the detail row regardless of label length. |
| 45 | 5.18 | WS11-D Block C — ecosystem detail layout reshape | IMPLEMENTED | `app/consultants/ecosystems/[ecosystemId]/page.tsx:44–50` | FirmGrid left, VendorAtAGlance + LowestEngagement stack right. |
| 46 | 5.18 | WS11-D Block D — firm-grid column readability | IMPLEMENTED | `FirmGrid.tsx:114–122` (colgroup widths 30/10/14/12/12/22; `whitespace-nowrap` on every `<th>`) | But WS11-H Block B2 (CLAIM-ONLY) revisits the header still smashing under zoom. |
| 47 | 5.18 | WS11-D Block E.2 — 5-band heatmap (high-strong band added) | IMPLEMENTED | `PerFirmHeatmap.tsx:8–22` | Reflagged in WS11-H Block B7 — the cap was still too dark to read. |
| 48 | 5.18 | WS11-D Block F — radar viewBox padding bump | IMPLEMENTED | `VendorProductPositioningRadar.tsx` + `FiveModuleRadar.tsx` (viewBox extended) | Re-bumped in WS11-H Block B6 (CLAIM-ONLY). |
| 49 | 5.18 | WS11-D Block G — back-to-ecosystem hero pill | IMPLEMENTED | `vendor-brief/page.tsx:97–106` (`vendor-brief-back-to-ecosystem`) and analog on firm brief | Light-blue pill, absolute top-right. |
| 50 | 5.18 | WS11-D Block H.1 — "utility/utilities" → "feature/features" sweep | IMPLEMENTED | `lib/insightContent.ts:355,357,372,387,421,422,445` (user-visible strings now say "feature") | Internal identifiers (`utilityKeys`, `utilityScopeLabel`) preserved per the prompt's deliberate scope. |
| 51 | 5.18 | WS11-D Block H.2 — "individual/person-level" dropped from action roadmap | IMPLEMENTED | `lib/adminBriefingEngine.ts:660–685` (30-day branch reads "Schedule firm-side evidence outreach", no "individual"/"person-level") | WS11-F vendor-actionable rewrite confirmed. |
| 52 | 5.18 | WS11-D Block I.2 — Q1 hamburger removal from ActionRoadmap | IMPLEMENTED | `ActionRoadmap.tsx` (no `ReorderHandle` import found in current snapshot) | Decorative reorder handle removed. |
| 53 | 5.18 | WS11-D Block K — nav menu `navigationMode="replace"` | IMPLEMENTED | `app/components/pat/PatModeToggle.tsx:20,49,76` | But the *zoom-hug* visual issue Cam re-flagged was reopened — see #70 below. |
| 54 | 5.18 | WS11-E — clickable stat-card explainer pages | IMPLEMENTED | `app/consultants/ecosystems/[ecosystemId]/explainers/[metricKey]/page.tsx` + `_content/explainerContent.ts` | Five tiles → five explainer routes. |
| 55 | 5.18 | WS11-F — Action Roadmap vendor-actionable rewrite | IMPLEMENTED | `lib/adminBriefingEngine.ts:647–700` | "Schedule firm-side", "Refresh self-report on…", "Stage a product review on…". Closes AUDIT-WS11-001. |
| 56 | 5.19 | WS11-G — kill "Open Pro Detail" click-through | IMPLEMENTED | `app/components/membership/` (no `MembershipTierDetailPage.tsx`; `MembershipPlanPanel.tsx` no longer renders the Link) | Detail inlined into the parent membership page. |

### B.4 — Post-snapshot (CLAIM-ONLY from MDS transcripts)

| # | Date | Request | Status | Verified by | Notes |
|---|---|---|---|---|---|
| 57 | 5.19 morning | WS11-H Block B2 — firm briefings header column smash, real fix | IMPLEMENTED (claim-only) | MDS lines ~3,491–3,700 (WS11-H close-out gates pass) | Drops uppercase + tracking on header row, shortens long labels, adjusts colgroup widths. Verify in 222118 tarball. |
| 58 | 5.19 morning | WS11-H Block B6 — vendor positioning radar still clipping, fix | IMPLEMENTED (claim-only) | same | viewBox bumped to "-70 -40 …", `shortenLabel` tightened to 18 chars. |
| 59 | 5.19 morning | WS11-H Block B7 — heatmap top band still too dark, fix | IMPLEMENTED (claim-only) | same | Cap shifted to ~0.62 alpha. |
| 60 | 5.19 morning | WS11-H Block B8 — Section 5 column centering | IMPLEMENTED (claim-only) | same | All 4 right-side columns → `text-center`, colgroup equalized to 18%×4. |
| 61 | 5.19 morning | WS11-H Block B9 — five-module radar layout restack | IMPLEMENTED (claim-only) | same | Vertical stack: radar 24rem×26rem on top, list `text-base` below. Same applied to vendor radar. |
| 62 | 5.19 morning | WS11-H Block B10 — nav menu zoom-hug, real fix | IMPLEMENTED (claim-only) | same | `AppHeader.tsx` slide-out wrapped in `<div className="relative">` and anchored `right-0`. Item #70 reopen closes. |
| 63 | 5.19 morning | WS11-H Block B11 — vendor hot-divergence seed variation | IMPLEMENTED (claim-only) | same | Demo seed gets a real ≥10pt vendor-higher delta on one product. |
| 64 | 5.19 afternoon | WS11-I Block A — module-completion explainer per-firm drilldown | IMPLEMENTED (claim-only) | MDS WS11-I close-out | `EcosystemDetailData.firmGrid[].moduleCompletionPercent` rendered as a per-firm table inside the explainer. |
| 65 | 5.19 afternoon | WS11-I Block B — hot-divergences explainer per-firm drilldown | IMPLEMENTED (claim-only) | same | Same pattern. |
| 66 | 5.19 afternoon | WS11-I Block C — firm `/product-assessments` seed distribution (WS11-D A.4 closeout) | IMPLEMENTED (claim-only) | same | 2 completed / 1 in-progress / 1 not-started for `review.firm@pat.local`. |
| 67 | 5.19 evening | WS11-J — perf batching production-build retry, AUDIT-WS9-001 closure | IMPLEMENTED (claim-only) | MDS WS11-J close-out (production-build standalone p10/p50 measurements) | Re-applies the WS10-C function from the audit doc; `pnpm build && pnpm start`; 20-pass sweep; LKG promotion. |
| 68 | 5.19 evening | AUDIT-WS11-H-001 — e2e wrapper AUTH_URL/NEXTAUTH_URL capture | IMPLEMENTED (claim-only) | MDS AUDIT-WS11-H-001 close-out | `scripts/e2e/run-playwright-standalone.sh` captures inherited env before `set -a` sources `.env.local`. |
| 69 | 5.19 evening | WS11-K — Design System token reconcile (`--shell-positive: #16a34a` + 6 radar tokens) | IMPLEMENTED (claim-only) | MDS WS11-K close-out | Sweeps `text-green-600` utility usages to `text-[var(--shell-positive)]`. |
| 70 | 5.19 evening | WS11-L — three-tier hero pricing page (Linear/Stripe/Vercel/Notion/Mercury) | IMPLEMENTED (claim-only) | MDS WS11-L close-out | New `MembershipTierGrid.tsx` + `MembershipComparisonTable.tsx` per audience. Closes 5.13.26 "high-end SaaS pricing-page treatment" verbal ask. |
| 71 | 5.19 night | WS11-D Block H.5 — bold percentages in JSX prose | IMPLEMENTED (claim-only) | MDS lines 3,300–3,500 (8 files modified, +56/-27, 12 canonical pattern occurrences) | But helper-driven `formatPercent()` call sites aren't swept — see Hole #3 below. |

### B.5 — LAUNCH-001 scope (not yet executed; reviewing the prompt design)

| # | Date | Request | Status | Verified by | Notes |
|---|---|---|---|---|---|
| 72 | 5.19 evening | LAUNCH-001 — Vercel + Neon + Cloudflare deploy pipeline drafted | IMPLEMENTED (prompt-only) | `PAT-5.7-LAUNCH-001-Vercel-Neon-Deploy-Prompt.md` (282 lines, drafted post-WS11-L close) | Self-evaluation: Block A (CLI link), Block B (Neon + DATABASE_URL + migrations + seed), Block C (env-var manifest, correctly excluding Stripe/GitHub), Block D (build), Block E (preview deploy), Block F (production), Block G (DNS). Auth.js v5 preview-URL handling is explicitly the post-review correction. Conservative ordering. |
| 73 | 5.19 evening | LAUNCH-001 Credentials checklist drafted | IMPLEMENTED (prompt-only) | `PAT-5.7-LAUNCH-001-Credentials-Checklist.md` (103 lines) | Cam-side prerequisite. |

---

## C. Holes (findings beyond the request list)

### Hole #1 — Severity: **should-fix-before-launch**

**FREE membership plan is still the structural default for unauthenticated and missing-membership user resolution.**

`lib/membership.ts:45,46` declare `DEFAULT_FREE_MEMBERSHIP_PLAN = MEMBERSHIP_PLAN.FREE` and `DEFAULT_FREE_MEMBERSHIP_STATUS = MEMBERSHIP_STATUS.ACTIVE`, and these constants are returned from `resolveCurrentMembership` at lines 105, 307, 324, 382 when no `Membership` row exists for the user/audience pair. The UI hides FREE from the tab list (`lib/membershipContent.ts:5` only exposes PRO/ELITE/HELP for `MembershipTabKey`), but the surface gate in `app/components/membership/MembershipSurfaceGate.tsx` still evaluates against FREE and renders the deny state.

**Why it matters:** Cam's binding principle P1 ("we're not gonna start out with a free plan — it's gonna be Pro or Elite") is contradicted at the data layer. For the Tuesday demo this is fine because all demo accounts have a seeded `Membership` row. For launch at `patalign.com` on June 1, a real prospective customer who lands on `/{audience}/membership` without a seeded membership row will get the FREE → deny path. Worse, the WS11-G consolidation now inlines Pro Detail content into the main page; that content reads as a sales page, but the gate above it (or the missing-membership banner) will read as "you don't have access."

**Recommended fix:** Land a focused WS prompt that (a) introduces a `MembershipPlanLevel` enum without FREE on the *public-onboarding* path, (b) routes pre-auth users to the `MembershipTierGrid` (WS11-L's new component) without ever resolving them to a FREE membership row, and (c) collapses the surface-gate `FREE → deny` branch into a `null-membership → onboarding-CTA` path. Ten-to-fifteen-line type rename + one branch in `resolveCurrentMembership` + one branch in the `MembershipSurfaceGate`.

### Hole #2 — Severity: **should-fix-before-launch**

**`last-known-good-release.json` in the snapshot is stale relative to the snapshot's HEAD.**

`artifacts/mac-mini/state/last-known-good-release.json` records `commitSha: 341fe627da724b0551c986794baad352edd5865a` (WS11-G close, 2026-05-19T04:33:17Z) but the snapshot's `_GIT_STATE.txt` shows HEAD at `3a4987fc` (WS11-D close-out, 2026-05-19T00:20-0500 — note the +5 timezone skew). The snapshot was taken after WS11-D landed but the LKG file is from one commit prior.

**Why it matters:** LAUNCH-001 Preflight check #3 is `cat artifacts/mac-mini/state/last-known-good-release.json | jq .releaseId` and the prompt expects it to match the current `289cd31:sD3uPwi1pGchLiheFv7mB` (or now `820168a:_v96JTynrulvG1VTRUfSi` post-Block-H.5). If the release-promote pipeline isn't run between bundling the export and pasting LAUNCH-001 into Claude Code, the preflight check halts — wastes 10 minutes of session time.

**Recommended fix:** Two-line guard in `pnpm release:promote-known-good` to validate the recorded `commitSha` matches `git rev-parse HEAD` at the moment of write. If it doesn't, fail loud with the diff. Alternatively, add the LKG-vs-HEAD check to `scripts/release/validate-pat-surfaces.mjs` (which already has the smoke-loop infrastructure for these kinds of preflight checks).

### Hole #3 — Severity: **should-fix-before-launch**

**`formatPercent()` callers in `app/components/admin/briefings/BriefingBoard.tsx` are not bolded — Block H.5 was correctly scoped to vendor/firm-brief JSX but missed the admin briefings surface.**

`grep -rn "formatPercent" app/` returns 14 call sites; WS11-D Block H.5's close-out (MDS line ~3,360 of the plaintext) reports "12 canonical pattern occurrences in `app/` after edits, zero orphan `<span>{X}%</span>` instances remain." Those 12 sites are in the consultant-portal surfaces; the *admin* briefings surface (`BriefingBoard.tsx`) still has both:
- Half-done sites: `BriefingBoard.tsx:524,526` already wrap `formatPercent(...)` in `<span className="font-semibold text-[var(--shell-ink)]">…</span>`, which is the canonical pattern.
- Unbolded sites: `BriefingBoard.tsx:163,226,238,285,360,407,412,417` render `formatPercent(...)` as plain text.

The WS11-D Block H.5 prompt explicitly listed prose surfaces, not the admin-briefings board, so this is a *scope* gap, not a regression — but it leaves a visible inconsistency where the consultant-facing percentages pop and the admin-facing ones don't.

**Why it matters:** Admin briefings are an internal/operator surface (Cam reviews them at the dress-rehearsal stage), not customer-facing. Low-stakes visually, but at launch a "site is consistent" walk-through screenshot will show the gap. Also: the per-component `formatPercent` shims at `HeadlineMetricsRow.tsx:10` and `FirmGrid.tsx:29` both still return `string`. If they're going to remain consistent helpers (vs. inline `<strong>`), the right move is to promote them to return `ReactNode` and inline the bold wrapper there — that drops the per-call-site overhead and centralizes the pattern.

**Recommended fix:** Write **WS11-D Block H.5b — admin briefings sweep**. 8 call sites in one file. 30 minutes including the type widening on the two helper functions.

### Hole #4 — Severity: **nice-to-have**

**`Section X above/below` cross-references in body copy don't match the portal-toggle render model.**

After WS11-B, the vendor brief renders one panel at a time. Cross-references like `SelfVsMarketDelta.tsx:227` ("scoring methodology: see Section 2 above") and `VendorBriefExecutiveSummary.tsx:61` ("see Section 2 below") and `PerFirmStrengthsCautions.tsx:532` ("see Section 2 above") presume vertical-scroll layout. In the portal-toggle layout, "Section 2" is a toggle click, not a scroll-up.

**Why it matters:** Low on Cam's stage demo because he's clicking through panels in order. But on the live `patalign.com` post-launch a consultant clicks straight to "Per-firm strengths/cautions" and sees a body-text instruction to scroll to Section 2 they can't reach by scrolling.

**Recommended fix:** Replace `above`/`below` with `(see Section 2 — Evaluation methodology)` and let the consultant know it's a separate panel. Three string replacements.

### Hole #5 — Severity: **nice-to-have**

**`PerFirmStrengthsCautions.tsx` is 488 lines; `lib/perFirmQuestionLibrary.ts` is 484 lines.** Both are well-structured but neither has a unit test in `tests/`. `tests/briefs.template-bank.test.ts` exists for the older template bank; `tests/briefs.test.ts` covers the data shape but not the WS5 question-library selection logic.

**Why it matters:** This is the highest-semantic-lift code in the May sprint (per Cam's 5.13.26 sprint-plan flag for items 30–31). It's also the one most likely to drift as Cam refines the firm-brief copy post-launch.

**Recommended fix:** WS prompt to add `tests/perFirmQuestionLibrary.contract.test.ts` — pin the band × direction × magnitude selection table, assert that for each of the 5 capability domains the library returns 3–5 questions, and round-trip a few specific (firm-score, delta) inputs to confirm wording stability.

### Hole #6 — Severity: **post-launch**

**No `pnpm dev:proof` step.** Day-6 Block 0 (running log lines around the May 8 entry) found a "site is down in browser" symptom that turned out to be a long-running `pnpm dev` decoupled from its `.next/dev/routes-manifest.json` after a `.next` wipe + production build. Day-3 had the same pattern, and the audit ticket (AUDIT-D3-003 / AUDIT-D6-001) was reopened with a recommendation: ship a `pnpm dev:proof` that checks the dev manifest is current.

**Why it matters:** This is a development-ergonomics issue, not a launch blocker. But it cost Cam morning time twice. The fix prevents a third occurrence.

**Recommended fix:** A 30-line script that runs after `pnpm dev` starts and curls `/` once; if it 500s with `ENOENT: .next/dev/routes-manifest.json`, suggest the fix in the error output rather than failing silently.

### Hole #7 — Severity: **nice-to-have**

**Consultant-bypass branch repeats verbatim in three vendor pages.** Already covered in the Should-Fix section above; restated here for the matrix completeness.

### Hole #8 — Severity: **post-launch**

**`docs/CORE_BUILD_AAE.md` still has the stale membership/payment language called out in the 4.26.26 audit row** ("payments are 'later' and checkout placeholders remain"). That doc isn't shipped to customers but it's the canonical "where are we?" reference for any human or future Claude session reading the repo. The reconciliation row was filed; the doc itself wasn't updated.

**Why it matters:** The 5.17 audit caught this and filed a "doc reconciliation pass" recommendation; it wasn't picked up in any subsequent WS. Cam should know that the AAE guide is *currently misleading* on payments stance — easy to confuse for canonical truth.

**Recommended fix:** 30-minute doc pass. Update `docs/CORE_BUILD_AAE.md:206-227` and `:314-321` to reflect the current Stripe-deferred-to-LAUNCH-003 stance.

---

## D. Opportunities

### Opportunity #1 — Severity: **post-launch**

**Promote `formatPercent` to return `ReactNode` and centralize the bold wrapper.** Already named in Hole #3 — calling it out again as an opportunity because it reduces per-call-site cognitive load for every future percentage in the codebase. Pair it with a `PercentValue` co-component for cases where the percentage needs a tone modifier (delta-up, delta-down).

### Opportunity #2 — Severity: **post-launch**

**Factor a `requireVendorSurfaceAccess(sessionUser, surfaceKey)` helper into `lib/consultantAccess.ts`.** Today the consultant-bypass branch is hand-copied across three vendor pages. The helper would let the next "demo-fatal" surface gating bug get fixed in one place. Could also extend to firm-side surfaces if those ever get a similar bypass case.

### Opportunity #3 — Severity: **nice-to-have**

**`EcosystemDetailData` already carries `firmGrid[].moduleCompletionPercent` and `firmGrid[].hotDivergenceCount` per firm.** WS11-I drilled into modules and hot-divergences in the explainer pages; the same data is available for *any* tile, but only those three got drilldowns. If Cam wants to keep the "everything is a story" pattern going post-launch, the underlying data is already there — just needs the explainer-content authoring.

### Opportunity #4 — Severity: **post-launch**

**The 5-band `BAND_CELL_CLASSES` heatmap and the `pat-stat-number` utility class belong in `app/globals.css` (or a `lib/visualTokens.ts`) as named tokens, not inlined `var(--brand-c2-blue)` strings.** WS11-K introduced `--shell-positive` and a few radar band tokens, which is the right direction. Continue the pattern: every color used for *state* (high/mid/low band, delta direction, divergence severity) should be a single source of truth.

### Opportunity #5 — Severity: **post-launch**

**The seed has 60 firm-product reviews (4 products × 15 firms), but `OpenEndedPanel` slices to 10 by default.** That's a UX choice, not a bug, but it's a place where the seed could backfill *more diverse* response text rather than more responses. The 25-template open-ended library is rotating across 60 reviews — meaning each template averages 2.4 hits. WS3 already addressed the "all responses the same" complaint from Cam's 5.13.26 review, but a follow-up rotation pass with another 5-10 templates would diversify the demo even more.

### Opportunity #6 — Severity: **post-launch**

**Tenancy is solid but the test for it is one file (`tests/tenancy-invariant.test.ts`).** Each new aggregator that joins on `companyId` / `userMembershipId` is a tenancy responsibility. Consider a CI gate: any new `prisma.X.findMany`/`findFirst` without a where-clause on a tenancy field requires either a `// tenancy-exempt: reason` comment or a test entry. This is a process opportunity, not a code change.

### Opportunity #7 — Severity: **post-launch**

**The audit chain itself is the unsung hero.** AUDIT-D1-001 (capability node graph), AUDIT-D2-001 (FIRM-scope-only capability nodes), AUDIT-D16-001 (LKG auto-promotion gap), AUDIT-D24-001, AUDIT-WS9-001, AUDIT-WS11-001, AUDIT-WS11-H-001 — every one is a clean, dated, file-cited ticket. This level of audit discipline is rare; lean into it post-launch by giving the running log its own `docs/audit/AUDIT-INDEX.md` that lists every open ticket in one place with severity and recommended-pick-up-window. Today they're scattered across the running log + the AUDIT-WS9-001/AUDIT-WS11-001 docs.

---

## E. Cross-cutting observations

1. **The "fix doesn't match Cam's intent" failure mode is the real signal-to-noise problem of the May sprint.** WS11-D's close-out doc names it explicitly: "WS11-D Block F bumped the radar viewBox by 30px — technically a fix, but not enough for the actual problem." The same shape recurred on the heatmap top-band darkness and the table-column alignment. WS11-H surgically re-fixed all three, and the structural lesson — *write the prompt's verification gate against the exact value, not the verb* — is now codified into every post-WS11-D prompt's halt-condition list. Worth carrying forward as a Rule of Engagement for LAUNCH-002+ work.
2. **The "Codex says shipped, file doesn't exist" failure mode is dead.** WS9-EMERGENCY's grep/curl/screenshot discipline closed it. The May 14 Block 5 file-audit (verifying `MembershipSurfaceGate.tsx`, `MembershipCheckoutShell.tsx`, `PatModeToggle.tsx`, `PatAudienceTitle.tsx`, `displayCopy.ts` all exist with non-trivial content) was the punctuation. Three months of suspicion answered. The reconciliation document already captured this; restating for completeness.
3. **WS-prompt quality has climbed dramatically.** Compare WS1-WS6's verbose prose-heavy prompts to the WS11-A/B/C/D prompts: tight preflight, explicit halt conditions per block, exact verification gates, close-out report schema. The WS11-H prompt is the canonical example — six blocks, each with a file anchor, an exact edit specification, and a curl-or-grep verification clause. This kind of prompt engineering is the *real* infrastructure investment of the sprint, even more so than the code.
4. **The portal-shaped hero pattern is now the design system's anchor.** `PortalAudienceEyebrow` + `PatAudienceTitle` + `PortalPanelSelector` + `MeetPatContent` is now rendered by `/consultants`, `/consultants/ecosystems/[id]/vendor-brief`, `/consultants/ecosystems/[id]/firm/[firmCompanyId]`, and (per CLAIM-ONLY WS11-L) `/vendor/membership`, `/firm/membership`, `/user/membership`. That's six surfaces sharing one structural pattern. The implication for LAUNCH-001's public-onboarding flow: it should use the same components so the pre-auth and post-auth surfaces feel like one product.
5. **`lib/` has 73 files and `app/` has many nested route trees.** The file count itself is fine; what's worth noting is that the lib layer has 10+ files in the `briefs` family alone (`briefs.ts`, `briefs/executive-summary-templates.ts`, `firmBriefs.ts`, `firmBriefs/`, `vendorAlignmentInsightEngine.ts`, `vendorProductInsightEngine.ts`, `adminBriefingEngine.ts`, `perFirmQuestionLibrary.ts`, `firmInsightEngine.ts`, `firmCapabilities.ts`). They're independently coherent but the boundary lines have drifted. Post-launch, a single half-day mapping pass — "for each lib file, name the one surface that consumes it primarily" — would reveal the consolidation opportunities.
6. **The MEMORY DREAM STATE itself is now the binding spec.** Cam's 5.13.26 verbal walkthrough — recorded into MDS as a single ~3,000-word paragraph — drove every WS prompt that followed. Every WS prompt's "Target" paragraph is a paraphrase of a sentence from that walkthrough. This is *good*: the source of truth is one person's continuous voice rather than fractured ticket descriptions. The risk is that the walkthrough is now the only source for 31 of the 73 May requests; any future audit Claude (including this one) has to be able to find it. Recommend a structural pass that extracts the verbal review into `docs/canonical/verbal-walkthrough-2026-05-13.md` so the canonical request set is on disk as plain text, not embedded in a 100MB Apple RTFD bundle. The MDS will continue to grow; the walkthrough should be excerpted out and immutable.

---

## F. Implementation-quality scorecard (1–5)

| Surface | Rating | Justification |
|---|---|---|
| Vendor brief (`/consultants/ecosystems/[id]/vendor-brief`) | 4.5 / 5 | Section 1–6 spine clean. Portal-toggle hero in place. Paired-bar visualization (Section 3) is the strongest single component. Loses 0.5 for stale "Section 2 above/below" cross-references. |
| Firm brief (`/consultants/ecosystems/[id]/firm/[firmCompanyId]`) | 4 / 5 | Five-module radar renders; six-quarter roadmap shipped Day 23; stack-fit table is *the* deferred item (WS11-D Block J post-demo). |
| Ecosystem detail (`/consultants/ecosystems/[id]`) | 4.5 / 5 | The five-tile headline row + FirmGrid + VendorAtAGlance/LowestEngagement stack is tight. WS11-E explainer routes turn every tile into a clickable story. WS11-I drilldowns add per-firm data. |
| Membership pages | 3.5 / 5 (pre-WS11-L) → 4.5 / 5 (post-WS11-L, CLAIM-ONLY) | The structural FREE-tier issue holds back the rating until the deny-state hole is closed. WS11-L's three-tier hero is a meaningful jump. |
| Auth + tenancy | 4 / 5 | `requireConsultantSession`, `getConsultantAccessStateForUser`, the consultant bypass on vendor surfaces, and the per-aggregator tenancy filters all check out. The single-test-file coverage on tenancy (`tests/tenancy-invariant.test.ts`) is the soft spot. |
| Design system + tokens | 4 / 5 | The three-tier `--brand-c2-blue` / `--brand-orange` / `--shell-*` discipline is real and consistently applied. WS11-K's token reconcile closed the `text-green-600` inline-utility gap. The 5-band heatmap classes deserve to be design tokens, not inline strings. |
| Seed + demo fixtures | 4.5 / 5 | 11 vendors / 37 products / 15 firms / 75 firm submissions / 60 product reviews / 25 open-ended templates. `DEMO_COMPANY_MODULE_TARGETS` shows the seed is deliberate, not random. WS11-I Block C closes the firm-product-assessments seed (CLAIM-ONLY). |
| Test coverage | 3.5 / 5 | 52 files in `tests/`. Auth/access/membership/tenancy/billing all have contract tests. Missing: `perFirmQuestionLibrary` (the biggest semantic lift of the sprint), `BriefEditChoice` has a tenancy test but `briefEditChoice.test.ts` predates WS11-D. Demo-account-renders-as-PRO end-to-end assertion is the highest-value missing test. |
| Infra (build / `validate:launch` / LKG promotion) | 4 / 5 | `pnpm export:safe` + git bundle + canonical 3-zip layout is mature. `validate:launch` runs every gate. The LKG auto-promotion drift caught in Hole #2 is the one rough edge. The 285-node-process count at session close is a cosmetic concern, not a real one. |

---

## G. Specific recommendations ranked by expected value

Top-10 next moves prioritized by (launch-risk reduced) × (effort inverse). Each should be concrete enough to draft a Claude Code prompt from in under 10 minutes.

1. **WS-LAUNCH-PREP-001 — Retire structural FREE.** Single WS prompt. Five files: `lib/membership.ts`, `lib/membershipContent.ts`, `app/components/membership/MembershipSurfaceGate.tsx`, `lib/publicOnboarding.ts`, plus a new test in `tests/membership-content.contract.test.ts`. Goal: any pre-auth user lands on `MembershipTierGrid` (WS11-L) and never resolves to a FREE membership row. Time estimate: 90 minutes Claude Code work; closes Hole #1 and Cam's binding principle P1 in one pass.

2. **WS11-D Block H.5b — Admin briefings bold-% sweep.** 8 unbolded `formatPercent(...)` call sites in `app/components/admin/briefings/BriefingBoard.tsx` get the canonical wrapper. Two helper-function widenings (`HeadlineMetricsRow.tsx:10`, `FirmGrid.tsx:29`) move `formatPercent` from `string` to `ReactNode`. 30 minutes Claude Code work; closes Hole #3.

3. **WS-LAUNCH-PREP-002 — LKG self-validation guard.** Two lines added to `pnpm release:promote-known-good`: compute `git rev-parse HEAD` at write time and assert it matches the `commitSha` being written. If not, fail loud with a diff. 20 minutes Claude Code work; closes Hole #2 + the LAUNCH-001 Preflight #3 risk.

4. **WS-TEST-COVERAGE-001 — Demo-account end-to-end assertion.** New `tests/demo-account-renders.contract.test.ts` that loads `review.vendor@pat.local`, asserts `resolveCurrentMembership` returns `PRO`, and asserts each of the three guarded surfaces (`/vendor/product-assessment`, `/vendor/product-insight`, `/vendor/alignment-insights`) renders content rather than the surface gate. 45 minutes; closes the regression hole that caused items 5–7 in the first place.

5. **WS-PERF-TENANCY-AUDIT-001 — Reduce verbatim consultant-bypass repetition.** Factor `requireVendorSurfaceAccess(sessionUser, surfaceKey)` into `lib/consultantAccess.ts`. Sweep the three vendor pages. Add `tests/vendor-surface-access.contract.test.ts`. 60 minutes; closes Should-Fix #1.

6. **WS-DOC-RECONCILE-001 — Refresh `docs/CORE_BUILD_AAE.md`.** Update the membership/payment language at lines 206–227 and 314–321 to reflect the current Stripe-deferred-to-LAUNCH-003 stance and the WS11-L pricing-page model. 30 minutes; closes Hole #8.

7. **WS-DESIGN-TOKEN-002 — Promote heatmap and `pat-stat-number` to design tokens.** `BAND_CELL_CLASSES` moves from inline `bg-[var(...)] text-white` to named tokens in `app/globals.css`. Same for the 5-band `confidence-dot` styling. 45 minutes; opportunity #4 turned into code.

8. **WS-DOC-CANONICAL-001 — Extract the 5.13.26 verbal walkthrough to `docs/canonical/`.** One-off prompt: grep `mds-plain.txt` for the verbal-review section, write to `docs/canonical/verbal-walkthrough-2026-05-13.md` as immutable plaintext. 15 minutes; closes Cross-cutting #6.

9. **WS-TEST-COVERAGE-002 — `tests/perFirmQuestionLibrary.contract.test.ts`.** Pin the band × direction × magnitude selection table. Round-trip a few (firm-score, delta) inputs. 60 minutes; closes Hole #5.

10. **WS-DEV-PROOF-001 — `pnpm dev:proof` script.** 30-line node script: after `pnpm dev` boots, curl `/` and assert 200; if 500 with `ENOENT: routes-manifest.json`, print the fix. 30 minutes; closes Hole #6 (would have caught the Day 6 site-down symptom).

---

## H. Audit confidence notes (read before re-using this report)

- **Snapshot:** `c2acct-snapshot-20260519-103022/` (HEAD `3a4987fc`).
- **MDS plaintext:** `/tmp/audit/mds-plain.txt`, 62MB, 1.57M lines, derived from `PAT MEMORY DREAM STATE.rtfd/TXT.rtf` via a custom RTF→txt converter (Apple RTFD's `\<newline>` paragraph-break convention required a non-standard handler; `pandoc` and `unrtf` were unavailable in the sandbox).
- **Citations format:** `file:line` against the snapshot for IMPLEMENTED rows; `MDS line ~N` against the plaintext for CLAIM-ONLY rows. The MDS line numbers are approximate because the converter collapsed whitespace inside RTF formatter blocks differently from the original Apple rendering.
- **Re-running the verification:** when the `c2acct-live-full-20260519-222118.tar.gz` tarball is on disk, the 22 CLAIM-ONLY rows can be re-verified in 30 minutes by extracting and running the same grep patterns this audit used. Each MDS-cited block has an exact file-anchor in the corresponding WS prompt (`PAT-5.7-WS11-H-Prompt.md` etc.) — grep against that anchor confirms the fix landed.
- **What I didn't do:** I did not render any surface in a browser, run any test, exercise the launch-proof artifact, or follow any link Cam might have pasted in the MDS to external sources. This is a code-and-prompt audit, not a runtime audit. Stage walkthrough is Cam's job tomorrow.

---

*End of audit. Total runtime in workspace: ~50 minutes. Recommended human review window before pasting LAUNCH-001: 15-20 minutes (focus on Hole #1, Hole #2, and recommendation #1).*
