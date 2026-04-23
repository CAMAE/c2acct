#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

strict="no"
for arg in "$@"; do
  case "${arg}" in
    --check) strict="yes" ;;
    *) ;;
  esac
done

mac_mini_require_cmd node
mac_mini_require_cmd lsof
mac_mini_require_cmd ps
mac_mini_ensure_dirs
mac_mini_load_contract
mac_mini_load_env

trim_spaces() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//'
}

read_key_value_var() {
  local payload="$1"
  local target_key="$2"
  local line key value
  while IFS= read -r line; do
    [ -n "${line}" ] || continue
    key="${line%%=*}"
    value="${line#*=}"
    if [ "${key}" = "${target_key}" ]; then
      printf '%s' "${value}"
      return 0
    fi
  done <<< "${payload}"
  return 1
}

parse_live_fingerprint_env() {
  local payload_file="$1"
  node --input-type=module -e '
    import fs from "node:fs";
    const payload = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const fingerprint = payload?.fingerprint ?? {};
    const fields = {
      live_release_id: fingerprint.releaseId ?? "missing",
      live_commit_sha: fingerprint.commitSha ?? "missing",
      live_auth_mode: fingerprint.authMode ?? "missing",
      live_build_id: fingerprint.buildId ?? "missing",
      live_release_fingerprint_seed: fingerprint.releaseFingerprintSeed ?? "missing",
    };
    for (const [key, value] of Object.entries(fields)) {
      process.stdout.write(`${key}=${String(value)}\n`);
    }
  ' "${payload_file}"
}

app_launchd_target="gui/${UID}/${MAC_MINI_APP_LABEL}"
launchd_state="unsupported"
launchd_pid="missing"

if mac_mini_has_launchctl; then
  launchd_state="not-loaded"
  if launchd_output="$(launchctl print "${app_launchd_target}" 2>&1)"; then
    launchd_state="loaded"
    launchd_pid="$(printf '%s\n' "${launchd_output}" | awk -F'= ' '/pid = / {gsub(/^[[:space:]]+|[[:space:]]+$/, "", $2); print $2; exit}')"
    launchd_pid="${launchd_pid:-missing}"
  fi
fi

listening="no"
port_owner_state="no-listener"
port_owner_pid="missing"
port_owner_command="missing"
port_owner_user="missing"
port_owner_command_line="missing"
listen_output="$(lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "${listen_output}" ]; then
  listening="yes"
  port_owner_pid="$(printf '%s\n' "${listen_output}" | awk 'NR==2 { print $2; exit }')"
  port_owner_command="$(printf '%s\n' "${listen_output}" | awk 'NR==2 { print $1; exit }')"
  port_owner_user="$(printf '%s\n' "${listen_output}" | awk 'NR==2 { print $3; exit }')"
  if port_owner_command_line_raw="$(ps -p "${port_owner_pid}" -o command= 2>/dev/null || true)"; then
    port_owner_command_line="$(printf '%s' "${port_owner_command_line_raw}" | head -n 1 | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
    port_owner_command_line="$(trim_spaces "${port_owner_command_line:-missing}")"
    [ -n "${port_owner_command_line}" ] || port_owner_command_line="unavailable"
  else
    port_owner_command_line="unavailable"
  fi

  if [ "${launchd_state}" = "loaded" ] && [ "${launchd_pid}" = "${port_owner_pid}" ]; then
    port_owner_state="launchd-owned"
  else
    port_owner_state="stale-listener"
  fi
fi

api_status="000"
api_error="none"
live_release_id="missing"
live_commit_sha="missing"
live_auth_mode="missing"
live_build_id="missing"
live_release_fingerprint_seed="missing"
homepage_probe_ok="no"
homepage_probe_http="missing"
homepage_release_id="missing"
homepage_missing_pat_markers=""
homepage_forbidden_markers=""
homepage_failures=""
api_body_file="$(mktemp "${TMPDIR:-/tmp}/pat-live-release.XXXXXX")"
homepage_probe_file="$(mktemp "${TMPDIR:-/tmp}/pat-homepage-proof.XXXXXX")"
homepage_probe_status=1
trap 'rm -f "${api_body_file}"' EXIT
trap 'rm -f "${api_body_file}" "${homepage_probe_file}"' EXIT

app_base_url="$(mac_mini_app_url | sed 's#/$##')"
if [ "${listening}" = "yes" ]; then
  if api_status="$(curl -sS --max-time 5 -o "${api_body_file}" -w '%{http_code}' "${app_base_url}/api/release-fingerprint" 2>/dev/null)"; then
    if [ "${api_status}" = "200" ]; then
      if live_env="$(parse_live_fingerprint_env "${api_body_file}" 2>/dev/null)"; then
        live_release_id="$(read_key_value_var "${live_env}" live_release_id || printf 'missing')"
        live_commit_sha="$(read_key_value_var "${live_env}" live_commit_sha || printf 'missing')"
        live_auth_mode="$(read_key_value_var "${live_env}" live_auth_mode || printf 'missing')"
        live_build_id="$(read_key_value_var "${live_env}" live_build_id || printf 'missing')"
        live_release_fingerprint_seed="$(read_key_value_var "${live_env}" live_release_fingerprint_seed || printf 'missing')"
      else
        api_error="invalid_fingerprint_payload"
      fi
    else
      api_error="http_${api_status}"
    fi
  else
    api_status="000"
    api_error="request_failed"
  fi
fi

if [ "${listening}" = "yes" ]; then
  if (
    cd "${MAC_MINI_ROOT}" &&
    node --import tsx scripts/startup-guard.ts verify-base-url --kind standalone --base-url "${app_base_url}" --format env
  ) >"${homepage_probe_file}" 2>/dev/null; then
    homepage_probe_status=0
  else
    homepage_probe_status=$?
  fi

  if [ -s "${homepage_probe_file}" ]; then
    homepage_probe_payload="$(cat "${homepage_probe_file}")"
    homepage_probe_ok="$(read_key_value_var "${homepage_probe_payload}" homepage_probe_ok || printf 'no')"
    homepage_probe_http="$(read_key_value_var "${homepage_probe_payload}" homepage_probe_http || printf 'missing')"
    homepage_release_id="$(read_key_value_var "${homepage_probe_payload}" homepage_release_id || printf 'missing')"
    homepage_missing_pat_markers="$(read_key_value_var "${homepage_probe_payload}" homepage_missing_pat_markers || printf '')"
    homepage_forbidden_markers="$(read_key_value_var "${homepage_probe_payload}" homepage_forbidden_markers || printf '')"
    homepage_failures="$(read_key_value_var "${homepage_probe_payload}" homepage_failures || printf '')"
  fi
fi

expected_env="$(cd "${MAC_MINI_ROOT}" && node --import tsx scripts/release/read-release-fingerprint.ts --format env)"
expected_release_id="$(read_key_value_var "${expected_env}" release_id || printf 'missing')"
expected_commit_sha="$(read_key_value_var "${expected_env}" fingerprint_commit_sha || printf 'missing')"
expected_auth_mode="$(read_key_value_var "${expected_env}" fingerprint_auth_mode || printf 'missing')"
expected_build_id="$(read_key_value_var "${expected_env}" fingerprint_build_id || printf 'missing')"
expected_release_fingerprint_seed="$(read_key_value_var "${expected_env}" fingerprint_release_fingerprint_seed || printf 'missing')"

failures=()
if [ "${launchd_state}" != "loaded" ]; then
  failures+=("launchd_not_loaded")
fi

if [ "${listening}" != "yes" ]; then
  failures+=("no_listener_on_pat_port")
fi

if [ "${listening}" = "yes" ] && [ "${port_owner_state}" != "launchd-owned" ]; then
  failures+=("non_launchd_port_owner")
fi

if [ "${listening}" = "yes" ] && [ "${api_status}" != "200" ]; then
  failures+=("live_release_endpoint_unavailable")
fi

if [ "${listening}" = "yes" ] && [ "${homepage_probe_status}" != "0" ]; then
  failures+=("homepage_not_pat")
fi

if [ "${api_status}" = "200" ] && [ "${live_release_id}" != "${expected_release_id}" ]; then
  failures+=("release_id_mismatch")
fi

if [ "${api_status}" = "200" ] && [ "${live_commit_sha}" != "${expected_commit_sha}" ]; then
  failures+=("commit_sha_mismatch")
fi

if [ "${api_status}" = "200" ] && [ "${live_auth_mode}" != "${expected_auth_mode}" ]; then
  failures+=("auth_mode_mismatch")
fi

if [ "${api_status}" = "200" ] && [ "${live_build_id}" != "${expected_build_id}" ]; then
  failures+=("build_id_mismatch")
fi

if [ "${api_status}" = "200" ] && [ "${live_release_fingerprint_seed}" != "${expected_release_fingerprint_seed}" ]; then
  failures+=("fingerprint_seed_mismatch")
fi

printf 'launchd_target=%s\n' "${app_launchd_target}"
printf 'launchd_service_state=%s\n' "${launchd_state}"
printf 'launchd_service_pid=%s\n' "${launchd_pid}"
printf 'live_port_listening=%s\n' "${listening}"
printf 'live_port_owner_state=%s\n' "${port_owner_state}"
printf 'live_port_owner_pid=%s\n' "${port_owner_pid}"
printf 'live_port_owner_command=%s\n' "${port_owner_command}"
printf 'live_port_owner_user=%s\n' "${port_owner_user}"
printf 'live_port_owner_command_line=%s\n' "${port_owner_command_line}"
printf 'live_release_probe_http=%s\n' "${api_status}"
printf 'live_release_probe_error=%s\n' "${api_error}"
printf 'live_release_id=%s\n' "${live_release_id}"
printf 'live_commit_sha=%s\n' "${live_commit_sha}"
printf 'live_auth_mode=%s\n' "${live_auth_mode}"
printf 'live_build_id=%s\n' "${live_build_id}"
printf 'live_release_fingerprint_seed=%s\n' "${live_release_fingerprint_seed}"
printf 'expected_release_id=%s\n' "${expected_release_id}"
printf 'expected_commit_sha=%s\n' "${expected_commit_sha}"
printf 'expected_auth_mode=%s\n' "${expected_auth_mode}"
printf 'expected_build_id=%s\n' "${expected_build_id}"
printf 'expected_release_fingerprint_seed=%s\n' "${expected_release_fingerprint_seed}"
printf 'homepage_probe_ok=%s\n' "${homepage_probe_ok}"
printf 'homepage_probe_http=%s\n' "${homepage_probe_http}"
printf 'homepage_release_id=%s\n' "${homepage_release_id}"
printf 'homepage_missing_pat_markers=%s\n' "${homepage_missing_pat_markers}"
printf 'homepage_forbidden_markers=%s\n' "${homepage_forbidden_markers}"
printf 'homepage_failures=%s\n' "${homepage_failures}"

if [ "${#failures[@]}" -gt 0 ]; then
  printf 'ownership_check=fail\n'
  printf 'ownership_failures=%s\n' "$(IFS=,; printf '%s' "${failures[*]}")"
  if [ "${strict}" = "yes" ]; then
    exit 1
  fi
else
  printf 'ownership_check=pass\n'
  printf 'ownership_failures=\n'
fi
