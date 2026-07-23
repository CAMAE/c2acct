# Incident — Production env-scope drift (BATTLECARD / CONSULTANT_ACCESS OFF in scope)

**Date filed:** 2026-07-23 · **Severity:** latent (no live impact; caught pre-deploy)
**Status:** OPEN — remediation staged as GO-0; root cause pending Vercel audit log.
**Found during:** Block-20 engagement-v1 pre-deploy flag verification.

## Summary

During pre-deploy flag verification, a scoped `vercel env pull --environment=production`
(project `pat-c2acct-live`, scope `cams-projects-cbec4d2e` — the project confirmed
serving patalign.com) found the Production env **scope** values:

| Flag | Production scope (2026-07-23) | Expected |
|---|---|---|
| `PAT_ENABLE_BATTLECARD` | **OFF** (legacy `PAT_ENABLE_SALES_CARD` absent) | ON |
| `PAT_ENABLE_CONSULTANT_ACCESS` | **OFF** | ON |
| `PAT_ENABLE_PINGS` | OFF | OFF ✓ |
| `PAT_ENABLE_ALIGNMENT_BOARD` | OFF | OFF ✓ |

This contradicted the rendered-surface truth: patalign.com serves BattleCard and the
consultant portal (Cam-confirmed in-browser, live since ~2026-07-16).

## Reconciliation (why both are true)

Vercel **snapshots environment variables into a deployment at build time**; changing
a project's env vars afterward does not retroactively affect running deployments —
only the next deploy. The live deployment (`dpl_CL5Q8eYCymE2Yogk3dmjMxm4TQS6`,
created 2026-07-17) captured `BATTLECARD=1` / `CONSULTANT_ACCESS=1` and renders them.
The Production **scope** has since drifted to OFF — so it's what the *next* deploy
would inherit, not what the live site serves. Rendered-surface law (Mythos) held; the
env read was a scope read, not a live-runtime read.

## Impact

**None to the live site** (the running Jul-17 deployment is unaffected by scope
changes). **Averted:** deploying engagement-v1 against the drifted scope would have
built a new deployment inheriting `BATTLECARD/CONSULTANT_ACCESS=OFF`, **regressing the
BattleCard surface and the consultant portal to dark** — a severe parity break.
Caught pre-deploy by upgrading the flag check from presence to value.

## Timeline (from `vercel env ls production` "created"/last-changed)

- `PAT_ENABLE_CONSULTANT_ACCESS` — last changed ~62d ago (~2026-05-22, matches the
  documented consultant-portal reversal).
- `PAT_ENABLE_PINGS`, `PAT_ENABLE_PAT_ASSISTANT`, `PAT_ENABLE_BATTLECARD`,
  `PAT_ENABLE_ALIGNMENT_BOARD` — last changed **~9d ago (~2026-07-14)**, aligned with
  the founders-preview deploy window.
- Live deployment serving patalign.com created **2026-07-17**.

## Cause

**UNKNOWN.** What set `BATTLECARD` (and possibly `CONSULTANT_ACCESS`) to a non-`"1"`
value in the Production scope ~9 days ago is not yet identified. Candidates to rule
out via the audit log: a `vercel env` CLI/dashboard edit, an env-sync script, or a
`vercel env pull/push` round-trip that rewrote values.

## Remediation

- **GO-0 (pre-deploy, gated on Cam's GO):** restore the two must-be-ON flags in
  Production scope before Phase 1:
  ```bash
  vercel env rm  PAT_ENABLE_BATTLECARD        production --yes
  printf 1 | vercel env add PAT_ENABLE_BATTLECARD        production
  vercel env rm  PAT_ENABLE_CONSULTANT_ACCESS production --yes
  printf 1 | vercel env add PAT_ENABLE_CONSULTANT_ACCESS production
  ```
  Then value-check confirm (scoped-pull hygiene): `BATTLECARD=ON`,
  `CONSULTANT_ACCESS=ON`, dark flags OFF.

## Follow-ups

- [ ] **After deploy:** pull the Vercel audit log (if available on plan) for the
  `PAT_ENABLE_BATTLECARD` / `PAT_ENABLE_CONSULTANT_ACCESS` vars over the last ~10 days
  to identify what/who changed them. Attach findings here and set root cause.
- [x] **Process fix:** deploy-checklist **Phase 3 upgraded from presence-check to
  value-check** (permanent) — `vercel env ls` presence can never again pass while a
  value is wrong. See `block-20-prod-deploy-readiness-2026-07-21.md §3` Phase 3 + the
  new Phase 0.5 (GO-0).
- [ ] Consider pinning critical flags in a checked-in `vercel.json`/`vercel.ts` env
  contract or a value-assert in the deploy chain so scope drift is detected
  automatically, not by manual pull.

## Hygiene note

All flag-value reads used a scratch `vercel env pull` to `/tmp`, grepped only the
target flags to ON/OFF (values never echoed), and `rm -P`'d the file immediately —
the pull contains real secrets.
