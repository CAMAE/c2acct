#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd npm
mac_mini_ensure_dirs
mac_mini_load_env
mac_mini_assert_env_ready

cd "${MAC_MINI_ROOT}"
npm run validate:patalign:prod
bash "${SCRIPT_DIR}/status.sh"
