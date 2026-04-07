#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "usage: bash scripts/export-codebase-safe.sh /absolute/or/relative/output-dir" >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
destination="$1"

mkdir -p "$destination"

rsync -a \
  --exclude='.git' \
  --exclude='.git/' \
  --exclude='.env*' \
  --exclude='.envrc' \
  --exclude='.direnv/' \
  --exclude='.next/' \
  --exclude='node_modules/' \
  --exclude='artifacts/mac-mini/' \
  --exclude='logs/' \
  --exclude='playwright-report/' \
  --exclude='test-results/' \
  --exclude='blob-report/' \
  --exclude='coverage/' \
  --exclude='.tmp/' \
  --exclude='tmp/' \
  --exclude='*.log' \
  --exclude='*.tmp' \
  --exclude='*.temp' \
  --exclude='*.zip' \
  --exclude='*.tar' \
  --exclude='*.tar.gz' \
  --exclude='*.tgz' \
  --exclude='.DS_Store' \
  --exclude='agent-work/' \
  "$repo_root/" "$destination/"

printf 'Sanitized export created at %s\n' "$destination"
printf 'Excluded: .git .git/ .env* .next node_modules logs artifacts/mac-mini temp files test artifacts archives\n'
