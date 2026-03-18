#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env.local"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ENV_CONTRACT_ERROR .env.local is missing. Copy .env.example to .env.local first."
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

required_vars=(
  DATABASE_URL
  AUTH_SECRET
  AUTH_URL
  AUTH_GITHUB_ID
  AUTH_GITHUB_SECRET
)

missing=()
for name in "${required_vars[@]}"; do
  value="${!name-}"
  if [[ -z "${value}" ]]; then
    missing+=("${name}")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "ENV_CONTRACT_ERROR missing required variables: ${missing[*]}"
  exit 1
fi

if [[ ! "${DATABASE_URL}" =~ ^postgres(ql)?:// ]]; then
  echo "ENV_CONTRACT_ERROR DATABASE_URL must start with postgres:// or postgresql://"
  exit 1
fi

if [[ ! "${AUTH_URL}" =~ ^https?:// ]]; then
  echo "ENV_CONTRACT_ERROR AUTH_URL must be an absolute http(s) URL"
  exit 1
fi

if [[ "${NODE_ENV-}" == "production" && "${ALLOW_PROD_DB_MIGRATIONS-}" != "1" ]]; then
  echo "ENV_CONTRACT_WARN NODE_ENV=production and ALLOW_PROD_DB_MIGRATIONS is not 1"
fi

db_host="$(printf '%s' "${DATABASE_URL}" | sed -E 's#^postgres(ql)?://[^@]+@([^/:?]+).*#\2#')"
db_port="$(printf '%s' "${DATABASE_URL}" | sed -nE 's#^postgres(ql)?://[^@]+@[^/:?]+:([0-9]+).*#\2#p')"
db_name="$(printf '%s' "${DATABASE_URL}" | sed -E 's#^postgres(ql)?://[^@]+@[^/]+/([^?]+).*#\2#')"

echo "ENV_CONTRACT_OK"
echo "AUTH_URL=${AUTH_URL}"
echo "DATABASE_HOST=${db_host}"
echo "DATABASE_PORT=${db_port:-default}"
echo "DATABASE_NAME=${db_name}"
echo "INTERNAL_HEALTHCHECK_KEY_SET=$([[ -n "${INTERNAL_HEALTHCHECK_KEY-}" ]] && echo yes || echo no)"
echo "SEED_OWNER_EMAIL_SET=$([[ -n "${SEED_OWNER_EMAIL-}" ]] && echo yes || echo no)"
