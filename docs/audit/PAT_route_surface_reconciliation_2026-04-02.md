# PAT Route Surface Reconciliation (2026-04-02)

## Scope

This reconciliation treats the 2026-03-31 rollback baseline restored in `078a41f6816e81e599b94423faf501d10c2aa70c` as the authoritative PAT-critical surface truth, with current recovery branch head `6e082f8142a44db7f7e672a5073938c0a6c54eba`.

Checked surfaces:

- `/`
- `/sign-in`
- PAT shell and header
- `/vendor`
- `/firm`
- `/user`
- `/admin`
- `/login` compatibility-only behavior

Checked files:

- `app/page.tsx`
- `app/layout.tsx`
- `app/sign-in/page.tsx`
- `app/vendor/page.tsx`
- `app/firm/page.tsx`
- `app/user/page.tsx`
- `app/admin/page.tsx`
- `app/components/header/AppHeader.tsx`
- `lib/locale.ts`
- `ops/release/pat-surface-manifest.json`
- `tests/release-surface-validator.test.ts`
- `e2e/release-integrity.spec.ts`

## What Was Checked

### Top-level PAT truth

- `app/page.tsx` still renders the PAT wordmark, the PAT product name, the PAT hero copy, `Meet PAT`, and the `/sign-in` path.
- `app/sign-in/page.tsx` remains the primary role-oriented PAT sign-in hub.
- `app/login/page.tsx` is still compatibility-only and redirects into `buildCanonicalSignInPath(...)`.

### PAT shell and header

- `app/layout.tsx` still constructs the PAT shell nav for:
  - `/`
  - `/pat`
  - `/sign-in`
  - `/vendor`
  - `/firm`
  - `/user`
  - conditional `/admin`
- `app/components/header/AppHeader.tsx` applies that same menu shell across protected routes.

### Role routes

- `app/vendor/page.tsx` still carries:
  - `Vendor PAT homepage and product flow entry.`
  - `Vendor portal`
  - `Your vendor workspace in PAT`
- `app/firm/page.tsx` still carries:
  - `Firm PAT homepage and flow entry.`
  - `Firm portal`
  - `Your firm workspace in PAT`
- `app/user/page.tsx` still carries:
  - `Individual PAT homepage scaffold and route entry.`
  - `Individual portal`
  - `Your individual workspace for PAT`
- `app/admin/page.tsx` still carries:
  - `C2Core operator control plane`
  - `Canonical PAT firm runtime`

### Manifest alignment

`ops/release/pat-surface-manifest.json` currently expects those same PAT-positive markers on the protected routes and forbids:

- `AAE`
- `Autonomous Alignment Infrastructure for Accounting Firms.`
- `Profiles`
- `Top Seven Outputs`
- `Alignment Survey`
- `pre-approved GitHub accounts`

## Mismatches Found

### Source-level route drift

None.

The current recovery branch route source matches the PAT baseline expectations in the manifest for:

- `/`
- `header`
- `/sign-in`
- `/vendor`
- `/firm`
- `/user`
- `/admin`
- `/login`

### Rendered mismatch seen earlier

Earlier rendered failures against `http://127.0.0.1:3000` are not evidence of current route-source drift.

Why:

1. approved PAT marker verification currently passes against the route source files
2. the route source files do not contain the AAE UI markers the nightly rendered validator reported
3. nightly rendered validation showed:
   - `/sign-in` returned `404`
   - `/login` returned `200` as a first-class wrong-site page
   - AAE markers appeared on `/`, `/vendor`, `/firm`, `/user`, and `/admin`
4. the same nightly status showed `launchd_app=not-loaded` while port `3000` was already occupied

Conclusion:

- the manifest is not stale for the PAT baseline
- the route files are not currently regressed
- the earlier rendered mismatch came from a stale running service on the host, not from this recovery branch

## What Changed

No protected route files changed in this reconciliation.

No manifest changes were required.

The current manifest is already aligned with the rollback-baseline PAT route truth on this branch.

## What Now Passes

Validated from current branch source:

- PAT-positive markers exist for `/`, `header`, `/sign-in`, `/vendor`, `/firm`, `/user`, `/admin`, and `/login`
- AAE negative markers are absent from the protected route source files covered by the manifest
- `/login` remains compatibility-only in source
- PAT shell and header remain consistent across protected role routes

Validation commands used:

- `node scripts/release/verify-approved-pat-markers.mjs --root .`
- `npm run test:unit -- tests/release-surface-validator.test.ts`

## Reconciliation Result

Top-level PAT truth and role-surface truth are currently aligned on the rollback recovery branch.

The remaining risk is not route-source drift. The remaining risk is host/runtime drift: the active running service still needs to be replaced with the validated canonical PAT build before rendered PAT route proof can be considered green.
