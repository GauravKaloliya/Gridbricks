#!/usr/bin/env bash
# Runs the same checks as .github/workflows/ci.yml, plus the container smoke.
# Usage: scripts/verify.sh [--no-e2e] [--no-docker]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RUN_E2E=1
RUN_DOCKER=1
for arg in "$@"; do
  case "$arg" in
    --no-e2e) RUN_E2E=0 ;;
    --no-docker) RUN_DOCKER=0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

if [[ -n "${PYTHON_BIN:-}" ]]; then
  PYTHON="$PYTHON_BIN"
elif [[ -x "$ROOT/backend/.venv/bin/python" ]]; then
  PYTHON="$ROOT/backend/.venv/bin/python"
else
  PYTHON="python3"
fi
export PYTHON_BIN="$PYTHON"

step() { printf '\n==> %s\n' "$1"; }
STARTED=$SECONDS

step "Backend: pytest"
(cd backend && "$PYTHON" -m pytest -q)

step "Frontend: dependencies"
cd frontend
if [[ ! -d node_modules ]]; then
  npm ci
fi

step "Frontend: typecheck"
npx tsc --noEmit

step "Frontend: unit tests"
npx vitest run

step "Frontend: production build"
npm run build

step "Frontend: bundle budget"
node scripts/check-bundle-budget.mjs

if [[ "$RUN_E2E" == "1" ]]; then
  step "Playwright: Chromium, Firefox, WebKit"
  npm run test:e2e
fi

if [[ "$RUN_DOCKER" == "1" ]]; then
  step "Docker: compose configuration"
  if docker compose version >/dev/null 2>&1; then
    (cd "$ROOT" && docker compose config --quiet)
  else
    (cd "$ROOT" && docker-compose config -q)
  fi
  step "Docker: container smoke"
  "$ROOT/scripts/smoke.sh"
fi

printf '\nGate passed in %ss.\n' "$((SECONDS - STARTED))"
