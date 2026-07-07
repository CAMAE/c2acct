# Ops log — Elite Sprint production deploy (2026-07-07)

Deploy of the Elite Sprint (`feat/agent-system-phase-0` → `818382e`, then `7e39d4e`) to
patalign.com (Vercel project `pat-c2acct-live`, Neon DB).

## Outcome
- **Code + data: LIVE and correct.** patalign.com serves the sprint code; Block D route
  (`/firm/alignment-board`) returns 307; DB healthy; all sprint flags dark
  (`PAT_ENABLE_PAT_ASSISTANT` / `PAT_ENABLE_PINGS` / `PAT_ENABLE_ALIGNMENT_BOARD` unset);
  FREE gone from public onboarding.
- **Prod Neon migration:** 4 additive migrations applied cleanly via the DIRECT endpoint
  (`add_report_narrative_cache`, `add_pat_foundation`, `add_ai_assistant_consent`,
  `restore_knowledge_chunk_tsv`); verified `tsv` + GIN index restored, `AiAssistantConsent`
  + ping tables present.
- **Known gap (deferred to Wed):** live release fingerprint reads the fallback `078a41f`
  (remote build has no `.git` at runtime), not the real sprint commit.

## Outage timeline (UTC, 2026-07-07)
| Event | Time | Notes |
|---|---|---|
| Outage #1 start | ~18:33 | broken prebuilt `ccypl3xw6` aliased — macOS-only Prisma engine on Vercel Linux → "Database unavailable" |
| Outage #1 restore | 18:50:56 | promoted prior working remote build `4mhp5agp6` |
| Outage #2 start | 18:57:19 | 2nd prebuilt `r16xz4m9o` — standalone bundled **no** Prisma engine at all |
| Outage #2 restore | 18:58:23 | re-promoted `4mhp5agp6` |

Public pages (homepage, sign-in) stayed 200 throughout; only DB-backed surfaces degraded.
Total user-facing DB impact ≈ 19 min across the two windows.

## Root cause
A **local `vercel build` + `vercel deploy --prebuilt --prod`** is required to stamp the
correct runtime fingerprint (git present locally). But Next.js `output: standalone`
**does not trace the Prisma query-engine binary**, and `binaryTargets` alone (native only)
built a macOS engine. Vercel's *remote* build auto-injects the Linux engine; a local
prebuilt build does not → prod 500s on DB. Fix requires both Linux `binaryTargets` (done,
`7e39d4e`) **and** `outputFileTracingIncludes` for the engine (Wed prep).

## Restore mechanism (for next time)
`vercel promote https://pat-c2acct-live-4mhp5agp6-...vercel.app` (last known-good remote
build). Rollback via `vercel promote` requires explicit operator naming (auto-classifier
blocks inferred targets — by design).

## ⚠️ REVERT after the Wednesday prebuilt deploy
- Remove `PAT_QA_EXPECTED_COMMIT=078a41f` from `.env.local` (temporary pin so qa-smoke does
  not false-alarm `fingerprint_commit_mismatch` while prod runs the fallback fingerprint).
  Once the correct fingerprint is live, qa-smoke should baseline the real commit again.

## Wednesday checklist (staged, NOT deployed)

**Done tonight:** Linux `binaryTargets` committed (`7e39d4e`). qa-smoke pinned to `078a41f`
so it stays green (temp — see REVERT above).

**Remaining blocker (precisely scoped — this is the real Wednesday work):**
- `outputFileTracingIncludes: { "/**": ["./node_modules/.prisma/client/**"] }` **does** get
  all 3 engines into `.next/standalone/node_modules/.prisma/client/` — BUT `vercel build`'s
  transform to `.vercel/output` **still drops them** (0 `query-engine-*` in `.vercel/output`).
  So the standalone bundling is necessary but not the whole fix; the `.vercel/output`
  function bundles are what actually ship.
- That `/**` was **reverted** (not committed): it bloats every function with ~80MB of engines
  and is unverified end-to-end — didn't want it risking the working *remote*-build fallback.
- **Wednesday options to evaluate:** (a) a post-`vercel build` step that copies the Linux
  engines into `.vercel/output/functions/*.func/…/.prisma/client/`; (b) `engineType="library"`
  (default, better traced by Next standalone) instead of `binary`; (c) confirm whether Vercel's
  standalone Next builder honors `outputFileTracingIncludes` in `.vercel/output` at all, or
  whether prebuilt fundamentally needs the copy step. Verify `query-engine-rhel-openssl-3.0.x`
  is in `.vercel/output` AND boot the standalone locally against Neon (`SELECT 1`) BEFORE deploy.

**Then:** `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` → verify
health `ok:true`, fingerprint = real sprint commit + `gitDirty=clean`, FREE gone, flags dark,
qa-smoke green — then **REVERT `PAT_QA_EXPECTED_COMMIT`** from `.env.local`.
