# CORE BUILD AAE

## Current source-of-truth docs
- Repo entrypoint: `README.md`
- Active repo map: `docs/active-repo-map.md`
- Audit summary: `docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md`
- Runtime hardening snapshot: `docs/architecture/runtime-hardening-status-2026-03-08.md`
- Auth contract: `docs/architecture/auth-env-contract.md`
- Mac mini operations: `ops/mac-mini/README.md`

## Archived material
- Generated audit/session logs from 2026-03-05 were moved to `docs/archive/audit-logs-2026-03-05/`.
- One-off or obsolete scripts were moved under `scripts/archive/`.

## Operational note
- `prisma/seed.ts` is the canonical baseline seed for the current product shape.
- Keep placeholder 404 handlers explicit; do not revive them without a live product requirement.
