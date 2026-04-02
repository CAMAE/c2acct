#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mode="dry-run"
target_file=""

for arg in "$@"; do
  case "${arg}" in
    --apply) mode="apply" ;;
    --dry-run) mode="dry-run" ;;
    --target=*) target_file="${arg#*=}" ;;
  esac
done

mac_mini_require_cmd node
mac_mini_require_cmd git
mac_mini_load_contract

resolve_target_file() {
  if [ -n "${target_file}" ]; then
    printf '%s\n' "${target_file}"
    return
  fi

  for candidate in \
    "${MAC_MINI_STATE_DIR}/previous-known-good-release.json" \
    "${MAC_MINI_STATE_DIR}/last-known-good-release.json" \
    "${MAC_MINI_STATE_DIR}/expected-live-release.json"
  do
    if [ -f "${candidate}" ]; then
      printf '%s\n' "${candidate}"
      return
    fi
  done

  return 1
}

target_file="$(resolve_target_file)"
target_json="$(cat "${target_file}")"
target_root="$(printf '%s' "${target_json}" | node --input-type=module -e "let data=''; process.stdin.on('data', (c)=>data+=c); process.stdin.on('end', ()=>{ const parsed=JSON.parse(data); console.log(parsed.canonicalRoot ?? ''); });")"
target_commit="$(printf '%s' "${target_json}" | node --input-type=module -e "let data=''; process.stdin.on('data', (c)=>data+=c); process.stdin.on('end', ()=>{ const parsed=JSON.parse(data); console.log(parsed.commitSha ?? ''); });")"
target_release_id="$(printf '%s' "${target_json}" | node --input-type=module -e "let data=''; process.stdin.on('data', (c)=>data+=c); process.stdin.on('end', ()=>{ const parsed=JSON.parse(data); console.log(parsed.releaseId ?? ''); });")"
target_auth_mode="$(printf '%s' "${target_json}" | node --input-type=module -e "let data=''; process.stdin.on('data', (c)=>data+=c); process.stdin.on('end', ()=>{ const parsed=JSON.parse(data); console.log(parsed.authMode ?? ''); });")"

if [ "${target_root}" != "${MAC_MINI_CANONICAL_ROOT}" ]; then
  echo "Rollback target root mismatch: ${target_root}" >&2
  exit 1
fi

if [ "${target_auth_mode}" != "${MAC_MINI_AUTH_MODE}" ]; then
  echo "Rollback target auth mode mismatch: ${target_auth_mode}" >&2
  exit 1
fi

if ! git -C "${MAC_MINI_ROOT}" rev-parse --verify "${target_commit}^{commit}" >/dev/null 2>&1; then
  echo "Rollback target commit is unavailable locally: ${target_commit}" >&2
  exit 1
fi

if [ "${mode}" = "dry-run" ]; then
  printf 'mode=dry-run\n'
  printf 'target_file=%s\n' "${target_file}"
  printf 'target_release_id=%s\n' "${target_release_id}"
  printf 'target_root=%s\n' "${target_root}"
  printf 'target_commit=%s\n' "${target_commit}"
  printf 'target_auth_mode=%s\n' "${target_auth_mode}"
  printf 'rollback_command=git checkout --detach %s\n' "${target_commit}"
  exit 0
fi

mac_mini_assert_clean_root
git -C "${MAC_MINI_ROOT}" checkout --detach "${target_commit}"
printf '%s\n' "${target_json}" > "${MAC_MINI_STATE_DIR}/rollback-target.json"
printf 'rollback_applied_release_id=%s\n' "${target_release_id}"
printf 'rollback_applied_commit=%s\n' "${target_commit}"
