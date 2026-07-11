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
