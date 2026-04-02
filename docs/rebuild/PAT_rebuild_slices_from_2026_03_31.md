# PAT Rebuild Slices From 2026-03-31

## Recovery Source Matrix

| Slice | Source | Decision | Notes |
| --- | --- | --- | --- |
| Slice A — Auth and seed hygiene | `artifacts/recovery/c2acct-live-dirty.patch`, `/private/tmp/c2acct-main-auth`, dated build-guide summaries | deferred | Credentials-first restore is not required for PAT surface-correct launch; rollback-baseline `github` auth remains the encoded live contract. |
| Slice B — Admin boundary and protected-route parity | `2e0a56a`, preserved dirty patch | restored | Canonical `/sign-in`, `/login` compatibility shim, protected-route parity, admin redirect hardening, auth tests. |
| Slice C — Operator and Mac mini ops layer | `2e0a56a`, current Prompt 4/5 rebuild work | restored | Canonical root contract, standalone runtime, PAT surface gate, fingerprinting, nightly verify, rollback metadata, CI drift detection. |
| Slice D — Product utility recovery | `/private/tmp/c2acct-main-auth`, recovery patch inventory | deferred | Mixed release copy contains PAT-compatible utility work, but also noisy AAE-era and backup artifacts. It stays quarantined until file-by-file review. |

## Restored Slice B

Source:
- clean committed rebuild in `2e0a56af79e45056ea45650a68ee7a1252110ead`
- preserved post-3/31 dirty patch for redirect parity and auth route correction

Files restored:
- `auth.config.ts`
- `app/login/page.tsx`
- `app/sign-in/page.tsx`
- `proxy.ts`
- `app/admin/actions.ts`
- `app/api/auth/local-reset/route.ts`
- `app/platform/layout.tsx`
- `app/survey/[key]/page.tsx`
- `app/components/EnsureCompanySelected.tsx`
- `app/components/assessment/AssessmentModuleClient.tsx`
- `lib/auth/routes.ts`
- `lib/authz.ts`
- `lib/adminControlPlane.ts`

Validation proof:
- `npm run build`
- `npm run test:unit -- tests/auth.signin-canonical.test.ts tests/auth.login-compat.test.ts tests/auth-env.contract.test.ts tests/local-review-auth.contract.test.ts`

Launch-relevant outcome:
- `/sign-in` is canonical
- `/login` is compatibility-only
- admin and protected-route fallbacks no longer point at a first-class `/login` page

## Restored Slice C

Source:
- clean committed runtime rebuild in `2e0a56af79e45056ea45650a68ee7a1252110ead`
- current validated release-gate and operator-visibility rebuild

Files restored:
- `next.config.ts`
- `package.json`
- `ops/release/canonical-root.json`
- `ops/release/pat-surface-manifest.json`
- `ops/release/release-critical-files.json`
- `scripts/release/validate-source-integrity.mjs`
- `scripts/release/validate-pat-surfaces.mjs`
- `scripts/release/prelaunch-gate.mjs`
- `scripts/release/verify-approved-pat-markers.mjs`
- `scripts/release/check-release-critical-changes.mjs`
- `lib/release/fingerprint.ts`
- `app/api/release-fingerprint/route.ts`
- `app/api/health/db/route.ts`
- `app/layout.tsx`
- `scripts/mac-mini/common.sh`
- `scripts/mac-mini/app-start.sh`
- `scripts/mac-mini/launchd-install.sh`
- `scripts/mac-mini/status.sh`
- `scripts/mac-mini/nightly-verify.sh`
- `scripts/mac-mini/rollback-release.sh`
- `.github/workflows/ci.yml`
- `e2e/release-integrity.spec.ts`
- `tests/release-surface-validator.test.ts`

Validation proof:
- `npm run build`
- `npm run test:unit -- tests/release-surface-validator.test.ts`
- `node scripts/release/verify-approved-pat-markers.mjs --root .`
- `node scripts/release/check-release-critical-changes.mjs --files app/page.tsx`
- `bash scripts/mac-mini/rollback-release.sh --dry-run`

Launch-relevant outcome:
- wrong-root deploy is blocked
- wrong-site PAT/AAE drift is blocked
- browser, API, and operator release identity share one fingerprint contract
- nightly verification checks product truth, not only liveness
- rollback targets are tied to known-good fingerprint/root metadata

## Deferred Slices

Slice A is intentionally deferred. The preserved patch and `/private/tmp/c2acct-main-auth` show credentials and seed-hygiene work, but that work is not required to keep the rollback-baseline PAT surface correct. The live contract stays `github` until a clean credentials slice can be reviewed and validated separately.

Slice D is intentionally deferred. `/private/tmp/c2acct-main-auth` contains product utility runtime and vendor improvements, but also mixed-source release noise and backup files. No file from that tree should be promoted without its own PAT-surface proof.
