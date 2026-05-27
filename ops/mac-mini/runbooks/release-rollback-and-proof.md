# Release Rollback And Proof

Rollback PAT only when one of these conditions is true:

- homepage shows any AAE marker
- `/sign-in` is wrong, missing, or not primary
- `/login` is functioning as a first-class auth page
- browser, API, and operator fingerprints differ
- launchd points at a non-canonical root
- auth mode does not match the runtime contract
- PAT surface validation fails on a protected route

## Proof Checklist

1. Capture `bash scripts/mac-mini/status.sh`.
2. Capture `curl -s http://127.0.0.1:3000/api/release-fingerprint`.
3. Capture the failing route HTML or browser screenshot.
4. Run `node scripts/release/validate-pat-surfaces.mjs --root /Users/camerongarrett/work/c2acct-live --base-url http://127.0.0.1:3000`.
5. If the failure is confirmed, run `bash scripts/mac-mini/rollback-release.sh --dry-run`.

## Rollback Contract

- target metadata must come from `artifacts/mac-mini/state/last-known-good-release.json` or `previous-known-good-release.json`
- target root must equal `/Users/camerongarrett/work/c2acct-live`
- target auth mode must match the canonical contract
- target commit must exist locally

## Apply

Use `bash scripts/mac-mini/rollback-release.sh --apply` only after the dry-run output matches the intended known-good fingerprint and commit.
