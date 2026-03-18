#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || {
  echo "Usage: $0 [--dry-run]" >&2
  exit 2
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "setup-mac-mini" \
    "Create artifact, log, status, heartbeat, and LaunchAgent directories" \
    "Check for bash, git, node, npm, and optional plutil" \
    "Print the local setup contract for a macOS host"
  exit 0
fi

mkdir -p \
  "${HOME}/Library/LaunchAgents" \
  "${MAC_MINI_ROOT}" \
  "${LOG_DIR}" \
  "${STATUS_DIR}" \
  "${HEARTBEAT_DIR}" \
  "${RUN_DIR}" \
  "${EXPORT_DIR}"

for tool in bash git node npm; do
  require_command "${tool}"
done

cat <<EOF
AAE/C2Acct Mac mini setup contract
- Repo root: ${ROOT_DIR}
- Artifact root: ${MAC_MINI_ROOT}
- LaunchAgents: ${HOME}/Library/LaunchAgents
- Required env: copy a valid .env.local before host execution
- Required dependencies: bash git node npm
- Optional validator: plutil

Next steps
1. bash scripts/mac-mini/bootstrap-mac-mini.sh
2. bash scripts/mac-mini/install-launch-agents.sh --dry-run
3. bash scripts/mac-mini/run-nightly-verification.sh --dry-run
4. bash scripts/mac-mini/healthcheck.sh --dry-run
EOF
