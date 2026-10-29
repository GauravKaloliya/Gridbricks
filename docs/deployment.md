# Deployment runbook

**Status: configuration validated locally; no public deployment exists yet.**
No live URL is claimed. The full-stack Vercel Services configuration has been
exercised with `vercel dev --local`, and the Docker stack has been exercised
with `scripts/smoke.sh`. Deploying requires a Vercel account and, optionally, a
container host.

There are two supported topologies:

1. **One Vercel project (recommended).** Vite frontend and FastAPI backend ship
   together using [Vercel Services](https://vercel.com/docs/services) (Beta).
   Both run on the same origin, so no CORS or API URL configuration is needed.
2. **Split deployment.** Static frontend on Vercel; API as a Docker container
   on Render, Heroku, Fly.io, or any Docker host.

## 0. Gate before deploying

```bash
bash scripts/verify.sh
```

The GitHub Actions workflow runs the same checks: backend pytest, frontend
typecheck + Vitest + production build + bundle budget, Playwright across
Chromium/Firefox/WebKit with axe on Chromium, and the container smoke. The
hosted run on `main` has passed all four jobs.

---

## 1. One Vercel project (recommended)

### How it works

The root [`vercel.json`](../vercel.json) declares two services:

| Service | Root | Runtime | Role |
| --- | --- | --- | --- |
| `web` | `frontend/` | Vite static build (`dist/`) | SPA with a deep-link rewrite to `index.html` |
| `api` | `backend/` | Python 3.12 ASGI (`app.vercel:app`) | FastAPI under `/api`, plus `/health`, `/docs`, `/openapi.json` |

Top-level rewrites route `/api/*`, `/health`, `/docs`, `/redoc`, and
`/openapi.json` to `api`; every other path goes to `web`. Services receive the
original path, so the existing FastAPI routes need no prefix stripping.

`backend/app/vercel.py` sets `DATA_MODE=snapshot` and a `/tmp` cache directory
before importing the app. Vercel's filesystem is read-only, and the bundled
2.4 MB Elexon snapshot is real data, so the deployed API is deterministic and
does not depend on an upstream call.

The frontend leaves `VITE_API_BASE_URL` unset in production builds, which makes
API requests same-origin (`/api/...`). Local Vite development still defaults to
`http://localhost:8000`.

### Deploy

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project**, import the repository, and keep the root
   directory as the repository root. `vercel.json` supplies all build settings.
3. Deploy. Vercel builds both services and creates one URL.
4. Do **not** set `VITE_API_BASE_URL`; same-origin is intentional.
5. Optionally add a custom domain in Project → Settings → Domains.

Or from the CLI:

```bash
npm i -g vercel
vercel link
vercel --prod
```

The repository is also compatible with Vercel's clone flow:

<https://vercel.com/new/clone?repository-url=https://github.com/GauravKaloliya/Gridbricks>

### Vercel verification

```bash
BASE=https://<deployment-host>
curl -fsS "$BASE/health"
curl -fsS "$BASE/api/meta"
curl -fsS "$BASE/api/accuracy?start_date=2026-01-01&end_date=2026-01-31" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["counts"]["matched_count"], d["metrics"]["mae"])'
```

Expect `/health` to report `"data_mode":"snapshot"`, the full-month request to
return 744 matched intervals, and `X-Request-ID` on every response. Open
`/docs` for the OpenAPI UI and `/accuracy` to confirm the SPA deep link.

### Local Vercel validation

```bash
npx vercel dev --local
```

Vercel CLI reuses `backend/.venv` if present. If that environment is older
than Python 3.12, use a clean copy or a 3.12+ virtual environment; the cloud
runtime is pinned to 3.12 by `backend/.python-version`.

### Service limits and cost notes

- Vercel Services is in Beta on all plans.
- The API is a single Python function. Cold-start parsing of the snapshot
  takes roughly 2–3 seconds; subsequent requests in the same instance are
  cached in memory.
- The function bundle contains FastAPI, Pydantic, httpx, and the snapshot
  (~2.5 MB of data), well under Vercel's 500 MB bundle limit.
- The Hobby plan is sufficient for a demo; review current Vercel limits before
  production use.

---

## 2. Split deployment

Use this when the API must live on a separate host, or when you want to avoid
Vercel Services Beta.

### 2a. Frontend on Vercel

[`frontend/vercel.json`](../frontend/vercel.json) contains the Vite build,
`dist` output, and SPA rewrite.

1. Import the repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Add `VITE_API_BASE_URL=https://<backend-host>` for Production and Preview.
4. Deploy.

`VITE_API_BASE_URL` is compiled at build time; changing it requires a
redeploy. Any static host (Netlify, Cloudflare Pages, S3 + CloudFront, nginx)
works with the same build and SPA fallback.

### 2b. Backend as a container

The backend image runs on Python 3.12 and binds `$PORT` when the platform
provides one, falling back to `8000`.

**Render blueprint:** import the repository, choose **New → Blueprint**, and
set the synced `ALLOWED_ORIGINS` variable to the exact frontend origin.

**Heroku:**

```bash
heroku create gridbricks-api
heroku container:login
cd backend
heroku container:push web -a gridbricks-api
heroku container:release web -a gridbricks-api
heroku config:set -a gridbricks-api \
  APP_ENV=production \
  DATA_MODE=live \
  ALLOWED_ORIGINS=https://<frontend-origin>
```

**Any Docker host:**

```bash
docker build -t gridbricks-backend ./backend
docker run -p 8000:8000 \
  -e APP_ENV=production \
  -e DATA_MODE=live \
  -e ALLOWED_ORIGINS=https://<frontend-origin> \
  gridbricks-backend
```

Required backend settings:

| Variable | Deployment value | Notes |
| --- | --- | --- |
| `APP_ENV` | `production` | Informational |
| `DATA_MODE` | `live` (container) / `snapshot` (Vercel) | Live mode fetches, caches, and falls back to the real snapshot |
| `ANALYSIS_START` / `ANALYSIS_END` | `2026-01-01` / `2026-01-31` | Fixed analysis period |
| `DECISION_CUTOFF_TIME` | `09:30` | Local cutoff clock time |
| `DECISION_CUTOFF_TZ` | `Europe/London` | DST-aware |
| `DECISION_CUTOFF_INCLUSIVE` | `true` | `publishTime <= cutoff` |
| `ALLOWED_ORIGINS` | deployed frontend origin | Comma-separated, exact origins |
| `CACHE_TTL_SECONDS` | `604800` | 7 days |

`ALLOWED_ORIGINS` is an allow-list, not a wildcard. Preview deployments have
different origins; add each explicitly or test against production only.

---

## 3. Post-deployment verification (incognito)

Run these in a private window with no local servers running:

- [ ] Overview loads with the 7-day default and the coverage sentence
      "168 of 168 hourly intervals have an eligible forecast and both actual
      halves."
- [ ] "Full January" updates the URL to
      `?start=2026-01-01&end=2026-01-31` and shows 744/744 coverage.
- [ ] Navigating to Forecast explorer, Accuracy analysis and Data table keeps
      the selected range in the URL.
- [ ] Forecast explorer shows the 31 Dec 2025 09:30 eligible forecast and the
      excluded post-cutoff revisions.
- [ ] Accuracy analysis shows MAE, RMSE and mean signed error definitions and
      the error chart.
- [ ] Decision support shows P90/P95 absolute error, P90 shortfall,
      underforecast share, lead-time buckets and largest misses.
- [ ] Data table exports the current interval range as CSV and the file opens
      with one row per hourly interval.
- [ ] Data table switches between hourly intervals and half-hourly actuals;
      Full January shows 1,488 half-hour records and 744 complete hours.
- [ ] The provenance card reports a real data state, not a placeholder.
- [ ] No console errors; no failed `/api/*` requests; no CORS errors.
- [ ] A deep link (e.g. `/data?start=2026-01-01&end=2026-01-31`) returns the
      app, not a 404.
- [ ] `/health` returns 200 and every API response carries `X-Request-ID`.

Record the result in [`implementation-status.md`](implementation-status.md)
only after all checks pass.

## 4. Remaining submission artifacts

- Public GitHub repository: the code is pushed, but the deployment URL and
  demo video are still outstanding.
- Unlisted demo video (≤10 minutes): outline in
  [`demo-script.md`](demo-script.md).
- Submission form.

## Rollback and cost notes

- **Rollback:** redeploy the previous build in Vercel, or roll back the
  container revision. No database migrations are involved.
- **Cost:** Vercel Hobby and Render free tiers are sufficient for a pilot.
  Free container instances may sleep; the first request after idling can take
  several seconds.
- **Scale:** no shared cache or database. Multiple API replicas each parse the
  snapshot independently; this is acceptable for a read-only pilot but would
  need consolidation before real traffic.
