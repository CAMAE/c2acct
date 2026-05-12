#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd node
mac_mini_ensure_dirs
mac_mini_load_env

cd "${MAC_MINI_ROOT}"

node --import tsx scripts/mac-mini/chatops-dispatch.ts status --dry-run --actor self-test
node --import tsx scripts/mac-mini/chatops-dispatch.ts health --dry-run --actor self-test
node --import tsx scripts/mac-mini/chatops-dispatch.ts restart --dry-run --actor self-test
node --import tsx scripts/mac-mini/chatops-dispatch.ts verify --dry-run --actor self-test
node --import tsx scripts/mac-mini/chatops-dispatch.ts logs --dry-run --actor self-test
node --import tsx scripts/mac-mini/chatops-dispatch.ts latest-deploy --dry-run --actor self-test
node --import tsx scripts/mac-mini/chatops-dispatch.ts current-revision --dry-run --actor self-test
node --import tsx scripts/mac-mini/chatops-dispatch.ts recent-failures --dry-run --actor self-test
node --import tsx scripts/mac-mini/chatops-dispatch.ts launch-readiness --dry-run --actor self-test

printf 'PASS chatops-self-test\n'
