#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd node
mac_mini_ensure_dirs
mac_mini_load_env
mac_mini_assert_chatops_env_ready

cd "${MAC_MINI_ROOT}"
exec node --import tsx scripts/mac-mini/telegram-bot.ts
