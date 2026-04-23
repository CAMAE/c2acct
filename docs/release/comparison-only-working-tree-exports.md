# Comparison-Only Working-Tree Exports

Use comparison-only working-tree exports, sanitized handoff bundles, archived patches, and quarantined mixed-copy trees only as supporting comparison material.

They are not authoritative for release decisions.

## What is authoritative

- The canonical PAT repo root: `/Users/camerongarrett/work/c2acct-live`
- The current checkout state from `git branch --show-current`, `git rev-parse HEAD`, and `git status --short`
- The current attached runtime snapshot: branch `fix/local-review-signin-hotfix`, commit `668ff249b1e28cfadd206a9e14819dcb416ad365`, `gitDirty=dirty`; read the current build id from the latest attached release-proof artifacts rather than from this policy doc
- `docs/active-repo-map.md`
- Current source files, release validators, and runtime proof artifacts in the canonical repo

## What is not authoritative

- Shared stale comparison roots such as `/Users/camerongarrett/work/c2acct`
- Quarantined mixed copies such as `/private/tmp/c2acct-main-auth`
- Sanitized exports created for review, packaging, or handoff
- Archived dirty patches or recovery inventories
- `origin/main` when it diverges from the canonical PAT checkout truth
- The 2026-04-02 recovery, audit, and release snapshots when the current checkout has moved on

## Release-decision rule

Comparison-only material can justify a file-by-file investigation, but it must not override PAT route truth, auth truth, runtime truth, or release readiness decisions from the canonical repo. A dirty current checkout and an unproven host cutover still block launch, even when older historical snapshots looked healthier.
