# Release promotion semantic

How `last-known-good-release.json` advances in this repo, per AUDIT-D16-001 (closed Day-18 Block 1).

## Semantic (option a — auto-promote on chain pass)

**Last-known-good = the most recent commit that passed all validation gates.**

The chain auto-writes `artifacts/mac-mini/state/last-known-good-release.json` every time `pnpm validate:launch` reaches the promotion step with the prior gates green. No human gating; no "Cam has personally cleared this" semantic. If a commit passes the chain, it's the new last-known-good.

This was Cam's pick (Day-18 Block 1 decision gate). The alternative (option b, "human promotes") was rejected because the trailing stale-warning friction was higher than the loss of human-promote semantics.

## Pipeline

```
pnpm validate:launch
  ├── prisma:generate
  ├── db:recreate + db:wait
  ├── prisma:migrate:local
  ├── seed:baseline + seed:pat-runtime + seed:demo-benchmark
  ├── lint:test + validate:db + typecheck + test:unit
  ├── build  (writes canonical-root.json + expected-live-release.json)
  ├── standalone:local:check
  ├── release:prelaunch  (runs prelaunch-gate.mjs: validators + in-line promote)
  ├── release:promote-known-good  ← NEW (Day-18 Block 1)
  ├── test:e2e:local-review
  ├── test:e2e:release-integrity
  └── mac-mini bash scripts  (mac-mini-only; fails on dev workstations — expected)
```

`release:promote-known-good` exists as a separate chain step BECAUSE `release:prelaunch` is freshness-skippable: if `canonical-root.json` already matches HEAD (a prior chain run on this commit), the chain skips `build`, `standalone:local:check`, AND `release:prelaunch`. That skip used to leak — the promotion logic inside `prelaunch-gate.mjs` never fired, so `last-known-good-release.json` lagged behind HEAD across commits. The standalone `release:promote-known-good` step always fires, regardless of freshness skip. That's the AUDIT-D16-001 closure.

## Manual promotion

```bash
pnpm release:promote-known-good
```

Reads the current fingerprint via `scripts/release/read-release-fingerprint.ts` (single source of truth — same script that writes `expected-live-release.json`), then writes `last-known-good-release.json` atomically. Atomic = `.tmp.$$ + rename`, same pattern as Day-16's `fc69af0`. The prior known-good is preserved as `previous-known-good-release.json` for rollback.

Idempotent: a re-run on a clean state is a no-op (logs `already current at <release-id>; no-op`).

## Rollback

```bash
mv artifacts/mac-mini/state/previous-known-good-release.json \
   artifacts/mac-mini/state/last-known-good-release.json
```

Restores the prior known-good without touching git or rebuilding. Run `pnpm launch:proof` after to regen the bucket map.

## Why not "human promotes"

Option (b) — last-known-good stays static until Cam manually promotes — was the human-verified semantic. It was rejected because:

1. Every Day-N close added a stale warning to the bucket map until Cam acted. Friction without a clear payoff.
2. The "Cam has personally cleared this" guarantee was theoretical — Cam doesn't run a separate manual review against `last-known-good-release.json`. The validation chain *is* the verification process.
3. The Day-16 incident that filed AUDIT-D16-001 was a one-line semantic gap, not a missing human gate. Option (a) is the precise close.

If a future incident calls for a human-gated promotion (e.g., a known-bad commit passes the chain because of a missing assertion), the right fix is to extend the chain's assertions, not to re-introduce manual promotion.

## Locked-in contract

`tests/release-promote-known-good.contract.test.ts` enforces:
- The promote script uses `read-release-fingerprint.ts` (no fingerprint drift between writer and runtime).
- Atomic-write discipline (`.tmp` + rename).
- Idempotent re-run.
- Prior known-good preserved as `previous-known-good-release.json`.
- Wired into `scripts/validate-launch.ts` AFTER `release:prelaunch`.
- Exposed as a pnpm script.

A future refactor that breaks any of these fails the contract.
