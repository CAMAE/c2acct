# Brand Asset Inventory Phase 1

## Source packages inspected

- `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2 Logo - Style Guide.zip`
- `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2 Logo/C2 Logo/*`
- `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/Barlow/*`
- `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2Acct Inc Platform  Briefing pptx.pdf`

## Repo destinations

- C2 runtime artwork: `public/brand/c2/`
- Accounting division variants: `public/brand/divisions/accounting/`
- PAT runtime artwork: `public/brand/pat/`
- Local Barlow fonts: `app/fonts/barlow/`

## Authoritative files now in repo

- C2 primary runtime mark: `public/brand/c2/c2-main-blue.png`
- C2 primary source art: `public/brand/c2/c2-main-blue.eps`
- C2 white runtime mark: `public/brand/c2/c2-main-white.png`
- C2 icon runtime mark: `public/brand/c2/c2-icon.png`
- Accounting accent runtime mark: `public/brand/divisions/accounting/c2-accounting-green.png`
- Accounting white-accent runtime mark: `public/brand/divisions/accounting/c2-accounting-white-green.png`
- Barlow local runtime fonts:
  - `app/fonts/barlow/Barlow-Regular.ttf`
  - `app/fonts/barlow/Barlow-Medium.ttf`
  - `app/fonts/barlow/Barlow-SemiBold.ttf`
  - `app/fonts/barlow/Barlow-Bold.ttf`

## PAT asset status

- No standalone PAT source vector file was found in the inspected local upload packages or the repo.
- The active runtime PAT mark now uses `public/brand/pat/pat-logo-accounting.png`.
- That file is an exact raster crop from the local uploaded shell screenshot, not a redrawn approximation.

## Division color rule

- C2 base identity remains stable.
- Division accent changes by division.
- Accounting uses `#33E573`.
- PAT accent for accounting tracks the same division accent.

## Code source of truth

- Asset registry: `lib/brand/assets.ts`
- Local Barlow loader: `app/fonts/barlow.ts`
- Reusable asset-backed brand primitives: `app/components/brand/BrandMarks.tsx`
