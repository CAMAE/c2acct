# PAT Prelaunch Green Proof (2026-04-02)

## Goal

Prove that the rollback recovery branch can pass the strict PAT prelaunch gate on a clean committed head without:

- source-integrity false positives
- stale host-service ambiguity
- `/login` primary-auth regression
- AAE marker leakage
- fingerprint disagreement

## Clean Recovery Head

Validated head:

- branch: `recovery/pat-2026-03-31-baseline`
- commit: `340e30c4a5547fad8f6ac13c6fd5518b5b2d8994`

## Changes Required To Get Green

### Source-integrity hardening

`scripts/release/validate-source-integrity.mjs` now distinguishes:

- release-critical dirtiness
- non-critical audit/report dirtiness

The gate still fails on real launch-critical file changes, but it no longer fails because of non-release audit output.

### Rendered PAT surface hardening

`scripts/release/validate-pat-surfaces.mjs` now validates protected role routes using the actual unauthenticated prelaunch behavior:

- `/vendor` -> canonical redirect into `/sign-in`
- `/firm` -> canonical redirect into `/sign-in`
- `/user` -> canonical redirect into `/sign-in`
- `/admin` -> canonical redirect into `/sign-in`

This removed the stale-host ambiguity where the validator could only appear green against an already-running service with old session state.

## Validation Evidence

### Source integrity

Command:

```bash
node scripts/release/validate-source-integrity.mjs --root /Users/camerongarrett/work/c2acct-live
```

Result:

- `ok: true`
- no dirty entries
- canonical root, auth mode, runtime source type, start command, and fingerprint seed all matched

### Rendered PAT surface validation

Command:

```bash
node scripts/release/validate-pat-surfaces.mjs --root /Users/camerongarrett/work/c2acct-live --port 3310
```

Result:

- `ok: true`
- `/` rendered PAT-positive markers and browser fingerprint
- `/sign-in` rendered the PAT sign-in hub and browser fingerprint
- `/vendor`, `/firm`, `/user`, `/admin` each returned canonical `307` redirects into `/sign-in` with the correct `callbackUrl` and view
- `/login` returned canonical `307` redirect into `/sign-in`
- browser/API/operator fingerprints matched
- no AAE markers were reported

Observed redirect evidence:

- `/vendor` -> `/sign-in?callbackUrl=%2Fvendor&view=vendor`
- `/firm` -> `/sign-in?callbackUrl=%2Ffirm&view=firm`
- `/user` -> `/sign-in?callbackUrl=%2Fuser&view=individual`
- `/admin` -> `/sign-in?callbackUrl=%2Fadmin&view=admin`
- `/login?callbackUrl=%2Fvendor` -> `/sign-in?callbackUrl=%2Fvendor&view=vendor`

### Full prelaunch gate

Command:

```bash
npm run release:prelaunch
```

Result:

- `ok: true`
- `sourceIntegrity.ok: true`
- `patSurfaces.ok: true`

## Gate Strictness Preserved

The gate remains strict on:

- wrong root
- critical file dirtiness
- AAE markers
- `/login` behaving as a first-class auth page
- fingerprint mismatch

The green result came from removing false positives, not from weakening the launch contract.

## Conclusion

`npm run release:prelaunch` is green on the clean rollback recovery branch once:

1. runtime state is refreshed for the current committed head
2. rendered PAT validation is executed against the ephemeral standalone process it actually starts

The remaining launch risk is operational host cutover, not repo-side prelaunch gating.
