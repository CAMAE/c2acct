#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_ensure_dirs
mac_mini_load_env

printf 'branch=%s\n' "$(mac_mini_git_branch)"
printf 'commit=%s\n' "$(mac_mini_git_commit)"
printf 'git_dirty=%s\n' "$(mac_mini_git_dirty)"
