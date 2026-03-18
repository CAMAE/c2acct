#!/bin/bash
set -euo pipefail

CONTAINER_NAME="${AAE_LOCAL_DB_CONTAINER:-c2acct-local-db}"
DB_PORT="${AAE_LOCAL_DB_PORT:-5433}"
DB_NAME="${AAE_LOCAL_DB_NAME:-c2acct}"
DB_USER="${AAE_LOCAL_DB_USER:-postgres}"
DB_PASSWORD="${AAE_LOCAL_DB_PASSWORD:-postgres}"
DB_IMAGE="${AAE_LOCAL_DB_IMAGE:-postgres:16}"

if ! command -v docker >/dev/null 2>&1; then
  echo "BOOTSTRAP_LOCAL_DB_ERROR docker is required for the scripted local DB path."
  exit 1
fi

existing_id="$(docker ps -aq --filter "name=^/${CONTAINER_NAME}$")"
if [[ -n "${existing_id}" ]]; then
  running_id="$(docker ps -q --filter "name=^/${CONTAINER_NAME}$")"
  if [[ -n "${running_id}" ]]; then
    echo "BOOTSTRAP_LOCAL_DB_OK container already running: ${CONTAINER_NAME}"
  else
    docker start "${CONTAINER_NAME}" >/dev/null
    echo "BOOTSTRAP_LOCAL_DB_OK container started: ${CONTAINER_NAME}"
  fi
else
  docker run -d \
    --name "${CONTAINER_NAME}" \
    -e POSTGRES_DB="${DB_NAME}" \
    -e POSTGRES_USER="${DB_USER}" \
    -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
    -p "${DB_PORT}:5432" \
    "${DB_IMAGE}" >/dev/null
  echo "BOOTSTRAP_LOCAL_DB_OK container created: ${CONTAINER_NAME}"
fi

echo "Suggested DATABASE_URL shape:"
echo "postgresql://${DB_USER}:<password>@localhost:${DB_PORT}/${DB_NAME}?schema=public"
echo "If you use the default bootstrap password, replace <password> with ${DB_PASSWORD} in your local env."
