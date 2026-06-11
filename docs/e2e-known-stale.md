# Known-stale e2e specs (full `pnpm test:e2e` suite)

Triaged 2026-06-11 during the self-signup build. All seven failures below
pre-date that work (verified by stash-baseline against 7f02c6e2) and trace to
the demo-week visual/navigation rework (commits 59dbae1f / 4bb0d20a, June
9–10), which changed toggle treatment, panel-history pushes, and the firm
insight hero without updating these specs. They assert retired design intent,
so each needs a product decision — they are NOT one-line selector fixes.

The validation chain (`test:e2e:local-review`, `release:prelaunch`,
`validate:launch`) does not run these specs; they only fail under the full
`pnpm test:e2e` suite.

| Spec | One-line cause |
| --- | --- |
| `firm-portal-toggle-visual.spec.ts:125` | Asserts active toggle has a non-`none` depth shadow; that treatment was removed in the navigation-cursor band-aid sweep. |
| `pat-mode-toggle-audit.spec.ts:133` | Same root — "vendor portal active depth should be distinct" expects the retired shadow. |
| `pat-panel-history.spec.ts:125` | Back-history from `/firm` now exits to `/sign-in/firm`; history/auth interplay changed. |
| `pat-panel-history.spec.ts:151` | One "back" after mode changes lands on `/vendor` instead of staying on `/vendor/product-assessment`. |
| `pat-panel-history.spec.ts:174` | Same — vendor product-insight detail falls back to the slice root after surface changes. |
| `pat-panel-history.spec.ts:210` | Same — vendor alignment detail falls back to `/vendor/alignment-insights`. |
| `pat-panel-history.spec.ts:240` | Anchors on the "Current PAT picture" heading, replaced by the Day-1 chart-kit hero on firm insight pages. |

Fixed in the same triage (no longer stale): `release-integrity.spec.ts`
(footer "a Patalign™ product" strict-mode ambiguity → `exact: true`),
`pat-signin-canonical.spec.ts:20` (visible "Landing route:" panel removed →
assert the hidden `redirectTo` input), and the prelaunch surface manifest's
sign-in markers (`ops/release/pat-surface-manifest.json`).

**Decision needed per spec:** either the new behavior is intended (rewrite the
spec to pin it) or the rework regressed it (fix the app). The panel-history
trio (151/174/210) looks most like a real regression — "one back exits the
detail panel" was an explicitly designed guarantee.
