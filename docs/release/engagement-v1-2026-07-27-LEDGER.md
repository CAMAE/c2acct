# Deploy ledger — engagement-v1 → patalign.com (2026-07-27)

**Deploy commit:** `0157d40f` (feature/engagement-v1) · **Prod baseline:** Block 15
`6ad96a73` (migration HEAD `20260717_survey_module_pillar`).
**Model:** Cam approves + types each GO; Claude executes. Mythos verifies each phase.
**Readiness pack:** `block-20-prod-deploy-readiness-2026-07-21.md`.
**Sequence:** GO-0 (env reconcile) → Phase 1 → GO-1 (migrate) → Phase 4 (cloud build
+ preview observation) → GO-2 (--prod) → Proof A/B on live.

---

## Phase 0 — Freeze & quiesce ✅
12 launchd services booted out (re-boot in Phase 7): `com.patalign.agent-supervisor`,
`com.patalign.telegram-bot`, 8× `com.aae.c2acct.*` (sibling shared-DB), `com.c2acct.app`,
`com.c2acct.watchdog`. Tree clean; HEAD on the deploy commit.

## Reads (read-only) ✅
- **Prod `migrate status`:** exactly 2 pending, no drift —
  `20260718000000_add_cadence_config`, `20260719000000_add_nudge_draft` (both additive).
- **`vercel env ls production`:** the 5 dark flags absent/off; BATTLECARD +
  CONSULTANT_ACCESS present.

## GO-0 — Production env reconcile ✅ (with a corrected false alarm)
- **Incident (RESOLVED false-positive):** a `vercel env pull` value-check reported
  BATTLECARD/CONSULTANT_ACCESS OFF — but `vercel env pull` returns **empty for every
  encrypted var** in this project (proven: known-ON `SELF_SIGNUP` and a freshly-set
  probe both pulled empty). **There was no drift.** See
  `docs/incidents/2026-07-23-prod-env-scope-drift.md`.
- Action taken (on the false premise, Cam GO-0): `PAT_ENABLE_BATTLECARD` and
  `PAT_ENABLE_CONSULTANT_ACCESS` were `rm`+`add`=`1`. Net ≈ no-op (re-set to the
  intended `1`); originals removed; **values not CLI-verifiable**.
- **Verification deferred to Phase 4 (Mythos ruling):** confirm BATTLECARD +
  consultant render on the staged prod build (`--skip-domain`) **before** `--prod`.
  CLI `env pull` is never a valid value-check here.

## Phase 1 — Pre-flight proofs ✅ (closed by Mythos)
`CI=1 pnpm validate:launch` on `0157d40f`:
- Unit **1003 passed** (143 files); lint + typecheck clean; build + standalone +
  release:prelaunch green.
- **P3:** `release:promote-known-good` ran → `last-known-good releaseId ==
  0157d40:49r-TBS813s_l3twF3vp8` == HEAD.
- **Option-A harness fix proven:** `preview:pat-setup` runs BEFORE
  `test:e2e:local-review`; **e2e green — pilot-signin-form 12 passed, 0 failed**
  (was `pilot_password_invalid`), release-integrity 16 passed, +2 passed. **Zero test
  failures across the chain.**
- **P4:** Neon Launch plan, 47.67 CU-hrs, All OK (Cam dashboard); engines reaped.

### VL_EXIT=113 — ACCEPTED documented quiesce artifact (Mythos ruling 2026-07-27)
The only non-zero exit is `scripts/mac-mini/restart-app.sh`:
`Could not find service "com.c2acct.app" in domain for user gui: 501` → exit 113.
**Cause:** `com.c2acct.app` was booted out in Phase 0 (quiesce law); `restart-app.sh`
needs it loaded (documented: launch gates race the app service, so quiesce-first +
restart-last). **Every enumerated validation gate is green; `promote-known-good` ran
before the mac-mini tail steps, so P3 is unaffected.** The real app-service restart
is **Phase 7 (post-deploy)**. `PAT_VALIDATE_LAUNCH_SKIP_MAC_MINI=1` yields a literal
`VL_EXIT=0`; Mythos ruled **no cosmetic re-run** — accepted as-is.

**Flag state (intended):** dark OFF — PINGS, STALENESS_ALERTS, PINGS_EMAIL,
NEW_FRONT_DOOR, ALIGNMENT_BOARD; ON — CONSULTANT_ACCESS, BATTLECARD (observe in Phase 4).

---

## GO-1 — Prod migrate deploy ✅ (2026-07-27, Cam GO)
- Pre-flight `migrate status`: exactly 2 pending (`add_cadence_config`,
  `add_nudge_draft`).
- `migrate deploy` (DIRECT_URL / non-pooled): **both applied clean — "All migrations
  have been successfully applied."**
- Re-verify: `migrate status` → **"Database schema is up to date!"**; data-bearing
  read **`CadenceConfig=0  NudgeDraft=0`** (readable, born empty, no P2021/P2022).
- L7: query-engines reaped. **Prod migration HEAD is now `20260719_add_nudge_draft`;
  the P4 migration-first rule is satisfied.**

## Pending
## Phase 4 — Cloud build → staged prod (`--skip-domain`) ✅ built, awaiting Mythos sweep
- Built from `0157d40f` via `git checkout 0157d40f` (built tree == validated tree, no
  fingerprint chimera) → `env -u AI_AGENT -u CLAUDECODE vercel deploy --prod
  --skip-domain --yes --build-env PAT_COMMIT_SHA=0157d40f9ee… PAT_COMMIT_REF=feature/
  engagement-v1 PAT_BUILD_SOURCE=cloud-build`. Build Completed 2m, **Ready**, exit 0.
- **Staged URL:** `https://pat-c2acct-live-ll6ib6kab-cams-projects-cbec4d2e.vercel.app`
- **SSO gate:** 302 → `vercel.com/sso-api` + `_vercel_sso_nonce` (deployment protection
  active). **patalign.com untouched — HTTP 200 on the current live deployment.**
- **Mythos observation sweep — COMPLETE AND CLEAN (2026-07-28, on `ll6ib6kab` /
  `0157d40`):** V7 ABSENT; **BATTLECARD=1** (renders, live-identical + 16a chips);
  **CONSULTANT_ACCESS=1** (renders); **PINGS=1** (bell + 16c/16e/16f/16g serving real
  data correctly); **ALIGNMENT_BOARD=1** (firm sandbox card present, F14 rides);
  **STALENESS_ALERTS + PINGS_EMAIL absent** (fail-closed → no generators, no outbound).
  **GO-0 closed by observation** (BATTLECARD + CONSULTANT confirmed rendering — the CLI
  could not read them).
  - **Flag-state correction:** the earlier "all dark flags off" was never measured
    (encrypted-var `env pull` gap). Actual: PINGS + ALIGNMENT_BOARD are ON and their
    surfaces are LIVE. **Proof reclassification (see block-20 §2.4/§2.5):** live-delta
    (Proof B) set = 16a, 17-B, 16d, 17-A + PINGS surfaces (16c/16e/16f/16g) + F14 —
    each previously block-swept; **Proof A reduces to** V7-absent (observed) +
    sweep-inert (STALENESS/PINGS_EMAIL flag-absent).

## GO-2 — Promote staged build to production ✅ (2026-07-28, Cam GO)
- `vercel promote <ll6ib6kab>` → **"Success! pat-c2acct-live was promoted"**
  (`dpl_B4W8z2Qehfn1UJwQdraNLt7pVtrq`), exit 0. Same deployment Mythos swept — no
  rebuild.

## Phase 5 — Prod gates on live patalign.com ✅ (G1/G2/G3)
- **G1 fingerprint:** `releaseId 0157d40:0157d40-ms46jjob` — commit == buildId prefix
  == validated commit `0157d40`, honest (no chimera).
- **G2 routes:** `/` 200, `/sign-in` 200, `/vendor` `/firm` `/consultants` `/admin`
  307 (unauth → sign-in redirect, correct).
- **G3 health-db:** `{"ok":true …}`, release `0157d40`, branch feature/engagement-v1.
- [ ] **G4 browser gate + Proof A/B on live** — Mythos (proof-ab-runbook.md).

## Pending
- [ ] **GO-2 — `--prod` promote** (Cam GO) + alias patalign.com.
- [ ] **Phase 5 — 4 prod gates** (fingerprint / route / health-db / browser).
- [ ] **Proof A/B** on live (`proof-ab-runbook.md`).
- [ ] **Phase 7 — un-quiesce** (re-boot the 12 services; supervisor heartbeat;
      restart com.c2acct.app LAST + asset-integrity).
- [ ] Post-deploy: pull Vercel audit log for the env vars (incident follow-up).
