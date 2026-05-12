#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/common.sh"

mac_mini_require_cmd plutil
mac_mini_ensure_dirs
mac_mini_load_env
mac_mini_assert_env_ready
mac_mini_assert_chatops_env_ready

template_dir="${MAC_MINI_ROOT}/ops/mac-mini/launchd"
app_template="${template_dir}/${MAC_MINI_APP_LABEL}.plist.template"
verify_template="${template_dir}/${MAC_MINI_VERIFY_LABEL}.plist.template"
chatops_template="${template_dir}/${MAC_MINI_CHATOPS_LABEL}.plist.template"
watchdog_template="${template_dir}/${MAC_MINI_WATCHDOG_LABEL}.plist.template"
app_rendered="${MAC_MINI_LAUNCHD_DIR}/${MAC_MINI_APP_LABEL}.plist"
verify_rendered="${MAC_MINI_LAUNCHD_DIR}/${MAC_MINI_VERIFY_LABEL}.plist"
chatops_rendered="${MAC_MINI_LAUNCHD_DIR}/${MAC_MINI_CHATOPS_LABEL}.plist"
watchdog_rendered="${MAC_MINI_LAUNCHD_DIR}/${MAC_MINI_WATCHDOG_LABEL}.plist"
app_agent_path="$(mac_mini_launch_agent_path "${MAC_MINI_APP_LABEL}")"
verify_agent_path="$(mac_mini_launch_agent_path "${MAC_MINI_VERIFY_LABEL}")"
chatops_agent_path="$(mac_mini_launch_agent_path "${MAC_MINI_CHATOPS_LABEL}")"
watchdog_agent_path="$(mac_mini_launch_agent_path "${MAC_MINI_WATCHDOG_LABEL}")"

if [ ! -f "${app_template}" ] || [ ! -f "${verify_template}" ] || [ ! -f "${chatops_template}" ] || [ ! -f "${watchdog_template}" ]; then
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
    -e "s#__ROOT__#${MAC_MINI_ROOT}#g" \
    -e "s#__HOME__#${HOME}#g" \
    -e "s#__PORT__#${PORT}#g" \
    -e "s#__MAC_MINI_HOST__#${MAC_MINI_HOST}#g" \
    -e "s#__PATH__#${PATH}#g" \
    "${input}" > "${output}"
}

mkdir -p "${HOME}/Library/LaunchAgents"
render_template "${app_template}" "${app_rendered}"
render_template "${verify_template}" "${verify_rendered}"
render_template "${chatops_template}" "${chatops_rendered}"
render_template "${watchdog_template}" "${watchdog_rendered}"
plutil -lint "${app_rendered}" >/dev/null
plutil -lint "${verify_rendered}" >/dev/null
plutil -lint "${chatops_rendered}" >/dev/null
plutil -lint "${watchdog_rendered}" >/dev/null
cp "${app_rendered}" "${app_agent_path}"
cp "${verify_rendered}" "${verify_agent_path}"
cp "${chatops_rendered}" "${chatops_agent_path}"
cp "${watchdog_rendered}" "${watchdog_agent_path}"

if mac_mini_has_launchctl; then
  launchctl bootout "gui/${UID}" "${app_agent_path}" >/dev/null 2>&1 || true
  launchctl bootout "gui/${UID}" "${verify_agent_path}" >/dev/null 2>&1 || true
  launchctl bootout "gui/${UID}" "${chatops_agent_path}" >/dev/null 2>&1 || true
  launchctl bootout "gui/${UID}" "${watchdog_agent_path}" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/${UID}" "${app_agent_path}"
  launchctl bootstrap "gui/${UID}" "${verify_agent_path}"
  launchctl bootstrap "gui/${UID}" "${chatops_agent_path}"
  launchctl bootstrap "gui/${UID}" "${watchdog_agent_path}"
  launchctl enable "gui/${UID}/${MAC_MINI_APP_LABEL}"
  launchctl enable "gui/${UID}/${MAC_MINI_VERIFY_LABEL}"
  launchctl enable "gui/${UID}/${MAC_MINI_CHATOPS_LABEL}"
  launchctl enable "gui/${UID}/${MAC_MINI_WATCHDOG_LABEL}"
  launchctl kickstart -k "gui/${UID}/${MAC_MINI_APP_LABEL}"
  launchctl kickstart -k "gui/${UID}/${MAC_MINI_CHATOPS_LABEL}"
  launchctl kickstart -k "gui/${UID}/${MAC_MINI_WATCHDOG_LABEL}"
else
  echo "launchctl is unavailable on this host. Plists were rendered but not bootstrapped." >&2
fi

printf 'Installed launch agents:\n%s\n%s\n%s\n%s\n' "${app_agent_path}" "${verify_agent_path}" "${chatops_agent_path}" "${watchdog_agent_path}"
bash "${SCRIPT_DIR}/launchd-check.sh"
