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
