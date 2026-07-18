#!/usr/bin/env bash
# CI parity locally (Flywheel Standard §11.10): EXACTLY what ci.yml gates.
# Run before every push; green-local must equal green-CI.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run typecheck
npm test
npm run validate-data
npm run build

echo "PASS:ci-local"
