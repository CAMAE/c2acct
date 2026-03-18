#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MAC_MINI_ROOT="${ROOT_DIR}/artifacts/mac-mini"
LOG_DIR="${MAC_MINI_ROOT}/logs"
STATUS_DIR="${MAC_MINI_ROOT}/status"
HEARTBEAT_DIR="${MAC_MINI_ROOT}/heartbeats"
RUN_DIR="${MAC_MINI_ROOT}/runs"
EXPORT_DIR="${ROOT_DIR}/artifacts/audit-bundles/latest"
DRY_RUN=0

mkdir -p "${LOG_DIR}" "${STATUS_DIR}" "${HEARTBEAT_DIR}" "${RUN_DIR}" "${EXPORT_DIR}"

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

ensure_parent_dir() {
  mkdir -p "$(dirname "$1")"
}

write_file() {
  local path="$1"
  shift
  ensure_parent_dir "${path}"
  printf "%s\n" "$@" > "${path}"
}

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

write_status_json() {
  local file_path="$1"
  local job_name="$2"
  local status="$3"
  local started_at="$4"
  local finished_at="$5"
  local exit_code="$6"
  local attempt="$7"
  local max_attempts="$8"
  local stdout_log="$9"
  local stderr_log="${10}"
  local heartbeat_file="${11}"
  local artifact_path="${12}"
  local note="${13}"

  write_file "${file_path}" \
    "{" \
    "  \"job\": \"$(json_escape "${job_name}")\"," \
    "  \"status\": \"$(json_escape "${status}")\"," \
    "  \"startedAt\": \"$(json_escape "${started_at}")\"," \
    "  \"finishedAt\": \"$(json_escape "${finished_at}")\"," \
    "  \"exitCode\": ${exit_code}," \
    "  \"attempt\": ${attempt}," \
    "  \"maxAttempts\": ${max_attempts}," \
    "  \"stdoutLog\": \"$(json_escape "${stdout_log}")\"," \
    "  \"stderrLog\": \"$(json_escape "${stderr_log}")\"," \
    "  \"heartbeat\": \"$(json_escape "${heartbeat_file}")\"," \
    "  \"artifactPath\": \"$(json_escape "${artifact_path}")\"," \
    "  \"dryRun\": ${DRY_RUN}," \
    "  \"note\": \"$(json_escape "${note}")\"" \
    "}"
}

write_heartbeat_json() {
  local file_path="$1"
  local job_name="$2"
  local phase="$3"
  local timestamp="$4"
  local note="$5"

  write_file "${file_path}" \
    "{" \
    "  \"job\": \"$(json_escape "${job_name}")\"," \
    "  \"phase\": \"$(json_escape "${phase}")\"," \
    "  \"timestamp\": \"$(json_escape "${timestamp}")\"," \
    "  \"note\": \"$(json_escape "${note}")\"" \
    "}"
}

parse_common_args() {
  while (($#)); do
    case "$1" in
      --dry-run)
        DRY_RUN=1
        ;;
      *)
        return 1
        ;;
    esac
    shift
  done
  return 0
}

print_job_plan() {
  local job_name="$1"
  shift
  printf '[dry-run] %s\n' "${job_name}"
  local index=1
  for step in "$@"; do
    printf '  %s. %s\n' "${index}" "${step}"
    index=$((index + 1))
  done
}

run_with_timeout() {
  local timeout_seconds="$1"
  shift

  if command -v perl >/dev/null 2>&1; then
    perl -e 'alarm shift @ARGV; exec @ARGV' "${timeout_seconds}" "$@"
  else
    "$@"
  fi
}

macmini_run_job() {
  local job_name="$1"
  local timeout_seconds="$2"
  local max_attempts="$3"
  local artifact_path="$4"
  shift 4
  local -a command=("$@")

  local stdout_log="${LOG_DIR}/${job_name}.stdout.log"
  local stderr_log="${LOG_DIR}/${job_name}.stderr.log"
  local status_file="${STATUS_DIR}/${job_name}.json"
  local heartbeat_file="${HEARTBEAT_DIR}/${job_name}.json"
  local started_at
  started_at="$(timestamp_utc)"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    write_heartbeat_json "${heartbeat_file}" "${job_name}" "dry-run" "$(timestamp_utc)" "Dry run only; job not executed."
    write_status_json "${status_file}" "${job_name}" "dry-run" "${started_at}" "$(timestamp_utc)" 0 0 "${max_attempts}" "${stdout_log}" "${stderr_log}" "${heartbeat_file}" "${artifact_path}" "Dry-run preview only."
    print_job_plan "${job_name}" "${command[*]}"
    return 0
  fi

  : > "${stdout_log}"
  : > "${stderr_log}"
  write_heartbeat_json "${heartbeat_file}" "${job_name}" "starting" "${started_at}" "Job starting."

  local attempt=1
  local exit_code=1
  while ((attempt <= max_attempts)); do
    write_heartbeat_json "${heartbeat_file}" "${job_name}" "running" "$(timestamp_utc)" "Attempt ${attempt} of ${max_attempts}"
    {
      printf '[%s] job=%s attempt=%s command=%s\n' "$(timestamp_utc)" "${job_name}" "${attempt}" "${command[*]}"
      run_with_timeout "${timeout_seconds}" "${command[@]}"
    } >> "${stdout_log}" 2>> "${stderr_log}" && exit_code=0 || exit_code=$?

    if [[ "${exit_code}" -eq 0 ]]; then
      write_heartbeat_json "${heartbeat_file}" "${job_name}" "ok" "$(timestamp_utc)" "Job finished successfully."
      write_status_json "${status_file}" "${job_name}" "ok" "${started_at}" "$(timestamp_utc)" 0 "${attempt}" "${max_attempts}" "${stdout_log}" "${stderr_log}" "${heartbeat_file}" "${artifact_path}" "Completed successfully."
      return 0
    fi

    printf '[%s] job=%s attempt=%s exit=%s\n' "$(timestamp_utc)" "${job_name}" "${attempt}" "${exit_code}" >> "${stderr_log}"
    if ((attempt < max_attempts)); then
      local backoff=$((attempt * 5))
      write_heartbeat_json "${heartbeat_file}" "${job_name}" "retrying" "$(timestamp_utc)" "Retrying after ${backoff}s backoff."
      sleep "${backoff}"
    fi
    attempt=$((attempt + 1))
  done

  write_heartbeat_json "${heartbeat_file}" "${job_name}" "failed" "$(timestamp_utc)" "Job failed after ${max_attempts} attempt(s)."
  write_status_json "${status_file}" "${job_name}" "failed" "${started_at}" "$(timestamp_utc)" "${exit_code}" "$((attempt - 1))" "${max_attempts}" "${stdout_log}" "${stderr_log}" "${heartbeat_file}" "${artifact_path}" "See stderr log for failure detail."
  return "${exit_code}"
}

require_command() {
  local command_name="$1"
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}" >&2
    return 1
  fi
  return 0
}
