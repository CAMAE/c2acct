# Incident — CORRECTED: "env-scope drift" was a false alarm (unreadable-env-var artifact)

**Date filed:** 2026-07-23 · **Corrected:** 2026-07-27 · **Severity:** process (no live impact)
**Status:** RESOLVED as false-positive; corrective actions below.
**Found during:** Block-20 engagement-v1 pre-deploy flag verification.

## What actually happened

Pre-deploy flag verification used `vercel env pull --environment=production` +
parse-value to read flag values. This method reported `PAT_ENABLE_BATTLECARD` and
`PAT_ENABLE_CONSULTANT_ACCESS` as **OFF**, contradicting the live site (patalign.com
serves both). We first (wrongly) reconciled this as "Vercel build-time env snapshot
drift."

**The real root cause: `vercel env pull` returns an EMPTY value for every encrypted
env var in this project** — it does not decrypt/read stored values here. Proof:
- `PAT_ENABLE_SELF_SIGNUP` (self-signup is LIVE in prod → value is `"1"`) also pulled
  back **empty**.
- A throwaway `PAT_PROBE_DELETEME` set to `1` via `echo 1 | vercel env add` **also
  pulled back empty** immediately after being set (then removed).

So the parser read empty → reported OFF for **every present var**. **There was no
drift.** BATTLECARD/CONSULTANT_ACCESS were `"1"` all along — consistent with the
rendered surface. `vercel env ls` presence data was valid; only the pulled *values*
were bogus.

## Live impact

**None.** The running deployment was never affected (it reads its build-time env).
patalign.com served BattleCard + the consultant portal throughout.

## Action taken on the false premise (must be aware of)

Under GO-0 (Cam-authorized env reconcile), before the read method was known to be
invalid, the following Production-scope mutations were executed:
- `vercel env rm PAT_ENABLE_BATTLECARD production` then `… add … 1` (twice — `printf`
  then `echo`).
- `vercel env rm PAT_ENABLE_CONSULTANT_ACCESS production` then `… add … 1`.
- A throwaway `PAT_PROBE_DELETEME` added then removed (diagnostic).

**Net effect:** both flags were re-set to the intended `"1"` (the canonical
`echo 1 | vercel env add` pattern; both adds reported success). This is very likely a
no-op vs their prior state, but the original (unreadable) values were removed to get
here, and **the new values cannot be confirmed via CLI** (pull can't read them).

## Corrective actions

1. **`vercel env pull` is NOT a valid value-check for this project's encrypted vars.**
   Removed from the checklist as a verification method (see Phase 3 fix).
2. **Valid verification = the Vercel dashboard (value field, human-readable on edit)
   OR the rendered surface of a preview/prod deployment** (rendered-surface law —
   Mythos). BattleCard + consultant rendering on a preview built from current scope is
   the authoritative proof the scope values are `"1"`.
3. **Verify the two touched flags before --prod:** Cam confirms `PAT_ENABLE_BATTLECARD`
   and `PAT_ENABLE_CONSULTANT_ACCESS` = `1` via the dashboard, **and/or** the Phase-4
   preview renders both surfaces. Do not rely on any CLI pull.
4. **Process:** checklist Phase 3 value-check now points to dashboard/rendered-surface,
   not `env pull`.

## Lesson

A read method must be validated against a known value before its output is trusted to
drive a mutation. Here, a single check ("does a known-ON flag read ON?") would have
caught the artifact before any `vercel env rm/add`. That check is now mandatory.
