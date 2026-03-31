# Brand Asset Inventory Phase 2

## Scope

This phase is limited to exact brand asset ingestion and registry correction.
No UI redesign, auth changes, copy rewrites, or JSX/CSS-drawn marks are part of this update.

## Exact local source paths used

- C2 primary uploaded logo:
  `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2 LOGO.png`
- PAT primary uploaded logo:
  `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/PAT LOGO.png`
- Combined uploaded logo:
  `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2 : PAT LOGO COMBO.png`
- C2 style guide inspected for palette continuity:
  `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/C2 Logo 2/C2 Logo/C2_style guide.pdf`
- Previously extracted Barlow directory already present locally:
  `/Users/camerongarrett/Documents/Documents - Cameron’s Mac mini/Barlow/`

## Exact repo paths created or updated

- C2 primary mark:
  `public/brand/c2/c2-logo-accounting.png`
- PAT primary mark:
  `public/brand/pat/pat-logo-accounting.png`
- Combined supportive mark:
  `public/brand/combined/c2-pat-logo-combined.png`

## Authoritative files

- Primary C2 implementation file:
  `public/brand/c2/c2-logo-accounting.png`
- Primary PAT implementation file:
  `public/brand/pat/pat-logo-accounting.png`
- Supportive combined implementation file:
  `public/brand/combined/c2-pat-logo-combined.png`
- Source-of-truth asset registry:
  `lib/brand/assets.ts`

## Usage rule

- The separate C2 and PAT logos are the required primary implementation.
- The combined C2/PAT mark is supportive and must not be the default primary home or header lockup unless a specific surface explicitly calls for it.
- Active brand components must use real ingested image assets, not invented fallback geometry or JSX-drawn approximations.

## Color source of truth

- C2 blue: `#063674`
- Light blue: `#4FBFE2`
- Accounting green: `#33E573`
- Orange: `#FC4713`
- Charcoal: `#202020`
- Cream: `#F1F2EE`

## Current implementation note

- The current division accent remains accounting green.
- The active lockup uses separate image-backed C2 and PAT marks.
- Legacy C2 raster/vector exports remain in `public/brand/c2/` for compatibility, but the primary runtime registry points to the exact uploaded C2 logo file above.
