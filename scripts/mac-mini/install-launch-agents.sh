#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

parse_common_args "$@" || true
NO_LOAD=0
if [[ "${1:-}" == "--no-load" ]]; then
  NO_LOAD=1
elif [[ "${1:-}" == "--dry-run" && "${2:-}" == "--no-load" ]]; then
  NO_LOAD=1
fi

TARGET_DIR="${HOME}/Library/LaunchAgents"
STAGED_DIR="${MAC_MINI_ROOT}/launchd-installed"
mkdir -p "${TARGET_DIR}" "${STAGED_DIR}"

validate_plist() {
  local file_path="$1"
  if command -v plutil >/dev/null 2>&1; then
    plutil -lint "${file_path}" >/dev/null
  else
    python - <<'PY' "${file_path}"
import sys
import xml.etree.ElementTree as ET
ET.parse(sys.argv[1])
PY
  fi
}

if [[ "${DRY_RUN}" -eq 1 ]]; then
  print_job_plan "install-launch-agents" \
    "Render launchd plists with repo and artifact paths" \
    "Validate plist XML syntax" \
    "Copy to ~/Library/LaunchAgents" \
    "Optionally load them with launchctl on macOS"
  exit 0
fi

for template in "${ROOT_DIR}/ops/mac-mini/launchd/"*.plist; do
  rendered="${STAGED_DIR}/$(basename "${template}")"
  sed \
    -e "s#__ROOT__#${ROOT_DIR}#g" \
    -e "s#__ARTIFACT_ROOT__#${MAC_MINI_ROOT}#g" \
    "${template}" > "${rendered}"
  validate_plist "${rendered}"
  cp "${rendered}" "${TARGET_DIR}/"

  if [[ "${NO_LOAD}" -eq 0 ]] && command -v launchctl >/dev/null 2>&1; then
    launchctl unload "${TARGET_DIR}/$(basename "${template}")" >/dev/null 2>&1 || true
    launchctl load "${TARGET_DIR}/$(basename "${template}")"
  fi
done

echo "LaunchAgents staged in ${STAGED_DIR}"
echo "LaunchAgents installed to ${TARGET_DIR}"
if [[ "${NO_LOAD}" -eq 1 ]]; then
  echo "Launchctl load skipped by --no-load."
elif ! command -v launchctl >/dev/null 2>&1; then
  echo "launchctl not present in this host shell; install validated but not loaded."
fi
