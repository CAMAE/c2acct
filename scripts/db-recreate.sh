#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repo_root}"

legacy_container="c2acct-db"

echo "==> docker compose down -v --remove-orphans"
docker compose down -v --remove-orphans

if docker container inspect "${legacy_container}" >/dev/null 2>&1; then
  echo "==> removing stale legacy container ${legacy_container}"
  docker rm -f "${legacy_container}" >/dev/null
fi

echo "==> docker compose up -d db"
docker compose up -d db

echo "==> pnpm db:wait"
pnpm db:wait
