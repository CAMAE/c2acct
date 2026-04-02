#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mode="install"
for arg in "$@"; do
  case "${arg}" in
    --check) mode="check" ;;
    --dry-run) mode="dry-run" ;;
    *) ;;
  esac
done

mac_mini_require_cmd plutil
mac_mini_require_cmd node
mac_mini_require_cmd git
mac_mini_require_cmd shasum
mac_mini_ensure_dirs
mac_mini_load_contract
mac_mini_load_env
mac_mini_assert_runtime_root_allowed
mac_mini_assert_clean_root
mac_mini_assert_env_ready

template_dir="${MAC_MINI_ROOT}/ops/mac-mini/launchd"
app_template="${template_dir}/${MAC_MINI_APP_LABEL}.plist.template"
verify_template="${template_dir}/${MAC_MINI_VERIFY_LABEL}.plist.template"
app_rendered="${MAC_MINI_LAUNCHD_DIR}/${MAC_MINI_APP_LABEL}.plist"
verify_rendered="${MAC_MINI_LAUNCHD_DIR}/${MAC_MINI_VERIFY_LABEL}.plist"
app_agent_path="$(mac_mini_launch_agent_path "${MAC_MINI_APP_LABEL}")"
verify_agent_path="$(mac_mini_launch_agent_path "${MAC_MINI_VERIFY_LABEL}")"

if [ ! -f "${app_template}" ] || [ ! -f "${verify_template}" ]; then
  echo "Launchd templates are missing under ops/mac-mini/launchd." >&2
  exit 1
fi

if [ ! -d "${MAC_MINI_ROOT}/node_modules" ]; then
  echo "node_modules is missing. Run 'pnpm install' before installing launch agents." >&2
  exit 1
fi

render_template() {
  local input="$1"
  local output="$2"

  sed \
    -e "s#__ROOT__#${MAC_MINI_CANONICAL_ROOT}#g" \
    -e "s#__HOME__#${HOME}#g" \
    -e "s#__PORT__#${PORT}#g" \
    -e "s#__MAC_MINI_HOST__#${MAC_MINI_HOST}#g" \
    -e "s#__AUTH_MODE__#${MAC_MINI_AUTH_MODE}#g" \
    -e "s#__START_COMMAND__#${MAC_MINI_START_COMMAND}#g" \
    -e "s#__PATH__#${PATH}#g" \
    "${input}" > "${output}"
}

mac_mini_write_canonical_state "launchd-install-${mode}"
render_template "${app_template}" "${app_rendered}"
render_template "${verify_template}" "${verify_rendered}"
plutil -lint "${app_rendered}" >/dev/null
plutil -lint "${verify_rendered}" >/dev/null

if ! grep -q "${MAC_MINI_CANONICAL_ROOT}" "${app_rendered}"; then
  echo "Rendered app plist does not point at canonical root." >&2
  exit 1
fi

if ! grep -q "${MAC_MINI_CANONICAL_ROOT}" "${verify_rendered}"; then
  echo "Rendered verify plist does not point at canonical root." >&2
  exit 1
fi

if [ "${mode}" = "check" ]; then
  printf 'mode=check\n'
  printf 'canonical_root=%s\n' "${MAC_MINI_CANONICAL_ROOT}"
  printf 'auth_mode=%s\n' "${MAC_MINI_AUTH_MODE}"
  printf 'start_command=%s\n' "${MAC_MINI_START_COMMAND}"
  printf 'app_plist=%s\n' "${app_rendered}"
  printf 'verify_plist=%s\n' "${verify_rendered}"
  exit 0
fi

(cd "${MAC_MINI_ROOT}" && npm run release:prelaunch)

if [ "${mode}" = "dry-run" ]; then
  printf 'mode=dry-run\n'
  printf 'canonical_root=%s\n' "${MAC_MINI_CANONICAL_ROOT}"
  printf 'auth_mode=%s\n' "${MAC_MINI_AUTH_MODE}"
  printf 'start_command=%s\n' "${MAC_MINI_START_COMMAND}"
  printf 'app_plist=%s\n' "${app_rendered}"
  printf 'verify_plist=%s\n' "${verify_rendered}"
  exit 0
fi

mkdir -p "${HOME}/Library/LaunchAgents"
cp "${app_rendered}" "${app_agent_path}"
cp "${verify_rendered}" "${verify_agent_path}"

if mac_mini_has_launchctl; then
  launchctl bootout "gui/${UID}" "${app_agent_path}" >/dev/null 2>&1 || true
  launchctl bootout "gui/${UID}" "${verify_agent_path}" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/${UID}" "${app_agent_path}"
  launchctl bootstrap "gui/${UID}" "${verify_agent_path}"
  launchctl enable "gui/${UID}/${MAC_MINI_APP_LABEL}"
  launchctl enable "gui/${UID}/${MAC_MINI_VERIFY_LABEL}"
  launchctl kickstart -k "gui/${UID}/${MAC_MINI_APP_LABEL}"
else
  echo "launchctl is unavailable on this host. Plists were rendered but not bootstrapped." >&2
fi

printf 'Installed launch agents:\n%s\n%s\n' "${app_agent_path}" "${verify_agent_path}"
bash "${SCRIPT_DIR}/launchd-check.sh"
