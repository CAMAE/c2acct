#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
config_path="$repo_root/.gitleaks.toml"

if command -v gitleaks >/dev/null 2>&1; then
  exec gitleaks dir "$repo_root" --config "$config_path" --redact --no-banner
fi

if command -v docker >/dev/null 2>&1; then
  exec docker run --rm \
    -v "$repo_root:/repo" \
    zricethezav/gitleaks:latest \
    dir /repo --config /repo/.gitleaks.toml --redact --no-banner
fi

echo "gitleaks precheck unavailable: install gitleaks locally or use Docker Desktop, then rerun 'npm run secrets:scan'." >&2
exit 1
