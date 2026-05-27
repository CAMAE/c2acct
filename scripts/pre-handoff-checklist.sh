#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
PAT pre-handoff checklist

1. Run `pnpm secrets:scan` and resolve any findings before export.
2. Run `pnpm build` and `pnpm typecheck` so the handoff matches a green repo state.
3. Export with `pnpm export:safe -- /absolute/or/relative/output-dir`.
4. Verify the export does not contain `.git`, `.env*`, `.next`, `node_modules`, `logs`, `artifacts/mac-mini`, or temp files.
5. Zip only the sanitized export directory, never the live working tree.

Operator rule: never ship local auth cookies, runtime env files, DB dumps, ops artifacts, or build output.
EOF
