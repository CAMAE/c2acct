# Proof-A / Proof-B execution runbook (engagement-v1 deploy)

**Purpose.** Operationalize the post-deploy verification defined in
`block-20-prod-deploy-readiness-2026-07-21.md §2` — the split that Mythos runs to
sign off the engagement-v1 release:
- **Proof A — dark-surface parity:** with the dark flags OFF, every unlaunched
  surface renders *nothing new*; flag-off prod is byte-equivalent to today.
- **Proof B — live-delta render-proof:** the four intended live deltas ship and
  are positively verified (not parity — they are the product changes this deploy
  makes).

**When to run.** After the engagement-v1 `--prod` promotion clears the 4 gates
(`§3` Phase 5), before the release is declared done. Owner: Mythos.

**Preconditions.**
- Prod at the deploy commit; 4 gates green (fingerprint / health-db / prisma-engine
  / asset-integrity).
- Flags read via `vercel env ls production` match `block-20 §2.2`: `PAT_ENABLE_PINGS`,
  `PAT_ENABLE_STALENESS_ALERTS`, `PAT_PINGS_EMAIL_ENABLED`,
  `PAT_ENABLE_NEW_FRONT_DOOR`, `PAT_ENABLE_ALIGNMENT_BOARD` all **OFF/unset**;
  `PAT_ENABLE_CONSULTANT_ACCESS` **ON** (unchanged); `PAT_ENABLE_BATTLECARD` **ON**.
- A **flag-off baseline** captured from the CURRENT prod (pre-deploy) for the
  Proof-A routes — see §A.1.

> **Baseline note (V7 revision, 2026-07-21).** The `/` flag-off baseline is
> **unchanged** by the V7 front-door revision (doors-up order, cohort-standing
> panel, inline arrow). V7 is flag-dark: with `PAT_ENABLE_NEW_FRONT_DOOR` off, `/`
> renders the untouched default page, byte-identical to before the revision. So
> the revision changes **no** Proof-A baseline and **no** Proof-B delta for this
> deploy. Its visual re-verify lives in the flag-flip appendix (§C.4) — to be run
> only if/when the front-door flag is flipped on.

---

## A. Proof A — dark-surface parity

Method: capture each route's flag-off render pre-deploy (baseline) and post-deploy,
then diff. Expected: empty diff **modulo the Next.js random `BUILD_ID`** (the known
cosmetic cache-bust — normalize it out before diffing). Roles use the 5 shared
review accounts (`firm-pro/firm-elite/vendor-pro/vendor-elite/consultant@c2acct.com`).

### A.1 Capture baselines (BEFORE deploy)
```bash
BASE=https://patalign.com                 # pre-deploy prod
OUT=artifacts/proof-ab/baseline           # mkdir -p first
# public + per-role. Authenticated fetches reuse the review-account cookie jar
# (see scripts/demo/prod-review-accounts.ts for creds; terminal-only).
curl -s "$BASE/" -o "$OUT/root.html"
# repeat for each Proof-A route below with the correct role cookie.
```

### A.2 Routes to prove byte-equivalent (flag OFF)

| # | Route | Role | Flag OFF | Expected (parity) |
|---|-------|------|----------|-------------------|
| A-1 | `/` | signed-out | NEW_FRONT_DOOR | Existing front page (V7 NOT rendered — no `data-testid="v7-front-door"`) |
| A-2 | `/consultants` | consultant | PINGS | No nudge-approval panel, no freshness board |
| A-3 | `/vendor/review-refresh` | vendor | PINGS | `notFound()` → HTTP 404 |
| A-4 | `/firm/benchmark` | firm | PINGS | `notFound()` → HTTP 404 |
| A-5 | `/consultants/ecosystems/[e]/firm/[f]/alignment-board` | consultant | ALIGNMENT_BOARD | Honest-empty hero, no board |
| A-6 | ping/staleness sweep | agent (dry) | STALENESS_ALERTS | `runStalenessSweep` → `NOOP_SUMMARY`; **zero** `Notification`/`NudgeDraft` rows |

### A.3 Diff + zero-row check (AFTER deploy)
```bash
# For each A-1..A-5: normalize BUILD_ID then diff baseline vs post-deploy.
norm(){ sed -E 's/[A-Za-z0-9_-]{21}/<BUILDID>/g'; }   # 21-char Next BUILD_ID
diff <(norm < baseline/root.html) <(norm < postdeploy/root.html) && echo "A-1 PARITY"
# A-6 zero-row (prod DIRECT_URL, read-only):
#   SELECT count(*) FROM "Notification" WHERE "createdAt" > '<deploy_ts>';  -> 0
#   SELECT count(*) FROM "NudgeDraft";                                      -> unchanged
```
**Residual-surface probe (NudgeDraft API):** with PINGS off there is no UI entry;
prove inert — an authed consultant `POST` to the nudge-draft route creates a
`PENDING` row that can never dispatch (no approve UI), and produces **no**
`Notification`. (Pinned by `tests/nudge-draft.contract.test.ts`; re-confirm live.)

**Proof-A PASS** = A-1..A-5 empty diff (modulo BUILD_ID) **and** A-6 zero rows.

---

## B. Proof B — live-delta render-proof

These four deltas ship on deploy regardless of flags (Mythos ruled all four WANTED,
2026-07-21). Positive render-verify each on the running prod URL with build+flag
state printed.

| # | Delta | Block | Role | Positive check |
|---|-------|-------|------|----------------|
| B-1 | Freshness chips on vendor BattleCard rows + product-insight page | 16a | vendor-elite / vendor-pro | Chips render with correct decay label; **absent** when `assessmentCount===0` |
| B-2 | BattleCard v2 anatomy (4 grounded blocks) | 17-B | vendor-elite | Elite expansion shows why-it-fits / risk-flags / discovery-Qs / objection-prep; **Pro** (vendor-pro) sees "Reveal with Elite" upsell, no anatomy; zero internal-vocab leaks (canary/off-ramp/…) |
| B-3 | Delta re-assessment "what changed?" link | 16d | firm-elite | Firm with a completed module sees the link; routes to the delta flow |
| B-4 | Sign-in same-origin redirect fix | 17-A | provisioned pilot | Sign-in lands on the workspace, no silent bounce (re-verifies criterion S3) |

**Proof-B PASS** = B-1..B-4 render as specified, incl. B-2's Pro/Elite wall and
lexicon-clean strings.

---

## Verdict recording

Append to the deploy ledger:
```
Proof A: PASS  (A-1..A-6, baseline <commit> vs prod <commit>, BUILD_ID normalized)
Proof B: PASS  (B-1..B-4, roles + screenshots)
Flags at proof time: PINGS/STALENESS/PINGS_EMAIL/NEW_FRONT_DOOR/ALIGNMENT_BOARD=off,
                     CONSULTANT_ACCESS/BATTLECARD=on
```
On any FAIL: it is a release blocker — do not declare done; forward-fix or roll back
per `block-20 §3` rollback (L2→L1 + `git revert`; the two additive tables can stay).

---

## C. Flag-flip re-verify appendix

Run the matching block **only when a dark flag is later flipped on** — at that point
the surface stops being parity-covered and needs its own positive proof + a new
release-criteria line per the standing rule (`PATALIGN-RELEASE-CRITERIA §6`).

### C.1 `PAT_ENABLE_PINGS` on
Re-verify: consultant nudge-approval panel + freshness board render; vendor
review-refresh + firm benchmark artifact resolve (not 404); every rendered ping
carries the **"Pat (AI) · human-reviewed"** disclosure (G2/G3 governance, see
block-20 §5). Confirm HITL: a nudge only reaches a firm user via `decideNudgeDraft`
approve.

### C.2 `PAT_ENABLE_STALENESS_ALERTS` on (requires PINGS)
Re-verify: `runStalenessSweep` fires, writes disclosed (`aiGenerated:true`)
notifications; send-ledger idempotency holds; counts-only cohort facts (no peer
identities).

### C.3 `PAT_ENABLE_ALIGNMENT_BOARD` on
Re-verify: consultant scoped read-only board renders under scoped authorization
(not a route exemption); the 13a role wall still holds for out-of-scope firms.

### C.4 `PAT_ENABLE_NEW_FRONT_DOOR` on — V7 front-door visual re-verify
**This is where the 2026-07-21 V7 revision gets re-verified** (it changes no proof
while flag-dark). When the front-door flag is flipped on, confirm on the running
prod `/`:
- **Section order:** nav → hero → **door cards** → radar panel → **cohort-standing
  panel** → trust → footer (doors above the charts; no scroll to reach them).
- **Cohort-standing panel:** second panel-card below the radar, product card-header
  grammar (PAT mark · divider · "Cohort standing" · "Peer view" chip), five pillar
  rows (peer band + top-decile tick + "you" dot), legend "Peers · Top decile · You".
  **Shape-only — zero numbers, zero percentile claims** (illustrative positions).
- **Door arrow:** inline arrow SVG, fixed 22px, centered in the circle chip (no
  off-center text glyph).
- **Data-free:** no fabricated scores/percentages anywhere on the front door.
- Full-bleed: the V7 nav/footer render once (no double app-shell header/footer).
- Contract pins backing this: `tests/v7-front-door.contract.test.ts` (section order,
  locked strings, inline-arrow, data-free, full-bleed escape).

### C.5 `PAT_PINGS_EMAIL_ENABLED` on (requires PINGS + provider)
Re-verify: real outbound only with a provider key + verified domain; each email
carries the `X-PAT-AI-Generated: true; reviewed=human` header (block-20 §5, G3.2).
