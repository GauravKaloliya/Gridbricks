#!/usr/bin/env bash
# Boots the compose stack against the real Elexon snapshot and asserts that the
# data, API, SPA routing, CORS, request ids and container health actually work.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-8080}"
API="http://127.0.0.1:${API_PORT}"
WEB="http://127.0.0.1:${WEB_PORT}"
WEB_ORIGIN="http://localhost:${WEB_PORT}"
KEEP_STACK="${KEEP_SMOKE_STACK:-0}"

# The frontend bakes its API URL at build time and the backend must trust the
# origin it is served from, so both are derived from the chosen host ports.
export API_PORT WEB_PORT
export PUBLIC_API_URL="http://localhost:${API_PORT}"
export ALLOWED_ORIGINS="${WEB_ORIGIN},http://127.0.0.1:${WEB_PORT}"

pass() { printf '  PASS  %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1" >&2; exit 1; }

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  fail "docker compose (plugin or standalone) is required"
fi

cleanup() {
  local status=$?
  if [[ $status -ne 0 ]]; then
    echo "--- compose logs (tail) ---" >&2
    "${COMPOSE[@]}" logs --tail=50 >&2 || true
  fi
  if [[ "$KEEP_STACK" != "1" ]]; then
    "${COMPOSE[@]}" down --remove-orphans >/dev/null 2>&1 || true
  else
    echo "  INFO  stack left running (KEEP_SMOKE_STACK=1)"
  fi
  exit "$status"
}
trap cleanup EXIT

for binary in docker curl python3; do
  command -v "$binary" >/dev/null 2>&1 || fail "$binary is required"
done

echo "==> Building images"
DATA_MODE=snapshot "${COMPOSE[@]}" build --quiet

echo "==> Starting stack (snapshot mode, deterministic real data)"
DATA_MODE=snapshot "${COMPOSE[@]}" up -d --wait --wait-timeout 180

echo "==> Asserting backend health"
health="$(curl -fsS --retry 5 --retry-delay 2 "$API/health")"
python3 - "$health" <<'PY'
import json
import sys

body = json.loads(sys.argv[1])
assert body["status"] == "ok", body
assert body["data_mode"] == "snapshot", body
PY
pass "health endpoint reports ok in snapshot mode"

echo "==> Asserting full-month analytics use the real snapshot"
payload="$(curl -fsS "$API/api/accuracy?start_date=2026-01-01&end_date=2026-01-31")"
python3 - "$payload" <<'PY'
import json
import sys

body = json.loads(sys.argv[1])
counts = body["counts"]
metrics = body["metrics"]
decision = body["decision_support"]

assert counts["candidate_count"] == 744, counts
assert counts["matched_count"] == 744, counts
assert counts["coverage_pct"] == 100.0, counts
assert metrics["status"] == "ok", metrics
assert metrics["mae"] is not None and metrics["mae"] > 0, metrics
assert decision["p90_absolute_error"] is not None, decision
assert decision["p90_shortfall"] is not None, decision
assert sum(b["matched_count"] for b in decision["lead_time_buckets"]) == 744
assert body["freshness"]["data_state"] == "snapshot", body["freshness"]
assert len(body["intervals"]) == 744
PY
pass "accuracy API returns 744 matched hours from the stored Elexon snapshot"

echo "==> Asserting frontend shell, deep links, and container health"
[[ "$(curl -fsS "$WEB/healthz")" == "ok" ]] || fail "frontend /healthz"
curl -fsS "$WEB/" | grep -q 'id="root"' || fail "frontend index shell"
curl -fsS "$WEB/accuracy" | grep -q 'id="root"' || fail "frontend SPA deep link"
pass "frontend serves the shell and /accuracy deep link"

for service in backend frontend; do
  container="$("${COMPOSE[@]}" ps -q "$service")"
  [[ -n "$container" ]] || fail "$service container is not running"
  status="$(docker inspect --format '{{.State.Health.Status}}' "$container")"
  [[ "$status" == "healthy" ]] || fail "$service health is $status"
  pass "$service container is healthy"
done

echo "==> Asserting CORS for the compose origin"
headers="$(curl -fsS -D - -o /dev/null -X OPTIONS "$API/api/accuracy" \
  -H "Origin: ${WEB_ORIGIN}" \
  -H 'Access-Control-Request-Method: GET')"
grep -qi "access-control-allow-origin: ${WEB_ORIGIN}" <<<"$headers" \
  || fail "CORS preflight did not allow the frontend origin"
pass "CORS preflight allows ${WEB_ORIGIN}"

echo "==> Asserting request ids reach the client"
request_id="$(curl -fsS -D - -o /dev/null "$API/health" \
  | tr -d '\r' \
  | awk -F': ' 'tolower($1) == "x-request-id" {print $2}')"
[[ -n "$request_id" ]] || fail "X-Request-ID header is missing"
pass "X-Request-ID returned ($request_id)"

for image in gridbricks-backend:local gridbricks-frontend:local; do
  bytes="$(docker image inspect --format '{{.Size}}' "$image")"
  python3 - "$image" "$bytes" <<'PY'
import sys

image, size = sys.argv[1], int(sys.argv[2])
print(f"  INFO  {image} {size / 1024 / 1024:.1f} MB")
PY
done

echo "Container smoke passed."
