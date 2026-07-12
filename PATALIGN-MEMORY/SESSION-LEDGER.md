# PATALIGN Session Ledger

Running record of shipped work. Newest entries on top. Each entry: sub-block,
commit, root cause / change, validations, checkpoint proof.

## 2026-07-11 — Block 8: Cross-Portal Pattern Wave

Discipline: pnpm · fast gates (typecheck + lint + unit + contract tests) on every
sub-block commit · full build + restart + asset-integrity + HTTP proof + screenshots
at TWO live checkpoints (after B8-4, after B8-8) · one commit each. Reorder: B8-2
lands before B8-1 (B8-1's band chip consumes the B8-2 lexicon).

Band lexicon ruling (final): SCORE BANDS (0-100, five) = Early 0-39 · Developing
40-59 · Building 60-74 · Established 75-89 · Leading 90-100. EVIDENCE CONFIDENCE
(separate axis, data volume) = Grounded · Early signal · No signal. Killed labels:
Optimizing, Emerging, Full confidence, Pending confidence, Limited signal, Sample-thin.
Chip format "68 · Building"; confidence is its own small label, never concatenated.

Queued AFTER Block 8 (Cam's go): hybrid Elite depth layers · sandbox utility lanes ·
V2/V3 expansions · Sales Card v2. Also pending: qbank approval (flip both 90-item
ModuleTemplates reviewStatus DRAFT→APPROVED with two-signature CPA + clarity record).

### B8-2 — ONE BAND LEXICON (landed before B8-1)
New `lib/bandLexicon.ts` = single source: SCORE_BANDS (five, Early/Developing/
Building/Established/Leading + deep-red→deep-green ramp + `scoreChipLabel` →
"68 · Building") and EVIDENCE_CONFIDENCE (three, Grounded/Early signal/No signal).
`scoreBands.ts` + `confidenceBands.ts` now delegate. Canonicalized confidence
labels at source across firm/vendorProduct/vendorAlignment/adminBriefing engines;
retired the component-local maps (AlignmentBoard/SalesCard used score-word
"Building" for confidence — bug) and the consultant vocab layer (EcosystemListCard/
Header/FirmGrid/FirmAlignmentHeader "Full confidence"/"Limited"/"Initial"/"Pending"
→ canonical); executive-summary "Full confidence" → "Grounded"; methodology bands
→ three. New `tests/band-lexicon.contract.test.ts` bans the six strays + asserts the
scale. Note: FirmMaturity/VendorStatus "EMERGING" enums are internal (not rendered)
— left as-is. ecosystem reverse-map keeps internal long-form bucket keys (plumbing,
never rendered). Fast gates: typecheck 0 · lint clean · unit 738/738.

### B8-1 — ONE CARD GRAMMAR
Vendor product Pro cards: killed the 3× duplicated `currentStateSummary`
boilerplate — each card now leads with its OWN headline number + band chip + one
card-specific sentence from its own evidence slice (product-fit → self-vs-firm
delta; implementation-friction → weakest per-area score; visibility → firm-review
count + recency). Vendor alignment Pro cards: each leads with its own driver
signal (weakest driving module = pressure point, card-specific; variance card →
cross-module spread) as headline number + band chip, keeping the per-card
sentence. Metric threads through the existing InsightSurfaceCardGrid (no new
visual system). Firm-pro is the reference grammar — unchanged. Fast gates:
typecheck 0 · lint clean · unit 738/738 (updated 2 card-shape contracts: Pro
cards now carry a band chip; only Elite uses "Coming soon").

### B8-3 — METRIC LABEL PRECISION (no math)
Distinguished the two alignment numbers that read as a "62-vs-68 bug": Alignment
Board hero → "stack alignment · from stored product-review evidence"; firm insights
hero context → "Avg of your final module scores — distinct from the Alignment
Board's stack number". Consultant firm brief: relabeled the radar benchmark
"ecosystem average" → "peer average (N firms, excludes this firm)" — verified the
math already excludes the firm (peerFirmIds filters id !== firmCompanyId); count
from methodology.sampleSizes.peerFirmCount; updated the outline caption to match.
Ecosystem Coverage tile: "evaluated by N firms" → "across N firm assessments"
(firmReviewCount is a review count, not distinct firms). Fast gates: typecheck 0 ·
lint clean · unit 738/738.

### B8-4 — ROUTES + 404
next.config.ts redirects(): /consultant and /consultant/:path* → /consultants
(301 permanent). New app/not-found.tsx: branded light-theme 404 (PAT hero
lockup, plain-language copy, cards linking to sign-in + firm/vendor/consultant
portal homes) replacing Next's dark default. Fast gates: typecheck 0 · lint
clean · unit 738/738. (redirect + not-found verified live at checkpoint 1.)

### CHECKPOINT 1 (after B8-4) — live proof
Build 29b2332:kRK4h7Wvs8V10EQknQEQn. Quiesce→build→prep-verify(static+public
identical)→promote→restart :3000 then :3005→watchdog (restart last). asset-integrity
PASS both ports (10/10 assets, served==disk==fingerprint). Live: /consultant→308→
/consultants; branded 404 (http 404, PAT lockup + portal links); vendor alignment
cards each show own number + band chip (DEVELOPING/GROUNDED) + pressure-point
caption; firm insights hero reads "Avg of your final module scores — distinct from
the Alignment Board's stack number" and alignment index chip "69 · Building" (new
lexicon). Board hero label (B8-3) gated behind active-Elite — no demo account is
active-Elite (demo-firm-elite = Pending Checkout), so build-verified only.
Follow-up polish: vendor variance card shows a confidence chip (Grounded) in the
same slot as sibling score-band chips — minor axis-mix, flagged.

### B8-5 — DEV-SPEAK SWEEP
Sales-card/mode-toggle disabled chip: dropped the "Disabled" text — disabled state
now conveyed by styling (data-state="disabled") only. hello-world smoke agent
filtered from the admin registry view (HIDDEN_AGENT_KEYS in getAgentsOverview).
Customer-surface grep found no other leaks (billing "scaffold" is required
truthful copy, left intact). Extended the copy contract test with a dev-speak
guard. Fast gates: typecheck 0 · lint clean · unit 740/740.

### B8-6 — CONSULTANT SCOPING (component-level COI wall)
Found + fixed a real COI leak: ecosystem firm briefings are firm-scoped, so
their productLayer carried the firm's reviews of EVERY vendor — the consultant's
"Recent firm responses" panel + product filter spanned competitor vendors'
products. openEndedResponsesForEcosystem now takes allowedProductIds; the
ecosystem detail passes the ecosystem vendor's own catalog IDs, dropping foreign-
vendor responses at the data layer. New tests/consultant-openended-scoping.contract
.test.ts: (1) OpenEndedPanel is only imported under app/consultants (never
vendor/firm), (2) foreign-vendor product responses are dropped by the allow-set.
Fast gates: typecheck 0 · lint clean · unit 743/743.

### B8-7 — QUALITATIVE DE-CLUMP
Demo open-ended rotation was `(idSum + index) % 25`, which could collide and
reuse a template → back-to-back near-duplicate quotes (Brightline ×3 PolicyGrid).
Replaced with a full-cycle permutation `openEndedTemplateIndex(productKey, i, count)`
= `(base + i*7) % count` (7 coprime with 25): every template used once before any
repeat, so no reuse within a product's latest N responses; per-key base varies the
opening across products. New tests/qualitative-declump.contract.test.ts (full-cycle,
no back-to-back, cross-product variety, deterministic). NOTE: live de-clump lands
when the demo seed re-runs (seed:demo-expand at checkpoint 2). Fast gates:
typecheck 0 · lint clean · unit 747/747.

### B8-8 — HONEST LOCKED STATES
Killed "Coming soon" for live Elite surfaces: ELITE_PLACEHOLDER_* now = badge
"Elite" + copy "Live with Elite membership"; swept every remaining literal
"Coming soon" / "Unlock with Elite membership" across insightContent, locale,
vendor engines, and the firm/vendor insight pages → "Live with Elite membership".
New app/components/insights/LockedElitePreview.tsx: v2 surface name + Elite badge
+ REAL chart structure (bars/line/distribution silhouette) with values blurred +
"Live with Elite membership" CTA; wired into the firm insights detail Pro-locked
branch with FIRM_ELITE_V2_META names. Vendor product intelligence has no live
Elite layer → renders NO Elite toggle (mode coerces elite→pro; InsightsModeShell
elitePanel now optional). Tests updated (statusLabel "Coming soon"→"Elite",
copy→"Live with Elite membership", vendor-product elite mode→pro). Fast gates:
typecheck 0 · lint clean · unit 747/747.
Follow-ups (flagged): LockedElitePreview wired into firm DETAIL only — vendor
alignment detail + index cards still use the plain locked card (name + honest
copy, no blurred chart); insightContent tier-2 PROSE still carries stale
"reserved/future/not live" framing that contradicts the v2-live reality;
flag-off Alignment Board / Sales Card "Coming soon" placeholders left (feature-
flag-gated, not membership-locked — a different concept).

### CHECKPOINT 2 (after B8-8) — live proof
Build ca88c79:KVYGyYMEgyZhGZenj5lrq. Quiesce→build→prep(static identical)→promote→
restart :3000 then :3005→watchdog. asset-integrity PASS both ports (10/10 assets,
served==disk==fingerprint). Live: /consultant→308→/consultants; unknown route→404;
firm insights elite index = 0 "Coming soon", 8 "Live with Elite membership"; firm
elite detail renders locked-elite-preview (v2 name "Peer Position Report" + Elite
badge + blurred chart + "Live with Elite membership" CTA), 0 "Coming soon". Vendor
alignment cards show per-card band chips (B8-1/B8-2). Screenshots in
artifacts/b8-cp2-shots/. Follow-up visible: the stale tier-2 surface prose
("reserved for future / not available yet") still renders above the honest
LockedElitePreview — flagged for reconciliation.

### QBANK APPROVAL — mechanism ready, not yet recorded
New scripts/modules/approve-qbank.ts (+ pnpm modules:approve-qbank): flips DRAFT
ModuleTemplates → APPROVED transactionally with the two-signature record
(cpaReviewedBy/At + clarityReviewedBy/At), dry-run default, requires both
--cpa/--clarity signatories (refuses placeholders). NOT recorded: this DB has
ZERO ModuleTemplates (qbank not imported here — run pnpm modules:import-qbank
first), and the sign-off needs Cam's REAL signatory identities (schema names a
CPA-certified founder + clarity reviewer "Leslie"). Prod --apply is Cam's-go-only.

### B8-7 LIVE NOTE
The de-clump is committed + unit-proven; the live demo panel de-clumps only after
the demo seed re-runs (pnpm seed:demo-expand) — not run at this checkpoint.

### BLOCK 8 — CLOSED
B8-2 eac17e95 · B8-1 e0e1f792 · B8-3 cbdee037 · B8-4 29b23327 · [CP1] · B8-5
255a4a02 · B8-6 06544275 · B8-7 0fc5ea3a · B8-8 ca88c798 · [CP2] · qbank script.
Held blocks now unlocked, queued AFTER Block 8: hybrid Elite depth · sandbox
utility lanes · V2/V3 expansions · Sales Card v2.

## 2026-07-11 — Block 9: Governance mount + prose reconciliation

Post-B8: ran seed:demo-expand (44 firms / 206 module subs / 133 product reviews)
+ compute:benchmarks (12 firm / 50 vendor runs) + seed:demo-swaps (134 events);
restarted flagged :3005 with a fresh Prisma client → B8-7 de-clump live, six Elite
surfaces re-grounded for Mythos. Imported qbank (1 DRAFT DIAGNOSTIC template, 90
items); approve HELD until Cam names CPA signatory (Brian Tankersley / Randy
Johnston; clarity = Leslie Garrett).

### B9a — AI DISCLOSURE on Pat-drafted communications
New lib/patDisclosure.ts (full footer, "Pat (AI) · human-reviewed" short form,
X-PAT-AI-Generated header helper). Added Notification.aiGenerated Boolean
(migration 20260711210000) threaded through createNotification; set true on both
Pat-drafted paths (automated pings executePlan + manual nudge). Bell renders the
short form, /notifications inbox renders the full footer, API serializes the flag.
New tests/pat-disclosure.contract.test.ts fails the build if a Pat-drafted create
path or a render surface drops the disclosure. Email header helper ready for when
email delivery is wired (currently in-app only). Fast gates: typecheck 0 · lint
clean · unit 754/754.

### B9b — "How Pat is governed" trust mount
New /trust/pat surface (patGovernance) rendering the governance copy pack §2
verbatim with Cam's two baked edits: stop-authority is PUBLIC ("Owner on file:
C. Garrett."), and the data sentence is exactly "Pat only sees the minimum data
needed for the task at hand, and client assessment answers are never used to
train third-party AI models." (dropped "retains nothing" — zero-retention DPA is
post-launch). Wired into TRUST_SURFACE_ORDER + TRUST_FOOTER_LINKS + the release
surface manifest; new app/trust/pat/page.tsx; "Learn how Pat is governed" link
added to the Pat consent panel. trust-surfaces contract updated. Fast gates:
typecheck 0 · lint clean · unit 754/754.

### B9c — B8-8 prose reconciliation + one locked-state component
Rewrote the stale tier-2 prose in insightContent.ts (firm + vendor alignment):
"reserved for future / not available yet / PAT does not claim … exists yet" →
v2-live reality with the real names (Trajectory · Peer Position Report ·
Gap-to-Top-Quartile Plan; Category Position · Demand Signals · Alignment Gap Map)
and honest lockedState ("live Elite surface … on Pro you see the current-state
readout instead"). Extended LockedElitePreview to BOTH portals, DETAIL + INDEX:
vendor alignment detail now uses it (matching firm); InsightsModeShell elite panel
gained optional lockedPreviews so Pro users see one blurred-chart preview per
surface on the index (firm + vendor) instead of a plain card. Fast gates:
typecheck 0 · lint clean · unit 754/754.

### B9d — rotation-verification via DIRECT_URL
New artifacts/rotations/ (proof output; .gitkeep tracked, *.json gitignored) +
scripts/rotations/verify-rotation.ts (pnpm rotations:verify). After a DB
credential rotation it connects via DIRECT_URL (Neon non-pooler host) instead of
the pooled DATABASE_URL — the pooled URL runs pgbouncer in transaction mode,
which rejects Prisma's prepared statements with a "prepared statement does not
exist/already exists" error that is a FALSE negative unrelated to the credential.
The direct connection bypasses pgbouncer, so a PASS means the credential is
genuinely good. Runs SELECT 1 + current_user + version + now, writes a proof JSON.
Verified locally: PASS via DATABASE_URL fallback (no pgbouncer locally, warns to
set DIRECT_URL). Fast gates: typecheck 0 · lint clean · unit 754/754.

## 2026-07-12 — Mythos punch list (P1-P6) + qbank second bank

Second bank imported (9c9a93ad): parameterized import-qbank for both banks
(env metadata + parseQbank keyPrefix, FTC classifier); qbank-integration-v1
STRENGTH 90 items DRAFT. Governance approval STILL HELD (founders' review
round-trip; do not record until Cam names CPA — Brian Tankersley or Randy
Johnston; clarity Leslie Garrett). QBANK v1.1 MECHANICAL FIXES received (spec in
message) — NOT yet executed (key shuffle, joke distractors, length cues, Gov C11
retarget, targeted edits, margin flags, docx exports).

Punch list P3/P5/P6 DONE (dabc4ac6): killed Products-at-a-Glance on vendor home;
trust "Last updated" is build-date-driven (release fingerprint); board rail
header "Ranked candidates" for entitled viewers.

REMAINING — P1/P2/P4 are one coherent block (diagnosed, not yet built):
- P2 ROOT CAUSE: MIN_CONTRIBUTORS=5 and reading.n = DISTINCT VENDORS per category.
  The demo has 51 fragmented categories (Tax_workflow 4 · Close-recon 3 · ~11
  one-off 1-vendor cats). Fix = consolidate the vendor product bank to a shared
  canonical taxonomy (~6-7 categories) so each has >=5 of the 8 vendors. This is
  data-model work in the demo vendor bank, not a coverage tweak. Reseed +
  recompute:benchmarks after.
- P1: V1 Category Position rebuild per review-response §3 (human category names
  from utilityKeyToLabel; takeaway title; named bands Top quartile/Above median/
  Below median NEVER "Q2"; you-are-here marker; p25-p75 band; peer disclosure;
  so-what + ranked action; percentile tooltip). One visual+verbal system across
  F1 + all distribution charts.
- P4: demo-vendor-elite (Meridian) Sales Card 0 strong/0 good/6 WEAK regression
  after reseed; rebalance BOTH vendor accounts to a strong/good/weak mix + vary
  the per-firm dimension line (all six repeat "Operating Model … · Early signal").
Acceptance: zero insufficient-data cards on Meridian Category Position; live HTTP
+ screenshot; Mythos re-verifies.

### B10a — DATA + INTEGRITY (P2 done; P4 needs a score-balance pass)
Commits: taxonomy keystone b3caf760 · scale multiplier 58da6932 · readCohort
filter 230e5347 · base-demo canonical d7638fa3. Reseed executed: scale-4
seed:demo-expand (32 vendors / 176 firms / 824 module subs / 548 product reviews)
+ seed:demo-benchmark + seed:pat-runtime (all serial, no fan-out per Day-16) →
cleared stale benchmarks (1523 company / 56 run rows) → compute:benchmarks =
12 firm + **7 vendor runs** (exactly the 7 canonical categories).
ACCEPTANCE — P2 MET: getVendorCategoryReadings now returns only the vendor's OWN
categories (readCohort filtered to companyByMetric), and every canonical category
clears >=8 vendors → Meridian (demo-vendor-elite) 5 cats / **0 suppressed** ✅;
PAT Demo Vendor 4 cats / 0 suppressed ✅. One null-category product remains (not
in any run, harmless).
STILL OPEN in 10a:
- P4 fit mix: Meridian 0 strong/0 good/6 weak; PAT Demo Vendor 0/1/14. Root
  cause: alignmentDelta = vendorStrength − firmAlignment is negative for ~all
  firms (vendor product strength sits below firm alignment). Fix = raise the
  review vendors' product scoreTarget / widen the ecosystem firm alignment spread
  so deltas span strong/good/weak. Iterative demo-score tuning, not a code bug.
- Dimension-line variety: only 2 distinct gapAreas per vendor — apply B8-7-style
  de-clump to the gapArea/dimension rotation.
NOT STARTED: 10b (P0 server-side Elite tier-gate + contract tests — cites 4.12.26
direct-route-lock audit), 10c (P0 one-shared-reader number integrity), 10d
(threshold math), 10e (3 re-verified regressions). Block 10 live checkpoint runs
the FULL regression checklist after 10a-10e.

### B10a/B10b — STATUS (critical walls done; polish + 10c-e remain)
Key insight: running preview:pat-setup was the missing final reseed step.
10b (P0 SECURITY): BREACH CLOSED ✅ — demo-firm-pro re-pinned to PRO
(eliteAllowed=false); the server-side Elite gate was already correct (repro was a
mis-seeded membership, not a bypass). tests/elite-tier-gate.contract.test.ts
(e02ef1f2) locks both directions — closes the 2026-04-12 direct-route-lock audit.
B7-1/D5 ✅ — demo-firm-elite + demo-vendor-elite both ELITE+ACTIVE post-reseed.
10a: P2 ✅ — demo-vendor-elite Category Position 5 cats / 0 suppressed (7
canonical categories, readCohort own-categories filter, 4x scale). P4 MIX ✅ —
Sales Card strong/good/weak = 2/1/3 (warm-fit reseed + score variety; red wall
gone). Reseed chain: seed:demo-expand(scale4) → seed:demo-benchmark →
seed:pat-runtime → preview:pat-setup(kill after DONE) → clear+compute:benchmarks.
Commits: taxonomy b3caf760 · scale 58da6932 · filter 230e5347 · base-canonical
d7638fa3 · gap-rotate ea6172fe · tier-gate test e02ef1f2 · radar-shape-vary (this).
10a de-clump: SOLVED ✅ — distinctGapAreas=4 (was 1). ROOT CAUSE: firmModuleAssessmentTarget
did FIRM_MODULE_OFFSETS[moduleIndex] (fixed) + a firmOffset that shifts the whole
firm uniformly — so the lowest offset (-0.75) always landed on module 3
(Operating Model) for EVERY firm. FIX: rotate the offset by firmIndex —
FIRM_MODULE_OFFSETS[(moduleIndex + firmIndex) % 5]. Offsets sum to a constant
(+0.05) so overall alignment average (and the fit mix) is unchanged; only which
module is weakest rotates. Verified on demo-vendor-elite Sales Card: 6 firms,
fit s2/g1/w3, 4 distinct gap areas (Operating Model / Governance / Integration &
Data Flow / Automation & AI). Probe: scripts/dev/verify-gap-areas.ts.
10a COMPLETE. STILL OPEN:
- 10c (P0 number integrity: one shared reader per insight, face==detail hero;
  per-card metric differentiation), 10d (threshold math), 10e (3 regressions).
- Block 10 live checkpoint (rebuild + restart both ports + FULL regression
  checklist A-E incl. D5) after 10c-10e.
The running :3005/:3000 are STALE (pre-Block-10 build + old in-process data);
they get rebuilt/restarted at the checkpoint.

### B10c — P0 NUMBER INTEGRITY (done)
Bug: face card number != detail hero number, and all cards read the same.
Vendor side: face read weakestModules[0] (~same module every card) while the
detail hero read report.averageModuleScore (the BUNDLE average — identical for
all 8 cards). Firm side: hero always showed averageContributingModuleScore while
the face card showed a per-theme metric — so automation/data-controls/change
cards disagreed face-vs-hero.
Fix: ONE shared headline reader per portal, called by BOTH face + hero:
- readVendorAlignmentInsightHeadline(report) → each insight's PRIMARY cluster
  (config clusterKeys[0], theme-stable/distinct); uneven-maturity-variance keeps
  its variance stat. Added report.primaryCluster (=narrative clusters[0]).
- readFirmInsightHeadline(key, report) + firmHeadlineValueText() → same per-theme
  number the face card already used; buildFirmInsightCardMetric now delegates.
Both [key]/page.tsx heroes feed ScoreLockup from the reader (score/displayValue/
suffix/showBand); no more averageModuleScore fallback.
Result (demo-vendor-elite, live): 8 tier-1 cards → 6 DISTINCT headline values
(was 1). face==hero by construction.
Tests: tests/insight-number-integrity.contract.test.ts (7) — behavioural
identity + per-card differentiation + source-scan wiring guard (no averageScore
fallback). Full: 22 contract tests green, tsc clean.
Probes: scripts/dev/verify-insight-headlines.ts.

### B10d — THRESHOLD MATH (done)
Root cause: capability evidence bars are PER-CAPABILITY (60% or 65%, from
firmCapabilities badge minScore) but copy/charts hardcoded a single "60%".
firm_tier1_data_and_controls = {Data 65, Governance 65, Control 60} — mixed.
The FirmGapPlanCard drew a hardcoded threshold={60} "60% bar" chart line while
per-row meta said "under 65%" and the header called it the "top-quartile bar" —
three framings for one set of bars (Cam's "60% bar vs +N over 65%" flag).
Fix (per-row real bars everywhere; single line only when uniform):
- describeCapabilityBar(caps) in firmInsightEngine → "the 65% bar" | "their
  60–65% bars"; used in the data_and_controls headline caption + summary (was
  "the 60% threshold").
- FirmGapPlanCard: barLineFor(items) draws the RankedBars threshold line ONLY
  when every charted row shares one bar, else omits it (per-row meta carries the
  real bar). Header "top-quartile bar" → "their capability bar".
- firm insight detail RankedBars: capBarLine/capBarTitle computed from the real
  distinct thresholds; each row meta now "below 65% bar" (was bare "below").
Runtime (demo-firm-elite): data_and_controls "2 of 3 · their 60–65% bars"
(Data65✗/Gov65✓/Ctrl60✓); gap plan cleared 7/10 with rows "20 under 60%",
"12 under 65%" — count computed from the same displayed per-row thresholds.
Tests: tests/threshold-math.contract.test.ts (7). 13 green w/ 10c, tsc clean.

### B10e — 3 RE-VERIFIED REGRESSIONS (done)
(1) Product-intel face card divergence line: the face card passed the FULL
directional callout ("15 pt divergence · firms read this product lower…") which
overran the compact pill. Added VendorProductGapCallout.magnitudeLabel ("N.N pt
divergence"); face card (product-insight/page.tsx) now uses magnitudeLabel, the
detail hero keeps the full directional .label.
(2) Self-reported puzzle-piece text overrun: in AlignmentBoardClient PuzzlePiece
the "#N · Self-reported" rank/tier line had NO clamp (title/subtitle did) and the
text container had no overflow-hidden, so the wide uppercase "SELF-REPORTED" tag
spilled past the border. Added overflow-hidden to the container + w-full truncate
+ tighter tracking on the rank line.
(3) Vendor alignment Elite pane contradictory stale prose (B8-8): on a LIVE
(tier-1) insight's ?surface=elite the surfaceContent still built the old
"not yet live / should stay unavailable / not claiming benchmark" placeholder,
contradicting the live "Elite Insights are live" pane on the same page. Non-locked
elite surface now affirms the live Elite layer; parameterized
buildAlignmentEvidenceProvenanceItem so the elite closing drops the Pro-only
"not claiming benchmark/projection/scenario" disclaimer. Locked (tier-2) keeps
the honest locked boundary. Runtime: 0 contradiction fragments (was ≥1).
Tests: tests/regression-10e.contract.test.ts (3) + magnitudeLabel test in
vendor-insight-visuals. 32 contract tests green across the 5 files, tsc clean.
NOTE: (1)+(2) are visual — confirm on the running :3005 at the checkpoint.

### BLOCK 10 CHECKPOINT — COMPLETE (2026-07-11)
All of 10a-10e committed (ea6172fe, b3f51381, 141885fe, ca1becd8, ce7d0489) +
checklist 0c199394. Full chain: lint:test clean · tsc clean · test:unit 782/782
· 32 Block-10 contract tests green. Rebuild BUILD_ID i6VTZf5TZy8mA7w2VMr47.
Verified on RUNNING :3005 (build+flags printed): asset-integrity PASS
(served==disk==fingerprint); A1 canonical taxonomy, A4 fit 2/1/3, A5 4 gap areas,
C1 face==hero ("2 of 3"), C2 6 distinct headlines, C3 "60–65% bars" per-row,
D2 pro=PRO, D5 both Elite=ELITE/ACTIVE, E1 concise divergence, E2 contained
self-reported piece, E3 no elite-pane contradiction. Screenshots in
artifacts/block10-shots/. Regression checklist: PATALIGN-MEMORY/REGRESSION-CHECKLIST.md.
BOTH PORTS restored on the new build (:3000 launchd + :3005 review), asset-integrity
PASS on both. GOTCHA logged: after a local `pnpm build`, expected-live-release
advances but last-known-good does NOT, so com.c2acct.app's source-integrity gate
(last_known_good_release_not_current) exit-1s until `pnpm release:promote-known-good`.
NEXT: Block 11 (visual unification) — 11a firm-side card law → shared components,
11b V1 percentile BAND rows, 11c band chips off face cards, 11d insight click UX,
11e Pro product-insight Elite toggle. Then hybrid Elite depth, sandbox multi-piece,
QBANK v1.1 (own pass; approval still HELD pending CPA name).

### BLOCK 11 (VISUAL UNIFICATION) — partial checkpoint (2026-07-12)
DONE + committed + verified on :3005 (BUILD_ID AKfI20sxwYdQsbIt_gQTP):
- 11a (1ed78bc7): portal + consultant cards unified to the pat-card law
  (PortalSurfaceCard dropped rounded-[24px]/bg-white; EcosystemListCard adopted
  pat-card). Verified: vendor home cards match insight cards.
- 11c (f0456c44): score-band chips OFF face cards (vendor-alignment + vendor-
  product Pro cards) — number + one line only; band stays in detail hero.
  Verified: alignment cards show "54 · Operating discipline…", no chip.
- 11d part 1 (60637b6a): product-insight defaults to Evidence (data) pane +
  toggle leads with it (was Help-first). Firm/vendor-alignment already Pro-first.
- N1 (d52600a3 + ensureCompany b20384ea): every demo replica carries a region
  tag (r0 → " · National"); no more bare "Montrose Partners" vs "· Central"
  collision. ROOT FIX: ensureCompany now resolves by stable id first (name-derived
  keys made renames orphan firms). One-time cleanup of 44 orphan firms + cascade,
  benchmarks recomputed (12 firm/7 vendor runs), elite accounts re-adopted from
  the clean 176-firm cohort. Verified: sales-card firms all region-tagged, fit 2/2/2.
- N2 (d52600a3): firm tier-2 elite locked-copy contradiction fixed
  (buildFirmLockedInsightDetailSurfaceContent entitlement-aware; page chrome
  consistent). Verified: entitled firm sees live Trajectory, no "not available yet".
STILL OPEN (Block 11):
- 11b: V1 Category Position — replace bell curves with F1-style percentile band rows.
- 11d part 2: in-page expansion (sales-card-style) — client-architecture change,
  UX choices worth Cam's confirm (how much expands inline, keep full page?).
- 11e: Pro product-insight Elite toggle + honest locked preview — product decision
  (show the toggle for entitled too, given there is no live product Elite?).
Both ports serving AKfI build (:3000 launchd + :3005 review), integrity PASS.
Screenshots: artifacts/b11-shots/.

### BLOCK 11 — COMPLETE + CHECKPOINT GREEN (2026-07-12)
All sub-blocks done+committed+verified on running :3005 (BUILD_ID iJjTwaEH2ZEgRnDl2Pe0U,
HEAD 8d49dc4). Commits: 11a 1ed78bc7 · 11c f0456c44 · 11d-1 60637b6a · N1/N2 d52600a3 +
ensureCompany b20384ea · 11b 060ed252 · 11e 29565414 · 11d-2 ea859080 · checklist 39481c8a.
Verified: F1 card law (portal+consultant → pat-card), F2 no face-card band chips,
F3 inline Pro-readout expansion + Open full view, F4 Category Position F1-style
percentile band rows (bell curve removed), F5 non-entitled Elite upsell only,
F6 region-tagged replica names + entitlement-consistent firm elite copy.
Full chain: lint clean · tsc clean · test:unit 789/789 · Block-11 contract tests green
(insight-click-ux + updated vendor-product-insight/firm-unlocks). Demo clean at
176 firms/32 vendors, 0 orphans. Both ports serving, integrity PASS restart-safe.
Regression checklist now has F (visual unification) + LANDMINES (L1-L5) sections.
Screenshots artifacts/b11-shots + b11cp-shots.
NEXT (Cam order): Mythos live sweep → hybrid Elite depth layers (fills Elite panes +
flips 11e live for Elite in same commit) → sandbox utility lanes + multi-piece swap →
Demand Signals / Gap Map expansions → QBANK v1.1 (approval HELD; signatures follow
founders review; email out with v1.1 docx exports).

