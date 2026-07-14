# Founders-Preview Deploy — Ledger (patalign.com)

**Re-anchor doc.** Written so a fresh session (post-`/clear`) can resume the prod push
without re-deriving state. Read `CLAUDE.md` (hard rules, validation chain) + this file +
`docs/e2e-known-stale.md` before running `vercel --prod`.

## Goal
Founders-preview deploy to **patalign.com** (Cam GO, morning run 2026-07-14). Pulls forward
deploy-night steps 1/3/4 only. **Rotations + Stripe stay July 21.**

**Cam's rule (verbatim):** "every gate below prints proof before the next step runs. No gate, no deploy."

**Deploy shape (Mythos):** cloud-build → gate on deployed **preview** → `vercel --prod` the **same
commit** with production env (NOT `vercel promote` — preview/prod env targets are split; promoting
would carry the preview DATABASE_URL/AUTH_URL onto patalign.com). No protection-settings changes on
the production project. A1/A2 auth proof moves to **post-seed on patalign.com**.

## Current position (2026-07-14T15:11Z)
- **Gated + ship commit:** `4c1d27a0` (branch `feat/agent-system-phase-0`) — the ledger doc is IN this commit, so gated tree == ship tree, no divergence. (Runtime-identical to code commit `c6a5b331`; `4c1d27a0` just adds this doc, which is not traced into functions.)
- **Preview URL (SSO-authed browser):** https://pat-c2acct-live-lkk09k7yu-cams-projects-cbec4d2e.vercel.app
- **Baked fingerprint (this build):** commit=`4c1d27a` buildId=`4c1d27a-mrksgd3f` source=`cloud-build` ts=`2026-07-14T15:10:49Z` → footer Release id should read `4c1d27a:4c1d27a-mrksgd3f`. Vercel metadata gitCommitSha=`4c1d27a` (confirmed).
- **Status:** ✅ **MYTHOS PREVIEW GATE GREEN (2026-07-14T15:17Z)** — footer == `4c1d27a:4c1d27a-mrksgd3f` exact; health JSON commit/timestamp/sourceType all fresh from the single baked file (item 3 closed); `reason=connection_or_auth` (item 2, non-blocking); `/admin` clean branded redirect. **Next action: `vercel --prod` commit `4c1d27a0`, production env.**
- **Tag `founders-preview-2026-07-13`** still points at the pre-fix commit — move to `4c1d27a0` before prod.

## Gate ledger
- **Gate 1 (pre-flight)** ✅ — validate:launch green single-worker (`CI=1 PAT_VALIDATE_LAUNCH_SKIP_MAC_MINI=1`): 820 unit + 26 e2e/1 skip. Stale-test drift fixed behavior-first (insight-elite-stacking, local-review-auth 244/385, data-insight-key). Cross-tenant 404 proven live (E5 security) before any test edit.
- **Gate 2a — TRUE COMMIT** ✅ — Vercel metadata `gitCommitSha=c6a5b33` == HEAD (not self-report).
- **Gate 2b — RELEASE METADATA (Mythos item 3)** ✅ FIXED in `c6a5b331`: single-source-of-truth baked fingerprint. Bake runs BEFORE `next build` (nft traces `lib/release/baked-fingerprint.json`); bake generates buildId, `next.config.generateBuildId` reads it so `.next/BUILD_ID`==baked; `getReleaseFingerprint` reads ALL fields from that one file; `resolveCommitSha` drops the stale `contract.baselineCommit` fallback → cloud build with no bake FAILS LOUD (no more 078a41f/2018 chimera).
- **Gate 2c — DB classification (Mythos item 2)** ✅ **CONFIRMED** — Mythos hit `/api/health/db` at **2026-07-14T15:17:16.575Z** (preview `pat-c2acct-live-lkk09k7yu`); response JSON reported **`reason=connection_or_auth`** (engine loaded; stale **preview-target** DATABASE_URL from the June 9 rotation; prod target is fresh) = **non-blocking**, exactly as expected. The mirrored server log line `[db-health] FAIL reason=connection_or_auth name=… code=… msg=…` is emitted by `app/api/health/db/route.ts` but **not retroactively retrievable** — Vercel retains runtime logs only via a live `vercel logs` tail or a log drain (none configured); the v3 events API returns build events only. The response-JSON `reason` is the authoritative record. (To capture the verbatim line: run `vercel logs <preview-url>` streaming, then hit the route once in an authed browser session — deferred, not deploy-blocking.)
- **Gate 2d — /admin** — accepted by Mythos as clean branded redirect (no ENOENT); full includes proof runs on patalign.com after --prod.

## Remaining steps (after Mythos green)
1. `git tag -f founders-preview-2026-07-13 4c1d27a0`.
2. **`vercel --prod`** — deploy the **gated commit `4c1d27a0`**, **production** env. If repo HEAD has moved past it (only later docs commits do), `git checkout 4c1d27a0` first so the built tree == gated tree, then: `env -u AI_AGENT -u CLAUDECODE vercel --prod --build-env PAT_COMMIT_SHA=4c1d27a0... PAT_COMMIT_REF=feat/agent-system-phase-0 PAT_BUILD_SOURCE=cloud-build`. Prod footer must read `4c1d27a:…` — same commit Mythos gated on preview.
3. **Gate prod:** `node scripts/release/assert-vercel-prisma-engine.mjs --deployed https://patalign.com` (needs `/api/health/db` 200) · asset-integrity on patalign.com · footer Release id == c6a5b33:… .
4. **Step 3 — PROD demo data:** `demo-expansion --apply` on PROD Neon via **DIRECT_URL (not pooled), batched/serialized**. Assert D0 (238 firms / 43 vendors), 0 name-dupes, A7 (all rows DEMO boundary; pilot/production untouched), D5 (demo Elite accounts resolve ELITE + ACTIVE). Watch for Neon P2037 — kill orphan darwin query engines if seeding stalls.
5. **Step 4 — flags:** enable on prod the exact set :3005 runs (board, BattleCard, insights, sandbox, elite). **Print flag diff.**
6. **Step 5 — post-deploy proof:** patalign.com asset-integrity · qa-smoke pin revert (078a41f → true c6a5b33 fingerprint) · `/api/health/db` 200 · supervisor heartbeat fresh · authenticated A1/A2 spot-proof on 4 demo accounts.
7. **Step 6 — founder accounts:** provision **Randy Johnston, Leslie Garrett, Brian Tankersley** — Elite firm + Elite vendor seats, first-login password change flagged. **Credentials printed to terminal ONLY — never in files or commits.**

## Deferred / notes
- Local review servers :3000/:3005 are DOWN — restore post-deploy (L2: `pnpm release:promote-known-good` FIRST, tree clean, restart LAST; then `pnpm asset-integrity`).
- e2e local-review must run single-worker (`CI=1`) or the stateful consultant test flakes.
- `baked-fingerprint.json` is gitignored (per-build artifact).
