# Block 20 — PROD-DEPLOY READINESS (feature/engagement-v1)

**Status:** DOCUMENTS + PROOFS ONLY. Nothing here deploys. No migration runs
without Cam's explicit go and Cam's hands on the DIRECT_URL command.
**Date:** 2026-07-21 · **Branch:** `feature/engagement-v1` · **HEAD:** `78247050`
**Prod baseline:** Block 15 `6ad96a73` (LIVE on patalign.com; last prod migrate
applied `20260717000000` clean per the 2026-07-14 founders-preview ledger).
**Held/blocked (unchanged):** F15-0b blocked on Cam's C2Acct creds · F13 held.

> Reviewer note (Mythos): four deliverables below — (1) migration plan,
> (2) flag-parity proof plan, (3) updated deploy-night checklist, (4) 25-criteria
> evidence re-run. Ends at a checkpoint. Two items flagged **[NEEDS CAM]** require
> a live read only Cam can do (prod `migrate status`, `vercel env ls production`).

---

## 1. Migration plan

### 1.1 What prod lacks

Prod's migration HEAD is `20260717000000_add_survey_module_pillar` (shipped inside
Block 15 `6ad96a73`; the 2026-07-14 ledger records Cam applying it clean on Neon).
Verified three independent ways: git ancestry (`git merge-base --is-ancestor`),
migration-name ordering, and the July-14 deploy ledger.

**Exactly two migrations postdate the prod baseline. Both are on this branch:**

| # | Migration | Introduced by | Objects | Additive? |
|---|-----------|---------------|---------|-----------|
| 1 | `20260718000000_add_cadence_config` | 16d `f5341755` | `CREATE TABLE CadenceConfig` + 1 unique index + 1 FK→`Company` (ON DELETE CASCADE) | **YES** |
| 2 | `20260719000000_add_nudge_draft` | 16c `07f26c61` | `CREATE TABLE NudgeDraft` + 2 indexes + 1 FK→`Company` (ON DELETE CASCADE) | **YES** |

**"Anything else": no.** Blocks 16a/16b/16e/16f/16g/17/18/19 added **no** schema
migrations — they consume already-present columns/tables. The only two schema
deltas on the whole branch are the two above. (The elite/governance migrations
`20260708…20260712` and `20260717` are already in prod — all are ancestors of
`6ad96a73` and the July-14 ledger confirms them applied.)

### 1.2 Additive proof (both migrations)

Both files are `CREATE TABLE` + `CREATE INDEX` + `ADD CONSTRAINT … FOREIGN KEY`
only. **Zero** `ALTER TABLE … DROP`, `ALTER COLUMN`, `DROP`, `TRUNCATE`, or data
backfill. Neither touches an existing table's shape; the only reference to an
existing table is an outbound FK to `Company(id)`. New tables are born empty and
carry app-level defaults (`status DEFAULT 'PENDING'`, `aiGenerated DEFAULT true`,
etc.). Absence of a `CadenceConfig` row = system-default cadence (resolved in
`lib/cadence.ts`); absence of a `NudgeDraft` row = nothing sent (no auto-send path
exists — a draft becomes a Notification only via `decideNudgeDraft`'s approve
branch, itself PINGS-gated). **Conclusion: forward-only, non-destructive, safe to
apply against live prod with zero downtime and no read/write contention on
existing tables.**

Rollback of the schema itself is not required on abort (empty additive tables are
inert), but if Cam wants a clean revert the drop is trivial and isolated — see 1.4.

### 1.3 Exact commands for Cam (prod migrate — Cam's hands, DIRECT_URL)

This mirrors the **proven** July-14 split exactly (migration gate BEFORE any data
step; DIRECT_URL / non-pooled because the pooler breaks migration advisory locks).
Run from `/Users/camerongarrett/work/c2acct-live` on the branch/commit being
deployed.

```bash
# 0. Confirm you are on the deploy commit and the tree is clean.
git -C /Users/camerongarrett/work/c2acct-live status --short   # must be empty
git -C /Users/camerongarrett/work/c2acct-live rev-parse --short HEAD

# 1. [NEEDS CAM] Pre-flight: what does prod actually think it has applied?
#    This is the authoritative check — supersedes this doc's inference.
set -a; source .env.prod; set +a
DATABASE_URL="$DIRECT_URL" node --import tsx scripts/prisma-safe.ts migrate status
#    EXPECT: "Following migration(s) have not yet been applied:
#             20260718000000_add_cadence_config
#             20260719000000_add_nudge_draft"
#    and NOTHING about drift / failed / partial. If it lists more than these two,
#    STOP and reconcile before applying.

# 2. Apply (forward-only, DIRECT_URL).
set -a; source .env.prod; set +a
DATABASE_URL="$DIRECT_URL" node --import tsx scripts/prisma-safe.ts migrate deploy
#    EXPECT: "Applying migration 20260718000000_add_cadence_config"
#            "Applying migration 20260719000000_add_nudge_draft"
#            "2 migrations applied clean, no partials"

# 3. Re-verify schema at the DB layer BEFORE any app/data step (July-14 rule:
#    migration gate then a data-bearing read on a migrated object).
DATABASE_URL="$DIRECT_URL" node --import tsx scripts/prisma-safe.ts migrate status   # → "up to date"
#    plus one Prisma read that touches a migrated table, e.g. a count:
DATABASE_URL="$DIRECT_URL" node --import tsx -e \
  'import{PrismaClient}from"@prisma/client";const p=new PrismaClient();(async()=>{console.log("CadenceConfig",await p.cadenceConfig.count(),"NudgeDraft",await p.nudgeDraft.count());await p.$disconnect();})()'
#    EXPECT: "CadenceConfig 0 NudgeDraft 0" with NO P2021/P2022 (table/column missing).
```

**Secret hygiene:** secrets are sourced from `.env.prod` at run time (`set -a;
source .env.prod`), never inlined. `DATABASE_URL="$DIRECT_URL"` overrides the
pooled URL for the migrate only. Do not paste the connection string into shell
history or this doc.

**Neon connection caveat (see also §3, E8):** run the two probe commands and then
`$disconnect` — ad-hoc `tsx` probes leak query-engine processes and can trip Neon
P2037 "too many clients," which then blocks the deploy's later seed steps. `pkill
-f 'query-engine'` if you spawned several.

### 1.4 Isolated rollback (only if Cam wants the tables gone)

Not required on abort (empty tables are inert and the app tolerates their
presence with flags off), but if a clean revert is wanted:

```bash
set -a; source .env.prod; set +a
DATABASE_URL="$DIRECT_URL" node --import tsx -e \
  'import{PrismaClient}from"@prisma/client";const p=new PrismaClient();(async()=>{await p.$executeRawUnsafe(`DROP TABLE IF EXISTS "NudgeDraft" CASCADE`);await p.$executeRawUnsafe(`DROP TABLE IF EXISTS "CadenceConfig" CASCADE`);await p.$disconnect();})()'
# then reconcile _prisma_migrations if you want migrate status clean:
#   DELETE FROM "_prisma_migrations" WHERE migration_name IN
#   ('20260719000000_add_nudge_draft','20260718000000_add_cadence_config');
```

App rollback (code) is the git revert of the deploy commit + redeploy — the tables
can stay; they are only referenced under dark flags.

---

## 2. Flag-parity proof plan

### 2.1 The honest framing

**Flag-off does NOT make this deploy byte-equivalent to today.** The branch
carries deliberate **live** surface changes that ride an already-on flag
(`PAT_ENABLE_BATTLECARD`) or no flag at all. Parity must therefore be split into
two proofs:

- **A. Dark-surface parity** — surfaces gated by flags that stay OFF must render
  *nothing new*; flag-off prod is byte-equivalent on these routes.
- **B. Intentional live deltas** — a small set of changes ship the moment prod
  deploys regardless of flags. These get **positive render-proof** (they are
  correct and intended), not parity-proof. Mythos must sign off that each live
  delta is a *wanted* change for this deploy.

### 2.2 Flag inventory + required prod values (all dark surfaces OFF)

The ping system uses a **master + dependent** structure (`lib/patAssistant/flags.ts`):
`PAT_ENABLE_PINGS` is the master; staleness and email are dependent switches that
require PINGS *and* their own flag. So PINGS-off alone dark-gates 16c/16e/16f/16g.

| Flag (env var) | Required prod value | Gates (block) | Guard site |
|---|---|---|---|
| `PAT_ENABLE_PINGS` | **OFF / unset** | 16c nudge queue, 16e consultant freshness board, 16f vendor review-refresh, 16g firm benchmark artifact | `isPingsEnabled()` — `lib/patAssistant/flags.ts:32` |
| `PAT_ENABLE_STALENESS_ALERTS` | **OFF / unset** | 16b + 17-C staleness generators/sweep | `isStalenessAlertsEnabled()` (requires PINGS too) — `flags.ts:51`; sweep NOOP at `lib/notifications/staleness/runStalenessSweep.ts:343` |
| `PAT_PINGS_EMAIL_ENABLED` | **OFF / unset** | real outbound ping email | `isPingsEmailEnabled()` (requires PINGS too) — `flags.ts` |
| `PAT_ENABLE_NEW_FRONT_DOOR` | **OFF / unset** | 19 V7 front door | `isNewFrontDoorEnabled()` — `lib/frontDoor.ts`; branch at `app/page.tsx:16` |
| `PAT_ENABLE_ALIGNMENT_BOARD` | **OFF / unset** | 18-F14 consultant scoped board | `isAlignmentBoardEnabled()` — `lib/alignmentBoard.ts:36`; honest-empty at the board page |

Every guard is the same `=== "1"` presence convention and fails closed (unset →
false). No new flag defaults to on.

**[NEEDS CAM] Confirm current prod values via `vercel env ls production`** — the
local `.vercel/.env.production.local` pull is **stale (2026-07-07, pre-Block-15)**
and must not be trusted. The five flags above must all read OFF/unset in prod
before deploy. (Do not change `PAT_ENABLE_CONSULTANT_ACCESS` — it is ON for the
pilot and the consultant portal is the launch-story centerpiece; the *panels*
inside it are PINGS-gated, so it stays on and stays parity-safe.)

### 2.3 Dark-surface parity checks (Proof A — Mythos runs post-deploy)

For each route below, with the gating flag OFF, the rendered surface must be
byte-equivalent to the pre-deploy render. Method: fetch pre-deploy (baseline) and
post-deploy HTML for the authed role and diff; expect empty diff (modulo the
Next.js random `BUILD_ID`, which is the known cosmetic cache-bust — see §4).

| Route | Role | Flag OFF | Expected |
|---|---|---|---|
| `/` (public front page) | signed-out | NEW_FRONT_DOOR | Existing front page, unchanged (V7 not rendered — `app/page.tsx:16` early-returns only when on) |
| `/consultants` | consultant | PINGS | No nudge-approval panel, no freshness board (`app/consultants/page.tsx:53`) |
| `/vendor/review-refresh` | vendor | PINGS | `notFound()` → 404 (`page.tsx:63`) |
| `/firm/benchmark` | firm | PINGS | `notFound()` → 404 (`page.tsx:28`) |
| `/consultants/ecosystems/[e]/firm/[f]/alignment-board` | consultant | ALIGNMENT_BOARD | Honest-empty hero, no board (`page.tsx:61`) |
| Ping/staleness sweep | agent | STALENESS_ALERTS | `runStalenessSweep()` returns `NOOP_SUMMARY`; **zero** rows written to `Notification` / `NudgeDraft` |

Residual-surface note for Mythos: the `NudgeDraft` **API routes** exist regardless
of PINGS (auth-gated to consultant/admin). Prove inert: with PINGS off there is no
UI entry point and no auto-send; a direct authed POST creates a `PENDING` draft
that can never dispatch (no approve UI). Recommend a one-line probe that a POST →
draft stays `PENDING` and produces no `Notification`.

### 2.4 Intentional live deltas (Proof B — positive render-proof, NOT parity)

These change prod behavior on deploy. Mythos must confirm each is wanted.

| Delta | Block | Rides | Live because | Positive check |
|---|---|---|---|---|
| Freshness chips on vendor BattleCard rows + product-insight page | 16a | `PAT_ENABLE_BATTLECARD` (on) / PRO page (no flag) | Chip renders unconditionally in firm rows (`VendorBattleCardClient.tsx:176`) | Elite/Pro vendor sees freshness chips; label copy correct; no chip when `assessmentCount===0` |
| BattleCard v2 anatomy (4 grounded blocks) + customer-lexicon sweep | 17-B | `PAT_ENABLE_BATTLECARD` (on) | Anatomy renders inside the Elite entitled branch unconditionally (`VendorBattleCardClient.tsx:326`) | Elite vendor expansion shows the 4 blocks; Pro sees "Reveal with Elite" upsell (no anatomy); zero internal-vocab leaks (canary/off-ramp/…) |
| Delta re-assessment "what changed?" link | 16d | no flag | Renders for completed modules (`app/firm/alignment-assessment/page.tsx:84`) | Firm with a completed module sees the link; routes to the delta flow |
| Sign-in form same-origin redirect fix | 17-A | no flag | Unconditional auth fix (`lib/auth/pilotPasswordActions.ts:74`) | Provisioned-pilot sign-in lands on the workspace with no silent bounce (the bug it fixes) |

**Deploy hinges on §2.2 [NEEDS CAM]:** if `PAT_ENABLE_BATTLECARD` is *off* in prod,
16a + 17-B become dark too and move to Proof A. Evidence strongly indicates
BATTLECARD is ON (Block 13k Bridgepath BattleCard shipped prod-green), so treat
16a/17-B as live deltas unless the `vercel env ls` read says otherwise.

### 2.5 Parity verdict statement (for the ledger)

> With PINGS, STALENESS_ALERTS, PINGS_EMAIL, NEW_FRONT_DOOR, and ALIGNMENT_BOARD
> all OFF, every Block 16b/16c/16e/16f/16g/18-F14/19 surface is byte-equivalent to
> the pre-deploy render (Proof A). The deploy intentionally ships four live deltas
> (16a freshness, 17-B BattleCard v2, 16d delta link, 17-A sign-in fix) that are
> product changes for this release, each positively render-verified (Proof B).

---

## 3. Deploy-night checklist (updated — supersedes the July one)

The July founders-preview ledger checklist is the base; folded in below are **E8
Neon usage check**, the **L1/L2 known-good promote rules**, and the
**quiesce-automation law**. Cam runs everything touching prod; Claude drives the
cloud-build gates only.

### Phase 0 — Freeze & quiesce (LAW: do this FIRST)
- [ ] **Q1. Quiesce shared-DB automation.** The sibling `~/dev/c2acct` runs all
  `com.aae.c2acct.*` launchd jobs against the **same** Neon (localhost:5433 shares
  one DB across both checkouts). Bootout before the deploy/verify window or it can
  wipe/mutate review + demo data mid-deploy:
  ```bash
  launchctl bootout gui/$(id -u)/com.patalign.agent-supervisor   # writer to Neon
  launchctl bootout gui/$(id -u)/com.patalign.telegram-bot
  # + any com.aae.c2acct.* jobs under the sibling checkout
  launchctl list | grep -E 'patalign|c2acct'                     # confirm gone
  ```
- [ ] **Q2. Quiesce build-gate racers.** `com.c2acct.app` (:3000) + its watchdog
  rebuild `.next` and race the launch gates (E7-class incident). Stop them BEFORE
  any build/promote step, restart them LAST. (`validate:launch`'s restart-app.sh
  needs the app loaded — exit 113 if you restart too early.)
- [ ] **Q3. Scope freeze confirmed** — blockers-only through launch; HEAD is the
  intended deploy commit; tree clean.

### Phase 0.5 — GO-0: Production env-scope reconcile (GATED — Cam's explicit GO)
Added 2026-07-23 after the env-scope drift finding (see
`docs/incidents/2026-07-23-prod-env-scope-drift.md`). Vercel binds env at build
time, so the live deployment serves its build-time values while the Production
*scope* — what the next deploy inherits — had drifted to `BATTLECARD=OFF` /
`CONSULTANT_ACCESS=OFF`. Deploying against the drifted scope would regress those
live surfaces to dark. Reconcile BEFORE Phase 1.
- [ ] **R0. [GATED: GO-0]** Set the two must-be-ON flags in Production scope:
  ```bash
  vercel env rm  PAT_ENABLE_BATTLECARD        production --yes
  printf 1 | vercel env add PAT_ENABLE_BATTLECARD        production
  vercel env rm  PAT_ENABLE_CONSULTANT_ACCESS production --yes
  printf 1 | vercel env add PAT_ENABLE_CONSULTANT_ACCESS production
  ```
- [ ] **R1. Value-check confirm — via dashboard / rendered surface, NOT `env pull`**
  (pull returns empty for encrypted vars here — see the incident). Confirm
  **`BATTLECARD=1, CONSULTANT_ACCESS=1`** in the Vercel dashboard; dark flags off;
  authoritative proof is the Phase-4 preview rendering BattleCard + consultant.
  ⚠ 2026-07-27: GO-0 was executed on a FALSE drift premise (the read method was
  invalid). Both flags were re-set to `1`; verify via dashboard/preview before --prod.

### Phase 1 — Pre-flight proofs (local, on the deploy commit)
- [ ] **P1.** `pnpm lint:test` · `pnpm typecheck` · `pnpm test:unit` green.
- [ ] **P2.** Full `pnpm validate:launch` chain green on this commit (or a
  documented ancestor within a couple of no-op commits — never claim UNVERIFIED as
  pass).
- [ ] **P3. L1/L2 known-good promote rules** (`docs/release/release-promotion.md`):
  - **L1 = last-known-good** auto-promotes on chain pass via
    `release:promote-known-good` (fires even on freshness-skip). Confirm
    `artifacts/mac-mini/state/last-known-good-release.json` == HEAD fingerprint.
  - **L2 = previous-known-good** is preserved for rollback
    (`previous-known-good-release.json`). Confirm it holds the CURRENT prod
    release-id before deploy, so a one-move rollback is available.
  - App service will not come up on a build unless last-known-good is promoted AND
    the tree is clean (empty-log exit-1 trap) — verify before Q2 restart.
- [ ] **P4. E8 — Neon usage check (NEW).** Before touching prod DB: open the Neon
  dashboard and confirm headroom — compute-hours/quota not near cap, autoscaling
  not throttled, and **active connections low**. Kill any leaked local query
  engines (`pkill -f 'query-engine'`) so the migrate + seed steps don't hit
  **P2037 "too many clients."** This is the gate that has bitten seeding before.

### Phase 2 — Migration gate (Cam's hands, DIRECT_URL — BEFORE all data)
- [ ] **M1.** `migrate status` pre-flight → exactly the two pending migrations
  (§1.3 step 1). If more, STOP.
- [ ] **M2.** `migrate deploy` (DIRECT_URL/non-pooled) → 2 applied clean, no
  partials.
- [ ] **M3.** Re-verify: `migrate status` up-to-date + a data-bearing Prisma read
  on a migrated table (`CadenceConfig`/`NudgeDraft` count, no P2021/P2022).

### Phase 3 — Flag confirmation (Cam) — VALUE-CHECK (corrected 2026-07-27)
**`vercel env pull` is INVALID for value-checking this project's encrypted vars** —
it returns EMPTY for every encrypted var (proven 2026-07-27: a known-ON flag and a
freshly-set probe both pulled empty; see
`docs/incidents/2026-07-23-prod-env-scope-drift.md`). `vercel env ls` gives presence
only. **The only valid value-checks are the Vercel dashboard (value field on edit) or
the rendered surface of a preview/prod deployment.**
- [ ] **F1. [NEEDS CAM] Value-check via dashboard AND/OR rendered surface** — confirm
  `PAT_ENABLE_BATTLECARD=1` and `PAT_ENABLE_CONSULTANT_ACCESS=1` in the Vercel
  dashboard; the dark flags (`PINGS/STALENESS_ALERTS/PINGS_EMAIL/NEW_FRONT_DOOR/
  ALIGNMENT_BOARD`) confirmed off there too. **Authoritative:** the Phase-4 preview
  (built from current scope) must render BattleCard + the consultant portal → proves
  the two flags are effectively on. Never trust a CLI `env pull` value here.

### Phase 4 — Cloud build → promote (proven split)
- [ ] **B1.** Claude drives cloud-build **preview** → Ready.
- [ ] **B2.** Preview passes the SSO gate (302 → sso-api + `_vercel_sso_nonce`).
- [ ] **B3.** Cam promotes `--prod`; alias `patalign.com`.

### Phase 5 — 4 prod gates (post-deploy)
- [ ] **G1. Release/fingerprint gate** — `/api/release-fingerprint` + `/release`
  serve the expected release-id; `served == expected` (gate by served buildId, not
  local `.next/BUILD_ID` — `asset-integrity` false-FAILs on cloud-build prod).
- [ ] **G2. Route gate** — `/`, `/sign-in`, `/vendor`, `/firm`, `/consultants`,
  `/admin` serve the expected release; no forbidden AAE markers on `/`.
- [ ] **G3. DB gate** — `/api/health/db` 200 + a data-bearing route read.
- [ ] **G4. Browser gate** — authed render sweep of each portal on the RUNNING
  prod URL with build+flag state printed (fetch-verified, not test-context).

### Phase 6 — Parity + delta proof (Mythos, §2.3–2.4)
- [ ] **PA.** Proof A dark-surface parity: 6 routes byte-equivalent; sweep writes
  zero rows.
- [ ] **PB.** Proof B live deltas: 4 deltas positively render-verified.

### Phase 7 — Un-quiesce & close
- [ ] **Z1.** Re-bootstrap `com.patalign.agent-supervisor` + `telegram-bot`;
  verify the supervisor heartbeat file advances (`supervisor-heartbeat.json`) —
  kickstart does NOT reload env after a Neon rotation; re-render the plist if
  secrets rotated.
- [ ] **Z2.** Restart `com.c2acct.app` + watchdog LAST; `pnpm asset-integrity`
  (served BUILD_ID == disk == fingerprint, assets 200).
- [ ] **Z3.** Re-boot any `com.aae.c2acct.*` sibling jobs.
- [ ] **Z4.** Write the deploy ledger (commit, release-id, migrations applied,
  flag values, gate results, rollback pointer L2).

### Rollback (one move)
```bash
mv artifacts/mac-mini/state/previous-known-good-release.json \
   artifacts/mac-mini/state/last-known-good-release.json   # restore L2→L1
pnpm launch:proof                                          # regen bucket map
# code: git revert <deploy commit> + redeploy; DB tables can stay (dark, inert)
```

---

## 4. Release-criteria evidence re-run — remapped onto the canonical list

**Canonical source (Mythos-supplied):** `~/work/PATALIGN-RELEASE-CRITERIA-2026-07-23.md`
(prepared 2026-07-16 for Cam's signature). My earlier reconstructed-25 is
**superseded** by this remap. A re-dated draft for signature is at
`docs/release/PATALIGN-RELEASE-CRITERIA-DRAFT-launch-TBD.md` (see §4.3).

### 4.0 Divergences from the canonical doc (read first)

1. **Count.** The canonical doc carries **30** evidence-cited criteria in §2
   (S1–6, D1–6, P1–6, R1–5, G1–5, X1–2), not 25. Whichever "25" was in mind, the
   full §2 set is 30; all 30 are remapped below.
2. **Axis.** My reconstructed 25 was organized by *validation-chain step*; the
   canonical is organized by *product concern* (Security / Data / Platform /
   Product / Governance / Docs). The chain steps (lint/type/unit/build/e2e) are the
   canonical doc's *test basis* underlying P1–P5 + R5, not separate criteria.
3. **Prod-state staleness.** The canonical header says prod serves `eb6bfb6`
   (Block 14) with "Block 15 in flight." **Prod is now Block 15 `6ad96a73` LIVE**;
   engagement-v1 (Blocks 16–19) is the *new* candidate. Header + §5 rollback target
   (`eb6bfb6`) are stale — fixed in the re-dated draft.
4. **Calendar staleness.** Launch `July 23`, dry-run `July 20`, deploy-night
   `July 21`, launch-morning smoke `July 23` are all moot at 2026-07-21 with the
   engagement-v1 deploy still pre-go. New launch date is **TBD-pending-vendor**.
5. **SCOPE CHANGE — the material divergence (§139 standing rule).** The canonical
   doc **DEFERS in §4** several things engagement-v1 now **ships**. Its standing
   rule: *"any scope change after signing … requires a new line item … before it
   ships. No silent additions."* Because the doc is still **unsigned**, the clean
   fix is to fold these into §2 of the re-dated draft as first-class criteria — not
   post-signature amendments. Deferrals now in scope:
   - **F12 → 17-B** BattleCard v2 anatomy (was "first item after July 23") — ships
     LIVE under `PAT_ENABLE_BATTLECARD`.
   - **F14 → 18-F14** consultant scoped board (was "13a wall stands until built") —
     ships DARK under `PAT_ENABLE_ALIGNMENT_BOARD`.
   - **Block 16 → 16a–16g** engagement generators (was "generators deliberately
     absent so no unreviewed AI outbound") — ship DARK under PINGS/STALENESS. The
     G2/G3 premise ("no generators exist at launch") no longer holds literally;
     re-ruled below.
   - **19 V7 front door** — **not in the canonical doc at all** — ships DARK under
     `PAT_ENABLE_NEW_FRONT_DOOR`.
   - **16a freshness chips / 16d delta link** — new live surfaces, no prior line.

### 4.1 The 30 canonical criteria — verdict at HEAD `78247050`

Legend: **STANDS** = unaffected by engagement-v1, covered by the standing
regression run. **RE-VERIFY** = branch moved / new surface / new migration — re-run
before or at deploy (gate refs are §3 phases). **[NEEDS CAM]** = live read.

| # | Canonical criterion | Verdict for the engagement-v1 deploy |
|---|---|---|
| S1 | Role walls per portal | **RE-VERIFY** — 18-F14 adds a consultant board (dark); confirm walls intact via G4 sweep |
| S2 | No dev/diagnostic leaks on sign-in | **STANDS** |
| S3 | Auth paths; `/sign-in` canonical; authed→home | **RE-VERIFY** — 17-A changed the sign-in redirect; confirm canonical + provisioned auth + no bounce (G4) |
| S4 | Local-review auth cannot run on prod | **STANDS** |
| S5 | Cross-tenant isolation / wrong-audience 404 | **RE-VERIFY** — new routes `/vendor/review-refresh`, `/firm/benchmark`, alignment-board must `notFound`/honest-empty when dark (Proof A) |
| S6 | Credential hygiene | **STANDS** |
| D1 | Face==detail; Elite⊇Pro; trajectory==index | **RE-VERIFY** — 16a chips + 17-B anatomy add numbers to the BattleCard; confirm equalities hold (Proof B) |
| D2 | Boundary walls; demo never leaks | **RE-VERIFY (light)** — new `CadenceConfig`/`NudgeDraft` born empty; confirm no demo leak |
| D3 | Suppression floors untouched | **STANDS** |
| D4 | D0-PROD canonical counts asserted | **STANDS if no reseed** — RE-VERIFY only if a seed runs deploy-night |
| D5 | Demo Elite ELITE+ACTIVE after reseed | **STANDS if no reseed** |
| D6 | Orphan discipline (L6) | **STANDS** |
| P1 | Fingerprint honesty (served==baked) | **RE-VERIFY** — new deploy, G1 |
| P2 | Asset integrity (served==fingerprint) | **RE-VERIFY** — G1, cloud-build served==fingerprint |
| P3 | `/api/health/db` 200 | **RE-VERIFY** — G3 |
| P4 | Migration currency; migrate-before-data | **RE-VERIFY (core)** — 2 new migrations, §1 M1–M3; this deploy directly exercises the P4 rule |
| P5 | Deploy discipline (4 printed gates) | **RE-VERIFY** — follow the split, §3 Phase 4–5 |
| P6 | qa-smoke on true fingerprint | **RE-VERIFY** — post-deploy, confirm no stale pin (§3.2) |
| R1 | Every launch surface reviewable via 5 accounts | **RE-VERIFY** — Proof A (dark = renders nothing, satisfies the rule) + Proof B (live deltas reviewable) |
| R2 | Three-lane BattleCards balanced | **RE-VERIFY** — 17-B changes BattleCard anatomy; confirm lanes still balanced + anatomy correct (Proof B) |
| R3 | Honest empty/locked; no "coming soon" | **RE-VERIFY** — new dark surfaces must be honest-empty/`notFound`, not "coming soon" |
| R4 | Ask Pat grounded with sources | **STANDS** |
| R5 | One card grammar; no dev-speak (B1) | **RE-VERIFY** — 17-B lexicon sweep + anatomy; `customer-lexicon.contract` + `banned-vocabulary.contract` must stay green (Proof B) |
| G1 | Trust page governance copy | **STANDS** |
| G2 | AI-disclosure capability | **RE-VERIFY + RE-RULE** — canonical premise "no generators at launch" no longer literal; 16a–g generators exist but are flag-dark. Confirm disclosure wiring (`aiGenerated`, `PAT_AI_GENERATED_HEADER_*`) present so a future flag-flip discloses; PINGS-off ⇒ zero outbound ⇒ still no undisclosed AI by construction |
| G3 | HITL posture; no autonomous outbound | **RE-VERIFY + RE-RULE** — NudgeDraft is HITL (consultant approve, no auto-send); confirm no autonomous path even with generators present-but-dark |
| G4 | Banned-vocabulary enforcement | **RE-VERIFY** — 17-B adds anatomy strings; contract tests cover, re-run |
| G5 | Billing honesty (dark until 4 sigs) | **STANDS** — no billing code on branch |
| X1 | Manuals delivered (Founders' + Consultant) | **MET-WITH-NOTE** — manuals describe pre-engagement surfaces; if 16a/17-B alter the founders' demo, a manual addendum may be wanted (Cam call) |
| X2 | Help corpus baseline (36 articles) live | **STANDS** — note: new surfaces may warrant help articles later (not a launch gate) |

### 4.2 Summary

Of the 30 canonical criteria: **19 RE-VERIFY**, **9 STANDS**, **1 MET-WITH-NOTE
(X1)**, **1 STANDS-with-later-note (X2)**. Two (G2, G3) additionally need a Mythos
**re-ruling** because engagement-v1 changes their stated premise (generators now
exist in code, dark). Two live reads gate the go (§1 `migrate status`, §2
`vercel env ls`). **None are known-failing on inspection** — every RE-VERIFY is
stale-evidence or a new-surface confirmation, not a red criterion.

### 4.3 Re-dated draft for signature

`docs/release/PATALIGN-RELEASE-CRITERIA-DRAFT-launch-TBD.md` — a faithful re-date of
the canonical doc with: launch/prepared/signature date fields → **TBD-pending-vendor**;
header prod-state → Block 15 `6ad96a73` live + engagement-v1 candidate; §5 rollback
target → `6ad96a73`; the five §4.0(5) scope items promoted from §4 deferrals into a
new **§2.7 Engagement-v1 additions (Blocks 16–19)** with evidence citations; the
July 20/21/23 calendar in §3 marked stale/TBD. **Not for signature until Cam sets the
vendor-driven date and Mythos completes Proof-A/B post-deploy.**

---

## 5. G2/G3 wiring evidence — targeting Mythos's PASS-AS-REWRITTEN bar

Premise as rewritten by Mythos: not "no generators exist at launch" but
**"generators exist but are PROVABLY INERT (G2) and PROVABLY GOVERNED (G3)."**
Every citation below verified against HEAD `78247050`. Two test-coverage gaps are
flagged honestly at the end — the *code* is correct at both sites; only the
contract *pins* are incomplete.

### G2 — PROVABLY INERT (flags off ⇒ nothing fires, nothing writes)

**G2.1 — Every generator persist path terminates in the PINGS/STALENESS guard.**
There are **exactly three** `createNotification` call sites in the codebase (grep
census, `lib app scripts`), and each sits behind a guard:

| Persist site | Guard that dominates it | Guard site |
|---|---|---|
| Ping sweep → `executePingPlan` (`lib/notifications/executePlan.ts:32`) | `if (!isPingsEnabled()) return NOOP_SUMMARY` | `lib/notifications/runSweep.ts:34` |
| Staleness sweep (`lib/notifications/staleness/runStalenessSweep.ts:360`) | `if (!isStalenessAlertsEnabled()) return NOOP_SUMMARY` (requires PINGS **and** STALENESS — `lib/patAssistant/flags.ts:51`) | `runStalenessSweep.ts:343` |
| Nudge approve (`lib/notifications/nudgeDraft.ts:180`) | HITL-only — no sweep/auto path (see G2.3) | n/a |

The scheduled agent runners **double-gate**: `scripts/agents/ping-sweep.ts:25–27`
and `scripts/agents/staleness-sweep.ts:26` both no-op and log `"skipped — … is
off"` on `!summary.enabled`. No fourth, unguarded persist site exists.

**G2.2 — Sweep returns NOOP and writes zero rows with flags off.**
- Ping: `tests/notifications-pingsweep.test.ts:34` — *"is a hard no-op when
  PAT_ENABLE_PINGS is off"* asserts `{ enabled: false, … created: 0 }`.
- Staleness: `runStalenessSweep` returns `NOOP_SUMMARY` (`created: 0`) at
  `runStalenessSweep.ts:343–344`. **[GAP-1]** no dedicated contract pins this,
  symmetric to the ping test (recommendation below).

**G2.3 — NudgeDraft API cannot dispatch without the approve branch.**
- The no-send guarantee is documented at `lib/notifications/nudge.ts:89–92`
  (*"…happens ONLY inside decideNudgeDraft's approve branch … no auto-send path…"*).
- `createNudgeDraft` (`nudgeDraft.ts:37–71`) writes a `PENDING` row and calls **no**
  `createNotification`.
- `decideNudgeDraft` (`nudgeDraft.ts:149–217`) is the single send path; it guards
  `if (draft.status !== "PENDING") return … already_decided` (`:161`) before the
  only `createNotification` (`:180`).
- Pinned by `tests/nudge-draft.contract.test.ts`: *"creates a PENDING draft and
  sends NOTHING"* (`:60`, `create` not called), *"already_decided drafts never
  re-send"* (`:81`), and the header contract *"(5) source-scan — no auto-send path
  exists in the code"* (`:8–11`).

### G3 — PROVABLY GOVERNED (every draft is AI-labeled + human-reviewed)

**G3.1 — Every drafted create carries `aiGenerated: true`.**
- Ping: `executePlan.ts:44`. Staleness: generator drafts `generators.ts:55/115/155`
  + the create at `runStalenessSweep.ts:371`. Nudge: PENDING draft
  `nudgeDraft.ts:65` (`aiGenerated: true`), and the approve-branch send propagates
  it — `nudgeDraft.ts:193` `aiGenerated: draft.aiGenerated` (always true). Sink:
  `store.ts` persists `aiGenerated: input.aiGenerated`.
- Pinned by `tests/pat-disclosure.contract.test.ts:43–46` (source-scan asserts each
  drafter contains `aiGenerated: true`) + `:50–52` (store persists it).
  **[GAP-2]** the scan list `patDraftedCreateSites` (`:36–41`) is `[executePlan.ts,
  nudgeDraft.ts]` — it **omits** `runStalenessSweep.ts`, whose create at `:371` is
  governed in code but not pinned by this test.

**G3.2 — Disclosure copy is exact and renders on every human-facing surface.**
- Copy: `lib/patDisclosure.ts:13` `PAT_DISCLOSURE_SHORT = "Pat (AI) · human-reviewed"`,
  pinned `pat-disclosure.contract.test.ts:27`. Email header
  `X-PAT-AI-Generated: "true; reviewed=human"`, pinned `:28–29`.
- Render sites (each `n.aiGenerated ? <disclosure>`): header bell
  `HeaderNotificationBell.tsx:188–190` (short), inbox
  `NotificationInboxList.tsx:107` (footer), consultant queue
  `NudgeQueue.tsx:115` (short) — pinned `pat-disclosure.contract.test.ts:57–63`.
- Trust-page promise: `lib/trustContent.ts:375` — *"Every Pat-drafted message is
  labeled as AI-drafted and human-reviewed. Pat never poses as a person."*

**G3.3 — Rendered-bell sweep.** Mythos's own 2026-07-20 sweep on both accounts
(the disclosure label present on rendered bells) — cited as Mythos-supplied
evidence; I did not re-run it (no live flag-on env here).

**G3.4 — Outbound-to-humans is HITL-only.** The only path that produces a
human-visible Notification from a nudge is `decideNudgeDraft`'s `approve` branch
after a consultant acts (G2.3). No volume/autonomous outbound seam exists.

### Verdict — bar fully met, both gaps CLOSED

Every G2/G3 citation in Mythos's bar **checks out** against HEAD, and the two
*test-coverage* gaps are now **pinned green** (2 files / 10 tests,
`vitest run`, 2026-07-21):
- **[GAP-1 CLOSED]** `tests/staleness-noop.contract.test.ts` — asserts
  `runStalenessSweep` → `{ enabled: false, … created: 0 }` and `createNotification`
  never called when `PAT_ENABLE_STALENESS_ALERTS` is off; symmetric to
  `notifications-pingsweep.test.ts:34`.
- **[GAP-2 CLOSED]** `pat-disclosure.contract.test.ts` `patDraftedCreateSites` now
  includes `lib/notifications/staleness/runStalenessSweep.ts`, pinning its
  `aiGenerated: true` (`:371`) like the other two drafters.

**Mythos ruling (2026-07-21): G2/G3 PASS-AS-REWRITTEN** — generators exist,
**provably inert** (guard sites + NOOP contract + zero-row pin) and **provably
governed** (aiGenerated propagation + disclosure copy pin + HITL-only outbound),
evidence fully test-pinned. The §2.7 additions are **confirmed as first-class
criteria**. The release-criteria draft is complete pending only Cam's vendor date
and the post-deploy Proof A/B run.

---

## Checkpoint — for Mythos review

This block produced documents + proofs, not a deployment. Requesting Mythos ruling
on:

1. **Migration plan (§1):** agree prod lacks exactly `add_cadence_config` +
   `add_nudge_draft`, both additive; command sequence approved for Cam.
2. **Flag-parity framing (§2):** agree with the A/B split — dark surfaces prove
   byte-equivalent, four live deltas (16a, 17-B, 16d, 17-A) are *intended* product
   changes needing positive proof, not parity. Confirm each live delta is wanted
   for this deploy.
3. **Deploy-night checklist (§3):** approve the folded-in E8 Neon check, L1/L2
   promote rules, and quiesce-automation law ordering.
4. **The canonical criteria (§4):** RESOLVED — remapped onto the 30-criterion
   canonical list (`~/work/PATALIGN-RELEASE-CRITERIA-2026-07-23.md`); divergences
   noted in §4.0 (count 30≠25, prod/calendar staleness, and the §139 scope-change:
   17-B/18-F14/16a–g/19 move from deferrals into §2). Re-dated draft produced.
   RESOLVED — Mythos re-ruled **G2/G3 PASS-AS-REWRITTEN** (2026-07-21) on the §5
   evidence with both test-coverage gaps pinned green; §2.7 additions confirmed as
   first-class criteria.

**Two live reads gate the go and only Cam can run them:** prod `migrate status`
(§1.3 step 1) and `vercel env ls production` (§2.2). Nothing deploys until both
read as expected and Mythos clears the checkpoint.

**Rollback (this block):** documents only — `git checkout -- docs/release/` /
delete `docs/release/block-20-prod-deploy-readiness-2026-07-21.md`. No runtime,
schema, or flag state was touched.
