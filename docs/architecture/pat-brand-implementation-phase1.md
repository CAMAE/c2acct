# PAT Brand Implementation Phase 1

This repo now implements one shared brand rule across the active product surface:

- `C2Acct` is the parent and corporate identity.
- `PAT` is the platform and workspace identity.
- Corporate entry surfaces should explain the platform.
- Protected product surfaces should feel like one calm institutional system, not separate prototypes.

Phase 1 implementation rules:

- Shared tokens live in `app/globals.css`.
- Dark premium hero surfaces signal platform entry, readiness, and operator control.
- Protected dashboard and assessment panels use the same light card system, border rhythm, and typography.
- Buttons, inputs, banners, and question states use shared PAT classes instead of page-local inline styling.
- Copy should stay direct: low hype, explicit limits, and visible evidence for what is unlocked now.

Implemented now:

- unified PAT/C2 shell metadata and footer language
- shared brand tokens for panel, accent, status, and form states
- assessment runtime refactored onto shared PAT classes
- home, login, survey, results, outputs, profiles, and admin aligned to the same surface language

Not implemented yet:

- custom hosted brand fonts
- dedicated illustration/icon system
- full component extraction for every page-local card variant
- branded marketing/corporate content beyond the active product shell
