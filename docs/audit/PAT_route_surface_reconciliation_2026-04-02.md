# PAT Route Surface Reconciliation (2026-04-02)

## Scope

This reconciliation re-checks PAT-critical top-level source truth against:

- rollback anchor from local docs: `078a41f6816e81e599b94423faf501d10c2aa70c`
- last green PAT head recorded in local docs: `340e30c4a5547fad8f6ac13c6fd5518b5b2d8994`
- current head at verification time: `252b7f39ec77b5459c26791769410b87c4048cec`

This check is source-only. It does not treat stale or unreachable host runtime output as source drift.

## Files checked

- `app/layout.tsx`
- `app/page.tsx`
- `app/login/page.tsx`
- `app/sign-in/page.tsx`
- `app/vendor/page.tsx`
- `app/firm/page.tsx`
- `app/user/page.tsx`
- `app/admin/page.tsx`
- `app/components/header/AppHeader.tsx`
- `app/components/pat/MeetPatContent.tsx`
- `app/components/pat/PatRouteCard.tsx`
- `app/components/pat/PortalPanelSelector.tsx`
- `app/components/pat/RoleRoutePage.tsx`
- `app/components/pat/RoleSignInPage.tsx`
- `app/globals.css`
- `ops/release/pat-surface-manifest.json`

## Anchor extraction

Rollback anchor was extracted from local source-of-truth docs, not memory:

- `docs/audit/PAT_rollback_restore_2026-04-02.md`
- `docs/rebuild/PAT_rebuild_slices_from_2026_03_31.md`

Resolved rollback anchor:

- `078a41f6816e81e599b94423faf501d10c2aa70c`

## File-by-file reconciliation

### Matches rollback anchor exactly

- `app/page.tsx`
- `app/vendor/page.tsx`
- `app/firm/page.tsx`
- `app/user/page.tsx`
- `app/admin/page.tsx`
- `app/components/header/AppHeader.tsx`
- `app/components/pat/MeetPatContent.tsx`
- `app/components/pat/PatRouteCard.tsx`
- `app/components/pat/PortalPanelSelector.tsx`
- `app/components/pat/RoleRoutePage.tsx`
- `app/globals.css`

### Documented, validated post-rollback changes above the rollback anchor

- `app/layout.tsx`
  - drift exists above `078a41f6...`
  - current file remains PAT shell truth and now includes browser-visible release fingerprint
  - no forbidden AAE markers present
- `app/login/page.tsx`
  - drift exists above `078a41f6...`
  - current file is compatibility-only and redirects into `buildCanonicalSignInPath(...)`
  - this is the expected post-rollback Slice B landing, not a regression
- `app/sign-in/page.tsx`
  - drift exists above `078a41f6...`
  - current file remains the canonical PAT role-oriented sign-in hub
  - PAT-positive source markers remain present
- `app/components/pat/RoleSignInPage.tsx`
  - drift exists above `078a41f6...`
  - change is minor and remains PAT-consistent
- `ops/release/pat-surface-manifest.json`
  - added after the rollback anchor as part of the release-surface validation layer
  - manifest still matches current PAT source truth and was not rewritten in this track

### Drift versus last green PAT head

No PAT-critical source drift exists versus the last green PAT head recorded in local docs:

- `340e30c4a5547fad8f6ac13c6fd5518b5b2d8994`

`git diff --name-status 340e30c4a5547fad8f6ac13c6fd5518b5b2d8994...HEAD -- [PAT-critical paths]` returned no changes.

## Source-truth rules confirmed in source

### `/` is PAT

Confirmed in `app/page.tsx`:

- PAT wordmark present
- PAT product copy present
- `Meet PAT` present
- `/sign-in` remains the sign-in entry path

### `/sign-in` is canonical

Confirmed in `app/sign-in/page.tsx`:

- role-oriented PAT sign-in hub remains primary
- PAT-positive markers remain present
- source includes `Canonical local origin:` and `Landing route:`

### `/login` is compatibility-only

Confirmed in `app/login/page.tsx`:

- file only redirects through `buildCanonicalSignInPath(...)`
- no first-class login UI remains in this route source
- no `Continue with GitHub` or `pre-approved GitHub accounts` copy remains

### PAT header exists

Confirmed in `app/layout.tsx` and `app/components/header/AppHeader.tsx`:

- PAT shell nav includes `Home`, `Meet PAT`, `Sign in`, `Vendor`, `Firm`, `Individual`, and conditional `C2Core`
- PAT shell remains the top-level chrome across route surfaces

### Protected routes remain PAT-correct

Confirmed in source:

- `app/vendor/page.tsx` contains `Vendor portal` and `Your vendor workspace in PAT`
- `app/firm/page.tsx` contains `Firm portal` and `Your firm workspace in PAT`
- `app/user/page.tsx` contains `Individual portal` and `Your individual workspace for PAT`
- `app/admin/page.tsx` contains `C2Core operator control plane` and `Canonical PAT firm runtime`

## Marker and validator results

### PAT marker verification

Command:

```bash
node scripts/release/verify-approved-pat-markers.mjs --root .
```

Result:

- `ok: true`
- all PAT-positive markers found
- no AAE/global forbidden markers found in PAT-critical protected files

### Release-surface validator test

Command:

```bash
npm run test:unit -- tests/release-surface-validator.test.ts
```

Result:

- `1` test file passed
- `2` tests passed

## Restores performed

None.

No PAT-critical source file required restore from the rollback anchor or the last green PAT head.

## Reconciliation result

PAT-critical top-level source truth has not regressed.

Current state is:

- rollback-anchor exact for the majority of PAT-critical surface files
- intentionally advanced above the rollback anchor only where local docs already record validated post-rollback PAT work
- identical to the last green PAT head for every PAT-critical file checked

Therefore:

- PAT surface truth remains intact in source
- `/login` remains compatibility-only
- `/sign-in` remains canonical
- no AAE markers remain in PAT-critical source files
