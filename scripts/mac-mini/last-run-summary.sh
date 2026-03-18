#!/bin/bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

output_json=0
if [[ "${1:-}" == "--json" ]]; then
  output_json=1
fi

if [[ "${output_json}" -eq 1 ]]; then
  printf '{\n  "statusDir": "%s",\n  "jobs": [\n' "${STATUS_DIR}"
fi

first=1
for status_file in "${STATUS_DIR}"/*.json; do
  [[ -e "${status_file}" ]] || continue
  if [[ "${output_json}" -eq 1 ]]; then
    if [[ "${first}" -eq 0 ]]; then
      printf ',\n'
    fi
    first=0
    sed 's/^/    /' "${status_file}"
  else
    printf '=== %s ===\n' "$(basename "${status_file}")"
    cat "${status_file}"
    printf '\n'
  fi
done

if [[ "${output_json}" -eq 1 ]]; then
  printf '\n  ]\n}\n'
fi
