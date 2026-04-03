# PAT Surface Runtime Packaging (2026-04-02)

## Goal

Restore the full PAT shell on an isolated standalone runtime without changing PAT route truth.

## Root cause

The PAT source files were not the problem.

The standalone runtime packaging was incomplete:

- `.next/standalone/server.js` changes the process working directory into `.next/standalone`
- the standalone directory contained server code, but it did not contain:
  - `.next/static`
  - `public`
- that meant the isolated standalone runtime could return PAT HTML while failing to serve the CSS, JS, fonts, and PAT brand assets needed to render the real shell

This is why the product could appear as bare or partially rendered HTML even though the PAT routes and manifest were already correct in source.

## Files changed

- `package.json`
- `scripts/release/prepare-standalone-runtime.mjs`
- `scripts/mac-mini/common.sh`

No PAT route source files were changed.

## Repair made

### Build packaging

`package.json` build now runs:

- `next build --webpack`
- `node scripts/release/prepare-standalone-runtime.mjs`

### Standalone asset completion

Added `scripts/release/prepare-standalone-runtime.mjs` to copy:

- root `.next/static` -> `.next/standalone/.next/static`
- root `public` -> `.next/standalone/public`

The helper also hard-fails if the required PAT logo source asset is missing:

- `public/brand/c2/c2-logo-accounting.png`

### Mac mini runtime repair

`scripts/mac-mini/common.sh` now repairs and verifies standalone runtime assets before writing release state:

- prepares runtime assets whenever startup packaging is incomplete
- fails startup if standalone static or public assets are still missing after repair

## Isolated runtime proof

Isolated runtime started successfully at:

- `http://127.0.0.1:3310`

Captured HTML:

- `artifacts/reports/pat-home-20260402.html`
- `artifacts/reports/pat-signin-20260402.html`

Captured asset inventory:

- `artifacts/reports/pat-runtime-assets-20260402.txt`

### Packaged asset proof

Packaged standalone paths now exist:

- `.next/standalone/.next/static`
- `.next/standalone/public`
- `.next/standalone/public/brand/c2/c2-logo-accounting.png`

Referenced runtime assets returning `200`:

- CSS:
  - `/_next/static/css/b227f4584a42a18f.css`
- JS:
  - `/_next/static/chunks/3794-eed3cbe8441c422e.js`
  - `/_next/static/chunks/4bd1b696-0ae268a5a152f031.js`
  - `/_next/static/chunks/8437-1595797761bfca7e.js`
  - `/_next/static/chunks/8500-41fa79ac743d83f1.js`
  - `/_next/static/chunks/app/layout-f6364daf822be1af.js`
  - `/_next/static/chunks/app/page-0777eb238dd6627d.js`
  - `/_next/static/chunks/app/sign-in/page-0777eb238dd6627d.js`
  - `/_next/static/chunks/main-app-1a05c9f0388444d0.js`
  - `/_next/static/chunks/polyfills-42372ed130431b0a.js`
  - `/_next/static/chunks/webpack-9a29edabec841e5c.js`
- fonts:
  - `/_next/static/media/3a262070f4407c8a-s.p.ttf`
  - `/_next/static/media/6c26833e74d7dd5b-s.p.ttf`
  - `/_next/static/media/af3944704d431f58-s.p.ttf`
  - `/_next/static/media/fb64300f7e8120e3-s.p.ttf`
- PAT brand asset:
  - `/brand/c2/c2-logo-accounting.png`

Direct logo proof:

- `curl -fsSI http://127.0.0.1:3310/brand/c2/c2-logo-accounting.png` returned `200 OK`

The home and sign-in HTML now include:

- real stylesheet link
- real chunk script references
- font preload links
- PAT header
- PAT footer
- logo image markup using the PAT/C2 branding path

## PAT route contract preserved

The shell/static repair did not change PAT route truth.

Verified on isolated runtime:

- `/` returns `200` and renders the PAT shell
- `/sign-in` returns `200` and renders the PAT shell
- `/login` returns `307` to `/sign-in`
- `/vendor` returns `307` to `/sign-in?callbackUrl=%2Fvendor&view=vendor`
- `/firm` returns `307` to `/sign-in?callbackUrl=%2Ffirm&view=firm`
- `/user` returns `307` to `/sign-in?callbackUrl=%2Fuser&view=individual`
- `/admin` returns `307` to `/sign-in?callbackUrl=%2Fadmin&view=admin`

## PAT surface validator result

Command used against the isolated runtime:

```bash
PORT=3310 node scripts/release/validate-pat-surfaces.mjs --root /Users/camerongarrett/work/c2acct-live --base-url http://127.0.0.1:3310
```

Result:

- `ok: true`
- browser, API, and operator fingerprints agreed
- `/login` remained compatibility-only
- protected PAT routes remained canonical redirects
- no AAE markers were reported

## Regression check

No forbidden AAE copy was found in the captured isolated runtime HTML:

- `AAE`
- `Autonomous Alignment Infrastructure for Accounting Firms.`
- `Profiles`
- `Top Seven Outputs`
- `Alignment Survey`
- `Beta access is restricted to pre-approved GitHub accounts`

## Note

This repair restores standalone shell completeness.

It does not by itself make `npm run release:prelaunch` green on the current dirty working tree. Source-integrity can still fail on dirty launch-critical runtime files until those are reconciled separately.
