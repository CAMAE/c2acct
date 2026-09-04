# DEPLOY-NIGHT — the runbook

**Status:** DOCS + SCRIPTS + TESTS. Nothing in this file deploys, flips a flag,
rotates a secret or promotes a build. The night is human-gated: it runs on a
date Cam picks, behind Cam's typed GO, one step at a time. This document turns
the night from a memory exercise into a checklist; the preflight
(`pnpm deploy-night:preflight`) turns the checklist's preconditions into a
PASS/FAIL table.

**Prod baseline at writing:** `0157d40` (live since 2026-07-28, untouched since —
confirm on the night at `/api/release-fingerprint`). **Branch:**
`feature/engagement-v1`. **Pending migrations since baseline:** six (Phase 4).
**Supersedes:** the Phase 0–7 checklist in
`docs/release/block-20-prod-deploy-readiness-2026-07-21.md` §3, which this
folds in; §1 (migration method) and §2 (flag parity) of that doc still apply.

---

## 0. How to run this runbook

- **One step, then verify, then the next.** Never batch rotations. Every step
  below carries DO / EXPECT / VERIFY / ROLLBACK.
- **Results come from `!` command output or Mythos's browser.** Never from
  memory, never from a CLI value-read of Vercel env (see §11, S3).
- **Cam runs everything that touches prod** (Neon, Vercel Production scope,
  BotFather, the Anthropic console). Claude drives cloud-build gates and reads.
- **Re-run the preflight after every phase that changes a secret or an env var.**
  It is read-only and prints no values:

  ```bash
  pnpm deploy-night:preflight                              # everything
  pnpm deploy-night:preflight --skip-audit --skip-suites   # env + Vercel presence only, ~5s
  pnpm deploy-night:preflight --night-env=.env.night       # also value-check the file you will paste from
  ```

- **Secret hygiene.** Secrets are sourced (`set -a; source .env.prod; set +a`),
  never inlined in a command that lands in shell history, this doc or a ledger.
  Fingerprints (16 hex, one-way) are the only trace a secret leaves in the repo.

---

## 1. Pre-night (T-1 day) — everything that can be done without touching prod

| # | Step | DO | EXPECT |
|---|---|---|---|
| T1 | Preflight baseline | `pnpm deploy-night:preflight` | FAIL on every rotation-dependent secret (they are still the old ones — that is the point), FAIL on audit until triaged, PASS on 0-skip suites, Vercel presence rows as in §3. Anything else failing is a real blocker. |
| T2 | Known-old fingerprints recorded | `cat scripts/deploy-night/known-old-fingerprints.json` | Five names present (`DATABASE_URL`, `DIRECT_URL`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `AUTH_SECRET`), recorded 2026-09-04. If a secret changed since, re-run `pnpm deploy-night:preflight --record-old-fingerprints` BEFORE the night so the post-rotation check can prove the change. |
| T3 | Validation chain on the deploy commit | `pnpm validate:launch` | Green. **Trap:** the chain's `db:recreate` wipes the perf fixture; reseed after with `node --import tsx scripts/seed/perf-scale.ts --apply --depth=demo` or every perf number goes back to lying (§11, S1). **Trap:** a second build without a clean `.next` fails inside `prepare-standalone-runtime` — recover with `rm -rf .next` THEN `pnpm release:prelaunch`, in that order (§11, S2). |
| T4 | Audit triage | `pnpm audit --prod` | At writing: **3 critical, 24 high** in prod deps. Each advisory is either fixed (bump) or accepted in writing in the deploy ledger with the reason. The preflight FAILs on any critical/high; a written acceptance is the only override, and it is a human one. |
| T5 | Help corpus dry run | `pnpm dotenv -e .env.prod -- node --import tsx scripts/seed-help-prod.ts` | Prints the would-index count against the Neon host. Writes nothing. The `--apply` happens in Phase 6, after the migration gate. |
| T6 | Neon headroom (E8) | Neon dashboard | Compute hours not near cap, active connections low. `pkill -f 'query-engine'` locally so leaked engines cannot trip P2037 during the night (§11, S5). |
| T7 | L1/L2 pointers | `cat artifacts/mac-mini/state/last-known-good-release.json artifacts/mac-mini/state/previous-known-good-release.json` | L1 == the deploy commit's fingerprint; L2 == the CURRENT prod release, so the one-move rollback exists before anything moves. |
| T8 | Prepare `.env.night` | A local, git-ignored file (`.env*` is ignored) holding exactly the values you will paste into Vercel Production in Phases 1–3 | `pnpm deploy-night:preflight --night-env=.env.night --skip-audit --skip-suites` → every `night-env` row PASS. This is where the blank-vs-absent rule is enforced before a blank ever reaches Vercel (§11, S4). |
| T9 | Quiesce plan | Read Phase 0 | Know which launchd jobs you will boot out and in which order they come back. |

---

## 2. The night — ordered

### Phase 0 — Freeze & quiesce (FIRST, always)

Carried unchanged from block-20 §3 Phase 0.

- **Q1** Boot out the shared-Neon writers before anything else:
  `launchctl bootout gui/$(id -u)/com.patalign.agent-supervisor`,
  `launchctl bootout gui/$(id -u)/com.patalign.telegram-bot`, plus any
  `com.aae.c2acct.*` sibling jobs. `launchctl list | grep -E 'patalign|c2acct'`
  must show none.
- **Q2** Stop `com.c2acct.app` and its watchdog (they rebuild `.next` and race
  the launch gates). Restart them LAST (Phase 10).
- **Q3** Scope freeze: HEAD is the deploy commit, `git status --short` empty,
  `pnpm deploy-night:preflight` run once more as the night's opening line.

### Phase 1 — Credential rotations (one at a time; verify, then next)

Order is chosen so each rotation's verification does not depend on a later one.

#### 1a. Telegram bot token

| | |
|---|---|
| **Lives in** | Mac-mini `.env.local` → `TELEGRAM_BOT_TOKEN`, rendered into the supervisor and telegram-bot plists. Not in Vercel. |
| **DO** | Bot already booted out (Q1 — only one process may long-poll a token). In BotFather: `/revoke` for the PatAlign bot → new token. Write it to `.env.local`. Re-render both plists from `.env.local` per `docs/agents/operations.md` (the repo plists ship placeholders), then `launchctl bootstrap` the telegram-bot only. |
| **EXPECT** | Bot log shows a clean poll start; a few transient `Conflict: terminated by other getUpdates request` lines are normal while Telegram releases the old poll. |
| **VERIFY** | `pnpm agent:approval-verify seed` → three approval cards arrive in `TELEGRAM_ALLOWED_CHAT_ID`; tap Approve on one; `pnpm agent:approval-verify status` shows the decision. Then `pnpm deploy-night:preflight --skip-audit --skip-suites` → `TELEGRAM_BOT_TOKEN` row flips FAIL → PASS. |
| **ROLLBACK** | None. A revoked token is dead the moment BotFather issues the new one. This step is fail-forward: if the new token cannot poll, issue another via BotFather. Do not try to "restore" the old one. |

#### 1b. AUTH_SECRET

| | |
|---|---|
| **Lives in** | Vercel Production (`AUTH_SECRET`; `NEXTAUTH_SECRET` is the read-fallback, not set in prod) and Mac-mini `.env.local` (the local standalone + e2e). |
| **DO** | `NEW=$(openssl rand -base64 48)` (≥ 32 chars; the preflight refuses shorter). Put it in `.env.night`. Vercel: `vercel env rm AUTH_SECRET production --yes && printf '%s' "$NEW" \| vercel env add AUTH_SECRET production` (`printf`, not `echo` — no trailing newline). Update `.env.local` too. |
| **EXPECT** | Nothing changes yet: Vercel binds env at build time, so the live deployment keeps its old secret until Phase 5 deploys. |
| **VERIFY** | After Phase 5: a browser still holding a pre-deploy session cookie lands signed-out; a fresh sign-in works. That invalidation IS the proof the secret rotated. Preflight `--night-env=.env.night` → `AUTH_SECRET` row PASS. |
| **ROLLBACK** | Re-add the old value (keep it in `.env.night.old`, local, until Phase 10) and redeploy. Sessions invalidate again — expected. |

#### 1c. Neon — DATABASE_URL / DIRECT_URL (app role password reset)

| | |
|---|---|
| **Lives in** | `.env.prod` (both URLs; what Cam sources for every DIRECT_URL step), Vercel Production (`DATABASE_URL`, `DIRECT_URL`), Mac-mini plists (rendered from `.env.local`/`.env.prod` per `docs/agents/operations.md`). |
| **DO** | `cp .env.prod .env.prod.bak.$(date +%Y%m%d-%H%M%S)` (the precedent; `*.bak.*` is git-ignored). Neon console → Roles → reset the app role's password → copy the pooled URL and the direct (non-pooler) URL. Write both to `.env.prod` and `.env.night`. Vercel: rm + add both (`printf`). Re-render the Mac-mini plists; **bootout/bootstrap** the supervisor and bot, because `kickstart` does NOT reload env (§11, S6). |
| **EXPECT** | The old password stops working immediately; anything still holding it (a leaked local engine, the un-rerendered plist) fails with an auth error — that is the signal you missed a consumer. |
| **VERIFY** | `pnpm dotenv -e .env.prod -- pnpm rotations:verify` → `[rotation-verify] PASS via DIRECT_URL (<host>)` and a proof file in `artifacts/rotations/`. It MUST say DIRECT_URL: through the pooler a prepared-statement error is a false negative (§11, S7). Then preflight → `DATABASE_URL` and `DIRECT_URL` rows PASS. |
| **ROLLBACK** | A Neon password reset is not reversible — fail-forward: reset again if the new one is wrong. The `.bak` copy exists to diff the URL SHAPE (host, role, db name) if the new string looks wrong, not to restore the password. |

### Phase 2 — API-key org swap

| | |
|---|---|
| **What** | `ANTHROPIC_API_KEY` moves to a key issued by the new Anthropic Console org, replacing the key that hit a zero balance in July (ledger P0a). One credential serves Ask Pat, the web tier's search provider and the agents — there is no second key to rotate. |
| **Lives in** | Vercel Production, `.env.prod`, Mac-mini `.env.local`. |
| **DO** | Create the key in the new org. Write it to all three places (Vercel via rm + add with `printf`). Leave the OLD key enabled in the old org until Phase 8 passes. |
| **VERIFY** | Zero-cost: `curl -s https://api.anthropic.com/v1/models -H "x-api-key: $KEY" -H "anthropic-version: 2023-06-01" \| head -c 200` returns a model list, not an auth error. Real: Phase 8a is the first billed call. Preflight → both `ANTHROPIC_API_KEY` rows PASS. |
| **ROLLBACK** | Re-set the old key (still enabled) in the same three places and redeploy. Disable the old key only in Phase 10. |

### Phase 3 — Env vars set and verified (Vercel Production scope)

Presence at writing (`vercel env ls production`, 2026-09-04): PRESENT —
`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`,
`ANTHROPIC_API_KEY`, `AGENT_APPROVAL_HMAC_SECRET`, `PAT_ENABLE_PAT_ASSISTANT`,
`PAT_ENABLE_PINGS`, `PAT_ENABLE_BATTLECARD`, `PAT_ENABLE_CONSULTANT_ACCESS`,
`PAT_ENABLE_ALIGNMENT_BOARD`, `PAT_ENABLE_SELF_SIGNUP`. ABSENT — everything in
the table below. The tier FLAGS stay absent through this phase; they flip in
Phase 9.

| Variable | Value for the night | Why | Code default when ABSENT | When BLANK |
|---|---|---|---|---|
| `PAT_PUBLIC_IP_HASH_SALT` | `openssl rand -hex 32` | Public tier stores salted IP hashes; without a salt it refuses to write (throws `MissingPublicIpSaltError`) | none — tier unavailable | tier unavailable (whitespace is trimmed to nothing) |
| `PAT_WEB_TIER_DAILY_CAP_USD` | `0.25` for the rehearsal | Global web-tier spend backstop, compared `>=` before the search | `2` | **`0` — `Number("")` is 0, a valid cap, so every web call declines silently** |
| `PAT_PUBLIC_DAILY_CAP_USD` | `0.25` for the rehearsal | Global public-tier spend backstop | `3` | falls back to `3` (this reader guards blank) |
| `PAT_WEB_TIER_USER_DAILY_SEARCHES` | leave absent | Per-user backstop | `10` | `0` — same trap as the web cap |
| provider key | already `ANTHROPIC_API_KEY` (Phase 2) | `PAT_WEB_SEARCH_PROVIDER` defaults to `anthropic`, which uses that key | `anthropic` | unknown id → rung unavailable, an honest decline |

- **DO** `printf '%s' "$VALUE" | vercel env add <NAME> production` for each row.
- **VERIFY presence** `pnpm deploy-night:preflight --skip-audit --skip-suites`
  → the `vercel:production` rows PASS.
- **VERIFY values** in the Vercel dashboard (edit → value field) AND in
  `.env.night` via `--night-env`. **Never** via `vercel env pull` — it returns an
  empty string for every encrypted variable in this project (§11, S3) and once
  produced a false "drift" incident.
- **ROLLBACK** `vercel env rm <NAME> production --yes` → the code default
  applies on the next deploy.

### Phase 4 — Migration gate (Cam's hands, DIRECT_URL, BEFORE any data step)

Six migrations postdate the prod baseline `0157d40`:

```
20260820120000_agent_hardening_pause_resume
20260824140000_add_module_sitting_item_response
20260826120000_add_vertical_id_module_content_and_benchmarks
20260826150000_add_corpus_depth_tier_and_decline_log
20260827120000_add_pat_web_search_log
20260901120000_add_pat_public_usage_log
```

Method exactly as block-20 §1.3 (the proven July split):

```bash
set -a; source .env.prod; set +a
DATABASE_URL="$DIRECT_URL" node --import tsx scripts/prisma-safe.ts migrate status   # EXPECT: exactly the six above pending, no drift
DATABASE_URL="$DIRECT_URL" node --import tsx scripts/prisma-safe.ts migrate deploy   # EXPECT: 6 applied clean, no partials
DATABASE_URL="$DIRECT_URL" node --import tsx scripts/prisma-safe.ts migrate status   # EXPECT: up to date
```

- **VERIFY** one data-bearing read on a migrated table (a `count()` on
  `PatWebSearchLog` and `PatPublicUsageLog` → `0 0`, no P2021/P2022).
- **ROLLBACK** not required on abort: every one of the six is additive (new
  tables/columns/indexes under dark flags; confirm by reading the SQL before the
  night — `grep -il "drop\|alter column" prisma/migrations/2026082*/migration.sql
  prisma/migrations/2026090*/migration.sql` should print nothing). Code rollback
  is `git revert` + redeploy; tables stay, inert.
- If `migrate status` lists anything other than these six: **STOP**, reconcile.

### Phase 5 — Cloud build → preview → promote, then the four prod gates

Block-20 §3 Phases 4–5, unchanged: Claude drives the cloud-build preview to
Ready; the preview passes the SSO gate; **Cam promotes `--prod`**; then G1
(release fingerprint served == expected), G2 (route gate), G3 (`/api/health/db`
200 + a data-bearing read), G4 (authed browser sweep with build + flag state
printed). This is the deploy that makes Phases 1b, 1c, 2 and 3 take effect.

- **VERIFY** the AUTH_SECRET proof (1b): old session cookie → signed out.
- **EXPECT** the first firm-module page load after deploy rewrites the 25
  open-ended help texts via `ensureFirmAlignmentSystem` (intended content
  change from 8fabe6eb, not drift) — record it in the Z6 ledger as such.
- **ROLLBACK** the one-move L2→L1 restore + `git revert` + redeploy (§10).

### Phase 6 — Help corpus to prod

```bash
pnpm dotenv -e .env.prod -- node --import tsx scripts/seed-help-prod.ts            # dry run — count matches T5
pnpm dotenv -e .env.prod -- node --import tsx scripts/seed-help-prod.ts --apply    # idempotent upsert by contentHash
```

- **VERIFY** `APPLIED — N indexed, M unchanged`; re-run → `0 indexed`. Ask Pat on
  prod answers the Secret-Firms question with a citation (the same assertion
  `pnpm smoke:ask-pat` makes locally).
- **ROLLBACK** none needed — content rows only; a bad article is fixed by a
  corrected article and another `--apply`.

### Phase 7 — Module suites at 0-skip

The three DB-conditional contract suites (`module-history`,
`public-tier-guardrails`, `vertical-cohort-isolation-db`) skip their cases when
Postgres is unreachable, and a skipped suite reports green while testing nothing.

- **DO** `pnpm deploy-night:preflight --skip-audit --skip-vercel` (runs exactly
  those three) or the full `pnpm test:unit` on the deploy commit with the DB up.
- **EXPECT** `56 passed · 0 skipped · 0 failed` (count at writing) / the full run
  with no `skipped` in its summary line.
- **ROLLBACK** n/a — a skip here means the DB was down for the run, not a prod
  problem; fix the environment and re-run.

### Phase 8 — Live rehearsals, caps at minimum

Both rehearsals run against prod with the Phase 3 caps (`0.25`). Each costs
cents and proves a wall the tests cannot: a real provider call and a real
flag-on public surface.

#### 8a. Web tier — first real provider call

| | |
|---|---|
| **DO** | Phase 9 order applies: set `PAT_ENABLE_PAT_LADDER=1` then `PAT_ENABLE_PAT_WEB_TIER=1` in Production scope → redeploy. Signed in as a firm or vendor review account (the web rung refuses the public audience), ask Pat an in-scope question the corpus cannot answer (a current-year regulatory date is the canonical shape). |
| **EXPECT** | One answer, labelled "from the web", every claim carrying a citation; a `PatWebSearchLog` row with a non-zero `costUsd`; the Anthropic console shows the call under the NEW org. |
| **VERIFY** | Second question → still answered (cap `0.25` not yet reached). Then set `PAT_WEB_TIER_DAILY_CAP_USD=0` → redeploy → same question → honest decline, and the decline is logged as a decline, not a 502 (rung outages never masquerade as corpus gaps). Restore `0.25`. |
| **ROLLBACK** | `PAT_ENABLE_PAT_WEB_TIER` → remove → redeploy. Off is byte-identical to the pre-ladder flow. |

#### 8b. Public tier — first flag-on smoke

| | |
|---|---|
| **DO** | `PAT_ENABLE_PUBLIC_TIER=1` (salt and public cap already set in Phase 3) → redeploy. Signed out, open `/ask`. |
| **EXPECT** | The page renders (flag off = 404). One question → a rung-1 corpus answer or a rung-4 honest decline. **No web answers** on the public tier, ever (rungs 1 + 4 only). |
| **VERIFY** | `PatPublicUsageLog` rows carry a salted hash, never an address. Nine requests inside 60 s from one address → the ninth is rate-limited (`PAT_PUBLIC_IP_MAX_REQUESTS` default 8). The session message cap (default 20) is documented, not exercised. Spend stays under `0.25`. |
| **ROLLBACK** | `PAT_ENABLE_PUBLIC_TIER` → remove → redeploy → `/ask` is a 404 again and `/api/pat/public` refuses. |

### Phase 9 — Flag-flip order

Each flip is a Production-scope env change followed by a redeploy, and each is
proven on a rendered surface before the next. The order follows the dependency
chain in `lib/patAssistant/flags.ts`:

1. `PAT_ENABLE_PAT_ASSISTANT` — already ON in prod (Ask Pat is live). Do not touch.
2. `PAT_ENABLE_PAT_LADDER` — the scope gate + router. Off is byte-identical to
   today; on, out-of-scope questions decline at the gate.
3. `PAT_ENABLE_PAT_WEB_TIER` — rung 3. Necessary, not sufficient: it also needs
   the provider key, a signed-in non-public caller, an in-scope verdict and
   room under both caps.
4. `PAT_ENABLE_PUBLIC_TIER` — last, because it is the only unauthenticated
   surface and every guardrail above it must already be proven live.

Every flag is `=== "1"`; anything else is off, fail-closed. Raise the caps from
the rehearsal minimum to the code defaults (`2` / `3`) only after 8a and 8b
pass, or leave them at the minimum for day one — Cam's call, recorded in the
deploy ledger.

### Phase 10 — Un-quiesce, retire the old credentials, close

- **Z1** Bootstrap the supervisor and bot (already re-rendered in 1a/1c);
  confirm `artifacts/agents/supervisor-heartbeat.json` advances.
- **Z2** Restart `com.c2acct.app` + watchdog LAST; `pnpm asset-integrity`.
- **Z3** Re-boot any `com.aae.c2acct.*` sibling jobs.
- **Z4** Disable the OLD Anthropic key in the old org (Phase 8 passed).
  Delete `.env.night.old` and the `.env.prod.bak.*` from tonight.
- **Z5** `pnpm deploy-night:preflight` → **PASS** (rotation rows all PASS
  against the recorded old fingerprints; audit acceptance recorded).
- **Z6** Deploy ledger: commit, release-id, migrations applied, flag values,
  cap values, gate results, rehearsal costs, rollback pointer L2, the audit
  acceptances. Bank it.

---

## 10. Rollback drill — per step

| Step | Reversible? | Move |
|---|---|---|
| 1a Telegram token | **No** (revocation is final) | Fail-forward: issue another token in BotFather, re-render, bootstrap. |
| 1b AUTH_SECRET | Yes | Re-add old value from `.env.night.old`, redeploy. Sessions invalidate again. |
| 1c Neon password | **No** | Fail-forward: reset again. Use the `.bak` only to compare URL shape. |
| 2 API key | Yes until Z4 | Re-set the old key in the three places, redeploy. |
| 3 Env vars | Yes | `vercel env rm <NAME> production --yes`, redeploy → code default. |
| 4 Migrations | Not needed | Additive; tables stay inert under dark flags. Code: `git revert` + redeploy. |
| 5 Deploy | Yes | `mv previous-known-good-release.json last-known-good-release.json` (L2→L1), `pnpm launch:proof`, `git revert` + redeploy. |
| 6 Help corpus | Not needed | Corrected article + `--apply`. |
| 8a / 8b / 9 flags | Yes | Remove the flag, redeploy. Off paths are byte-identical to today. |

---

## 11. Known sensitivities (each one has bitten before)

| # | Sensitivity | What happens | Guard |
|---|---|---|---|
| S1 | `validate:launch` → `db:recreate` wipes the perf fixture | A default-depth reseed shows the ecosystem route at ~1s — the symptom hiding, not fixed | Reseed `scripts/seed/perf-scale.ts --apply --depth=demo`; `scripts/perf/_perfScaleTarget.ts` records the trap |
| S2 | Stale `.next` | `prepare-standalone-runtime.mjs` cannot overwrite its own prior output, so a second build without a clean `.next` fails; and if you run prelaunch before deleting, the freshness sentinel skips the build entirely. A leftover `.next/dev/lock` also blocks `dev:proof` / the startup guard | `rm -rf .next` FIRST, then `pnpm release:prelaunch` |
| S3 | `vercel env pull` returns empty for every encrypted var | A value-check by CLI reports every flag OFF; produced the 2026-07-23 false-drift incident | Presence via `vercel env ls`; values via dashboard or rendered surface only. The preflight only ever checks presence |
| S4 | Blank ≠ absent | `Number("")` is `0`: a blank `PAT_WEB_TIER_DAILY_CAP_USD` (or the per-user cap) is a valid zero cap and the web tier declines everything; the public cap reader guards blank, the web one does not | Preflight FAILs blank with its own message; paste with `printf '%s'`, never `echo` |
| S5 | Neon P2037 "too many clients" | Leaked local Prisma query engines from ad-hoc `tsx` probes exhaust the client limit and block seeds | `pkill -f 'query-engine'` before the night; every probe ends with `$disconnect` |
| S6 | `launchctl kickstart` does not reload env | A rotated Neon/Telegram credential is not seen by the supervisor or bot until the plist is re-rendered and the job is booted out and back in | Re-render + `bootout`/`bootstrap`, never `kickstart`, after a rotation |
| S7 | Pooled URL false negative | Prisma's prepared statements fail through pgbouncer with an error that has nothing to do with the credential | `rotations:verify` uses `DIRECT_URL` and says so in its output |
| S8 | Vercel binds env at build time | Any env or flag change is invisible until the next deploy | Every env change in this runbook is followed by a redeploy before its verification |
| S9 | The Vercel CLI starts a device-login flow when it has no credential | It opens a browser and waits; an unattended script would hang | The preflight calls the CLI only when a credential file already exists (or `--vercel` is passed after a human `vercel login`) |
| S10 | Only one process may long-poll a Telegram token | Two pollers fight; `Conflict: terminated by other getUpdates request` | Boot the bot out before rotating; bootstrap once |

---

## 12. What the preflight does and does not prove

Proves: presence and non-blankness of every required variable in the files
that carry them; that each rotation-dependent secret differs from the recorded
pre-rotation fingerprint; presence in Vercel Production scope; audit severity
counts; that the DB-conditional suites ran at zero skips; a clean tree.

Does not prove: any VALUE inside Vercel (unreadable by CLI); that a rotated
secret is the RIGHT new secret (that is what each phase's VERIFY is for); that
the rehearsals passed. Those are the night's own gates.

## 13. Owner map

| Surface | Owner on the night |
|---|---|
| Neon console, Vercel Production scope, BotFather, Anthropic console, `--prod` promote | Cam |
| Cloud-build preview, gate reads, rendered-surface proofs, ledger | Claude (Forge) / Mythos |
| Typed GO per phase | Cam |
