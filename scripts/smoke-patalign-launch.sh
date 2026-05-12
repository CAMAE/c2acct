#!/bin/bash

set -euo pipefail

LOCAL_BASE="${1:-http://127.0.0.1:3000}"
PUBLIC_BASE="${2:-https://patalign.com}"

echo "==> local health"
curl -fsS "${LOCAL_BASE%/}/api/health/db"
echo

echo "==> public headers"
curl -I -s "${PUBLIC_BASE%/}/"
echo

echo "==> public health"
curl -fsS "${PUBLIC_BASE%/}/api/health/db"
echo
