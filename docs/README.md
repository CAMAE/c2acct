# Patalign Docs — Index

**How to read this folder:** everything current lives in a themed subdirectory. `archive/` is historical — do not treat anything in it as current guidance.

| Directory | What's in it | Status |
|---|---|---|
| `agents/` | Agent system: README, operations runbook, vertical packs, approval architecture, internal-knowledge design | **Current** |
| `architecture/` | System design: tenancy invariants, scoring/badge semantics, e2e parallelism, repo conventions | **Current** |
| `pilot/` | Pilot launch: june-1 go/no-go signoff, pilot ops | **Current** |
| `release/` | Release promotion semantics, launch-proof process | **Current** |
| `runbooks/` | Operator how-tos: Mac mini setup, terminal bring-up | **Current** |
| `status/` | Dated point-in-time status snapshots (most recent file = latest state; `PATALIGN-STATUS-2026-09-04.md` is the Forge→successor handoff: laws, gated queue, tooling) | Snapshot |
| `audit/` | Historical audits (WS-series, day-series reconciliations) | Historical |
| `plan/`, `research/`, `rebuild/`, `incidents/` | Topic-specific working docs | Mixed |
| `archive/` | Superseded docs (81 files) | **Stale — reference only** |

Loose files at `docs/` root: `active-repo-map.md` (repo map), `CORE_BUILD_AAE.md` (foundational build guide) and `DEPLOY-NIGHT.md` (the deploy-night runbook; preflight = `pnpm deploy-night:preflight`).

After moving or adding docs, re-run the knowledge indexer so citations stay fresh:
`pnpm exec tsx scripts/agents/index-knowledge.ts`
