#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required for this repo. Enable Corepack or install pnpm, then rerun this bootstrap." >&2
  exit 1
fi

echo "==> pnpm install"
pnpm install

echo "==> pnpm prisma:generate"
pnpm prisma:generate

cat <<'EOF'

Bootstrap complete.

Next steps:
1. Create `.env.local` with the PAT runtime env vars you need for this machine.
2. Start the local database with `pnpm db:up` or `pnpm db:recreate` before migrations/seeds.
3. Run `pnpm prisma:migrate:local`, `pnpm seed:baseline`, and `pnpm seed:pat-runtime` when the DB is ready.
4. Build once with `pnpm build`, then use `pnpm standalone:local` for the canonical local standalone runtime.
5. Use `pnpm validate:db` or `pnpm validate:launch` for full PAT validation.
EOF
