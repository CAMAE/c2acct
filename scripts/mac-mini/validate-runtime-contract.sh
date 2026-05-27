#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mode="check"
for arg in "$@"; do
  case "${arg}" in
    --check) mode="check" ;;
    --dry-run) mode="dry-run" ;;
    *) ;;
  esac
done

mac_mini_require_cmd node
mac_mini_require_cmd git
mac_mini_require_cmd shasum
mac_mini_load_contract
mac_mini_load_env
mac_mini_assert_runtime_root_allowed
mac_mini_assert_clean_root
mac_mini_assert_env_ready
mac_mini_write_canonical_state "runtime-contract-${mode}"

printf 'mode=%s\n' "${mode}"
printf 'canonical_root=%s\n' "${MAC_MINI_CANONICAL_ROOT}"
printf 'branch=%s\n' "$(mac_mini_git_branch)"
printf 'commit_sha=%s\n' "$(mac_mini_git_commit_full)"
printf 'git_dirty=%s\n' "$(mac_mini_git_dirty)"
printf 'auth_mode=%s\n' "${MAC_MINI_AUTH_MODE}"
printf 'start_command=%s\n' "${MAC_MINI_START_COMMAND}"
printf 'release_fingerprint_seed=%s\n' "$(mac_mini_release_fingerprint_seed)"
