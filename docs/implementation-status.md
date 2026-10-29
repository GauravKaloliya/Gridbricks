# Implementation status and verification ledger

Last updated: 2026-10-30

This ledger records what was actually built and executed. It distinguishes
**implemented**, **tested locally**, **verified in the browser**, **blocked**,
and **deferred**. Nothing marked verified here was inferred from generated code
alone.

## Phase summary

| Area | Status | Evidence |
| --- | --- | --- |
| Elexon FUELHH + WINDFOR integration | Implemented, tested, live-verified | Live January 2026 fetch; 5-day chunking; verified parameter names and response fields |
| Real January 2026 snapshot | Built and validated | 1,488 actual records, 18,104 forecast records, 744 hours, 272 publications, 24–32 revisions/hour, zero missing halves |
| Cutoff-aware forecast selection | Implemented, unit-tested | Exact-cutoff inclusive, post-cutoff rejected, duplicates and no-eligible cases |
| Matching and metrics | Implemented, unit-tested | Hourly forecast vs mean of two half-hours; MAE/RMSE/MBE known-value tests; no-data nulls |
| Decision-support analytics | Implemented, tested, verified | P90/P95 error, P90 shortfall, underforecast share, lead-time buckets; full-month values recorded below |
| Backend API | Implemented, tested, live-verified | 80 pytest tests; `/health`, `/api/meta`, `/api/accuracy`, `/api/forecasts`, `/api/actuals`, `/api/forecast-revisions`, plus the complete HTML API reference at `/` and `/docs` |
| Observability | Implemented, tested | `X-Request-ID` accept/generate/expose, request id in error envelopes, structured access logs, 500 envelope tests |
| React UI | Implemented, built, browser-verified | Four pages plus hourly/half-hourly data tabs, decision-support panel and CSV export; 47 Vitest tests across 11 files; route-level code splitting |
| Themes | Implemented, tested, browser-verified | Paper, Light and Dark; first-visit chooser with live previews, header control, `localStorage` persistence, cross-tab sync, pre-paint restore, theme-aware chart palettes |
| Site guide | Implemented, tested, browser-verified | 19 steps across all routes; frozen page, four scrim panels, spotlight, five card placements, keyboard control, focus trap and restore |
| API reference page | Implemented, tested, browser-verified | `GET /` and `GET /docs` return the same complete HTML reference: conventions, all six endpoints, every schema field and enum, all error codes and a quickstart. Rendered from live settings; strict CSP, no JavaScript, Swagger disabled, `/redoc` retained, excluded from OpenAPI |
| Loading/error/empty/partial/fallback states | Implemented, tested, browser-verified | Error state observed with backend stopped; retry recovered when restarted |
| Automated end-to-end tests | Implemented and passing | 44 passing Playwright results across 66 runs in Chromium, Firefox and WebKit: six analysis flows, five theme/guide flows and 7 axe checks (Chromium; four additional guide-geometry cases also Chromium-only) |
| Accessibility | Implemented and passing | axe critical/serious checks on four routes plus the theme chooser, the open guide and the dark overview; four real defects found and fixed (see below). The API reference page was separately audited in Light and Dark at 1440×900 and 390×844: zero critical or serious findings, zero horizontal overflow, no clipped examples, no broken anchors or duplicate ids |
| Docker | Implemented, **built and executed** | Both images built; both healthchecks green; deterministic snapshot smoke on isolated ports; live Elexon fetch through the container; frontend, SPA routing and CORS verified |
| CI workflow | Implemented and **executed on GitHub** | `.github/workflows/ci.yml` defines four jobs; `scripts/verify.sh` mirrors them locally; run `40931090240` on `a75e631` passed all four jobs, including the theme/guide suite |
| Deployment configuration | Prepared, **not executed** | Vercel Services config for the full stack, split Vercel + Heroku/Render path, `frontend/vercel.json`, `render.yaml`; no public URL claimed |
| Vercel serverless entrypoint | Implemented, tested, **validated locally** | `backend/app/vercel.py`; entrypoint test in the backend suite; `vercel dev --local` served `/health`, `/api/*`, `/docs` and SPA deep links |
| README and docs | Implemented | README with required sections, API reference, verified API notes, deployment runbook, demo outline |
| GitHub public repo | **Published from this commit** | `main` pushed to the public target repository; result verified after push |
| Video / submission form | **Manual, pending** | Require recording and human submission; not performed |

## Test and build results

### Backend

Command:

```bash
cd backend && .venv/bin/python -m pytest -q
```

Result:

```text
80 passed in 1.73s
```

The suite covers WIND filtering, timestamp normalisation, exact-cutoff
inclusion, post-cutoff rejection, no eligible forecast, duplicate forecast
handling, missing actual halves, interval isolation, DST-aware cutoff
calculation, MAE/RMSE/MBE arithmetic, percentile interpolation,
decision-support shortfall and lead-time buckets, empty/no-data metrics,
upstream retries/timeouts, API schemas and status codes, snapshot validation,
cache reuse and fallback, malformed upstream records, cache TTL expiry,
oversized ranges, standardised 404/405 error envelopes, request-id
generation/preservation/rejection, CORS header exposure, and unexpected-error
envelopes. Two tests cover the HTML reference: `/` and `/docs` return
byte-identical `text/html`, both set the strict CSP header, the page contains
the brand, every route, key response fields and error codes, no `<script>` or
Swagger UI appears, and neither HTML route is in the OpenAPI paths. The Vercel entrypoint
has its own subprocess test: it unsets
`DATA_MODE`/`CACHE_DIR`, imports `app.vercel:app` and asserts snapshot mode,
the `/tmp` cache directory and a 200 `/health`. A dedicated snapshot-invariant
module loads the real 2.4 MB file and locks the full-month counts, metrics,
percentiles, shortfall, underforecast share and bucket partition against
regressions.

### Frontend

Commands:

```bash
cd frontend && npm test
cd frontend && npm run build
```

Result:

```text
Test Files  11 passed (11)
     Tests  47 passed (47)
   Duration  2.66s
```

```text
tsc --noEmit  ✓
vite build    ✓ built in 3.30s
dist/assets/index-*.css                 53.24 kB (gzip  10.28 kB)
dist/assets/index-*.js                 322.78 kB (gzip 100.56 kB)
dist/assets/DateAxisTick-*.js          384.36 kB (gzip 106.21 kB)  # Recharts
dist/assets/OverviewPage-*.js           44.29 kB (gzip  11.67 kB)
dist/assets/useAnalytics-*.js           21.18 kB (gzip   7.24 kB)
dist/assets/AccuracyPage-*.js           15.11 kB (gzip   4.79 kB)
dist/assets/DataPage-*.js               12.81 kB (gzip   3.59 kB)
dist/assets/ForecastExplorerPage-*.js   10.24 kB (gzip   3.21 kB)
```

Pages are lazy-loaded at the route level. The local gate measures the largest
emitted JS chunk (375.35 KiB) against a 500 KiB budget and fails the build above
it, so the previous single 758 kB bundle cannot return unnoticed. Recharts is
isolated in a shared chunk that only chart pages request; the base entry is
322.78 kB (100.56 kB gzip) and carries the app shell, theme provider, chooser
and guide overlay so those controls work on every route without a second
request.

### End-to-end

Command:

```bash
cd frontend && npm run test:e2e
```

Result:

```text
Running 66 tests using 1 worker (Chromium, Firefox, WebKit)
  ✓ / has no critical or serious accessibility violations          [chromium]
  ✓ /forecasts has no critical or serious accessibility violations [chromium]
  ✓ /accuracy has no critical or serious accessibility violations  [chromium]
  ✓ /data has no critical or serious accessibility violations      [chromium]
  ✓ theme chooser has no critical or serious accessibility violations
  ✓ site guide has no critical or serious accessibility violations
  ✓ dark theme overview has no critical or serious accessibility violations
  ✓ chart tooltip tracks the pointer without animated drift
  ✓ selecting the full month updates metrics, chart, and downstream views
  ✓ forecast explorer shows the eligible version and excludes later revisions
  ✓ accuracy analysis shows metrics, definitions, and error chart
  ✓ data page switches between hourly intervals and half-hourly actuals
  ✓ an API failure is visible and retry recovers without substituted values
  ✓ asks on the first visit, previews and saves a choice, then stays quiet
  ✓ closing without choosing asks again on the next visit
  ✓ arrow keys preview a theme and Escape restores the committed one
  ✓ the header control reopens the chooser and applies a new theme
  ✓ starts from the header and supports Continue, Back, Exit and Escape
  ✓ freezes the page and keeps the card clear of the spotlight       [chromium]
  ✓ keeps a medium section fully inside the spotlight                [chromium]
  ✓ walks every page and finishes on the overview                    [chromium]
  ✓ mobile layout: chooser and guide stay inside the viewport        [chromium]
  22 skipped
  44 passed (1.9m)
```

The six analysis flows and five theme/guide flows run in all three engines.
The 7 axe checks run in Chromium only, as do the four guide-geometry cases
(freeze/card clearance, medium-section outline, the full 19-step tour, and the
390 px mobile layout), so Firefox and WebKit each skip 11 tests. The tooltip
test moves the pointer across the chart and asserts that the tooltip's position
does not change after the pointer stops, which fails if Recharts' 400 ms
tooltip position animation is re-enabled. The accuracy flow now also follows a
decision-support largest-miss link into `/forecasts?interval=…`, asserting the
URL-driven selection, the interval heading and the revision-audit heading.

The guide tests assert behaviour rather than pixels: the freeze test confirms
`#root` becomes `inert`, `html` and `body` lock scrolling, a 1,400 px wheel
event does not move the page, and the step card and spotlight boxes never
overlap; the geometry test confirms a medium section is outlined in full
rather than cropped; the full tour steps through all 19 titles and progress
labels, checks the route and target for each step, and ends on `/` with the
query string intact and the overlay removed after Finish.

Playwright starts the backend in snapshot mode on port 8001 and the Vite dev
server on port 5174, so the suite is self-contained. It also caught real
regressions that unit tests would not have: navigation between pages was
dropping the selected date range from the URL, the half-hourly record count was
formatted without a thousands separator, and an `aria-label` on the new
largest-miss links did not contain their visible text. All were fixed and the
suite rerun to green. The flow suite exercises the decision-support panel and
the CSV download filename.

### Accessibility

`e2e/accessibility.spec.ts` runs axe on all four routes, the first-visit theme
chooser, the open site guide and the overview in the dark theme — seven checks —
and fails on any `critical` or `serious` violation. The route runs found four
genuine defects that manual review had missed:

1. **Colour contrast** — 9 px navigation numerals at 60% ink (2.37:1), the
   active numeral in the base signal red (4.4:1), and forecast-version values
   in the explorer at 70% opacity (4.08:1). Fixed by using full `ink-mute` for
   muted labels and removing the opacity from chip values; the nav numerals
   were later removed entirely when the navigation was simplified.
2. **ARIA on charts** — the two chart containers carried `aria-label` without
   a role, which is prohibited on a bare `div`. Both now declare `role="img"`.
3. **Definition list structure** — the accuracy coverage rows wrapped each
   `dt` in an extra `div`, so the term had no valid `<dl>` parent. The hint is
   now a block `span` inside the `dt`, and the list is valid.
4. **Label/name mismatch** — the largest-miss links added on `/accuracy`
   carried an `aria-label` that did not contain their visible text
   (`label-content-name-mismatch`). The label was removed so the visible row
   text becomes the accessible name, and the E2E locator was rewritten to
   target the href rather than the accessible name.

The final run is the 7 axe tests above: all pass in Chromium. The functional
flows also pass in Firefox and WebKit; real screen readers were not tested.

### Theme and site guide verification

Both features are covered by unit tests and Playwright flows, and both are
represented in `docs/screenshots` from the running app at 1440 × 1000
(`theme-chooser.png`, `site-guide.png`).

**Theme chooser.** `ThemeContext.test.tsx` covers the first-visit prompt,
persistence and the storage key; `theme-guide.spec.ts` covers the rest in a
real browser:

- A first visit with no stored key opens the chooser; selecting a card
  previews it immediately; Continue stores the choice, closes the dialog, and
  a reload applies the theme with the dialog absent.
- Closing without choosing leaves storage empty, so the next visit asks again.
- Arrow keys move the radio selection and preview; Escape restores the
  previously committed theme.
- For a returning visitor the header control reopens the chooser and the new
  theme is applied and stored.
- The pre-paint script in `index.html` applies the stored theme before React
  mounts, so a reload does not flash the wrong palette; a `storage` listener
  keeps other tabs in sync.

**Site guide.** The tour is 19 steps in `src/lib/guide.ts`. The tests confirm
the card sequence, Back/Continue/Exit/Escape, `#root` inert, `html`/`body`
scroll lock, a 1,400 px wheel event not moving the page, card and spotlight
boxes never overlapping, the route changing with each step, and Finish
returning to `/` with the query string preserved.

**Guide geometry.** A target gets the full outline whenever a step card of at
least 240 px can be placed below, above, right or left of it. Only when no such
placement exists is the spotlight capped, and the cap is derived from the
target's real top so the visible portion stays inside the hole; a 56 px fade
replaces a hard bottom edge, and the card is still kept out of the hole. The
E2E suite asserts the full-outline case for a medium section at 1440 × 1000
and the mobile placement at 390 × 844.

A separate one-off Playwright audit stepped through all 19 steps at
1440 × 1000, 1512 × 860, 1280 × 720, 390 × 844 and 320 × 568. At every step and
viewport it asserted no horizontal page overflow, the card fully inside the
viewport, the spotlight horizontally inside the viewport, and no card/spotlight
overlap; all five runs passed (5 passed, 1.4 m). The audit script was a
temporary file and is not part of the committed suite, so automated regression
coverage remains the two E2E viewports.

### Live data and API

Verified against both the local `uvicorn` process and the Docker container:

- `GET /health` returned `status: ok`, `data_mode: live`.
- A cold live fetch of January 2026 retrieved approximately 2.5 MB and was
  written to the container's cache directory.
- Full-month accuracy request:
  `start_date=2026-01-01&end_date=2026-01-31` returned 744 candidate hours and
  744 matched hours (100% coverage), with no missing forecasts, missing
  actuals, or invalid records.
- For delivery 2026-01-01 00:00, the response showed cutoff
  `2025-12-31T09:30:00Z`, selected publication `2025-12-31T09:30:00Z`, and 12
  eligible versions. The 11:30Z and later revisions were returned as
  `eligible: false`.
- Observed full-month metrics: MAE 2,122.81 MW, RMSE 2,616.69 MW,
  MBE +1,840.30 MW over 744 matched hours (live container fetch). The 1–7
  January default returned MAE 2,154.35 MW, RMSE 2,590.12 MW,
  MBE +1,983.70 MW over 168 hours.
- Decision support over the same full month (snapshot): P90 absolute error
  4,312.40 MW, P95 5,418.53 MW, P90 shortfall 488.85 MW, underforecast share
  15.59%. Lead-time buckets: under 18 h, 124 hours, MAE 2,321.24 MW;
  18–24 h, 186 hours, MAE 2,300.59 MW; 24–30 h, 186 hours, MAE 1,981.28 MW;
  30 h and over, 248 hours, MAE 1,996.41 MW. For delivery 1 January 00:00 the
  interval reports `lead_time_hours: 14.5`.
- CSV export serialises the interval rows in `lib/csv.ts` with RFC-style
  quoting and CRLF line endings. A unit test asserts an exact row including a
  comma inside the status detail; the E2E test downloads
  `gridbricks-intervals-2026-01-01_2026-01-07.csv` and asserts the filename.
- Responsive audit: headless Chromium at 320, 390 and 768 px on all four
  routes returned `scrollWidth === innerWidth` in every case. The clipped
  `thead` cells in the mobile table reflow do not contribute page overflow.

### Integrated browser verification

The backend ran on `127.0.0.1:8000` and Vite on `127.0.0.1:5173`. The in-app
browser viewport was 606 × 716 CSS pixels (narrow layout), so the responsive
single-column layout was exercised rather than a ≥1280 px desktop layout.

Verified manually:

1. **Overview** loaded real metrics and a forecast-vs-actual chart.
2. **Full January** button changed the URL to
   `?start=2026-01-01&end=2026-01-31`, refetched, and updated coverage to
   `744 of 744 hourly intervals`.
3. **Forecast explorer** showed delivery 1 Jan 00:00, selected forecast
   19,466 MW published 31 Dec 09:30, cutoff 31 Dec 09:30, 12 eligible versions,
   and an audit table where later revisions are labelled
   “After cutoff — excluded”.
4. Changing the delivery day to 2 January updated the interval to
   2 Jan 00:00 and loaded 24 revisions for
   `start_time=2026-01-02T00:00:00Z`.
5. **Accuracy analysis** rendered MAE/RMSE/MBE cards, signed-error bars,
   coverage counts, metric definitions and provenance.
6. **Data table** rendered 25 rows per page; Next moved to
   “Showing 26–50 of 168 hourly intervals”; matched rows showed publish time,
   cutoff, forecast, actual, signed/absolute error and status. The
   **Half-hourly actuals** tab showed FUELHH settlement periods with their own
   pagination and the explicit note that no half-hour forecasts are invented.
7. **Upstream failure**: with the backend stopped, the UI displayed
   “Could not load the analysis / Could not reach the analytics API” with a
   Retry button and no substituted values. After restarting the backend,
   Retry restored the 744 matched hours.
8. Browser console contained no errors after React Router future flags were
   enabled.

Desktop layout was captured with headless Chromium at 1440 × 1000, both from
the dev server and from the Docker-served frontend. The four-column KPI row,
chart and period-summary columns, and both chart series (solid actual, dashed
selected forecast) rendered correctly. Recharts line animation is disabled so
lines paint deterministically in headless captures.

Manual walkthroughs were Chromium-based at 606 px (in-app browser) and
1440 px (headless). Functional flows now also pass in Playwright's Firefox and
WebKit engines; no physical mobile device, real Safari session or screen
reader was used.

### Docker build and runtime verification

Environment: Docker 29.9.2 (client) / 29.5.2 (server) via colima 0.10.3 on
macOS arm64. The Compose v2 plugin is not linked into this machine's Docker
CLI, so the scripts detect it and fall back to the standalone `docker-compose`
5.6.1 binary. The compose file is versionless and works with either command.

**Deterministic snapshot smoke (2026-10-29).** Command:

```bash
API_PORT=8030 WEB_PORT=8090 bash scripts/smoke.sh
```

The script builds with `DATA_MODE=snapshot`, boots with
`up -d --wait --wait-timeout 180`, and tears the stack down on exit. It derives
the baked `PUBLIC_API_URL` and the backend `ALLOWED_ORIGINS` from the chosen
host ports. Alternate ports were used because an unrelated local `uvicorn`
already held port 8000; no process was stopped. Observed output:

```text
PASS  health endpoint reports ok in snapshot mode
PASS  accuracy API returns 744 matched hours from the stored Elexon snapshot
PASS  frontend serves the shell and /accuracy deep link
PASS  backend container is healthy
PASS  frontend container is healthy
PASS  CORS preflight allows http://localhost:8090
PASS  X-Request-ID returned (a191154ef45641cb8fff49bf946ba6cd)
INFO  gridbricks-backend:local 53.7 MB
INFO  gridbricks-frontend:local 21.9 MB
Container smoke passed.
```

The accuracy assertion checks 744 candidates, 744 matched, 100% coverage,
non-null MAE, P90 absolute error and P90 shortfall, a lead-time bucket
partition summing to 744, `freshness.data_state == snapshot`, and 744 interval
rows. The frontend assertion includes the nginx `/healthz` healthcheck added
for compose.

**Earlier live-container run.** Both images were built and exercised against
live Elexon data:

- `gridbricks-backend-1` reported **healthy** via the compose healthcheck;
  nginx served the frontend on `0.0.0.0:8080`. (That run's image sizes were
  278 MB and 78.8 MB; the snapshot rebuild reports 56.5 MB and 21.9 MB through
  `docker image inspect`, so size accounting differs between builds/stores.)
- The backend image binds an injected `$PORT`:
  `docker run --rm -e PORT=9000 -p 9000:9000 gridbricks-backend:local` served
  `/health` on port 9000 and `/api/accuracy` for 1 January (24 matched hours,
  P90 5,104.15 MW, `lead_time_hours` 14.5), then the container was stopped.
  This is the Heroku runtime contract; without `PORT` the same image falls
  back to 8000.
- `/health` returned `status: ok`, `data_mode: live`.
- Full-month accuracy request through the container performed a **live Elexon
  fetch** (`data_state: live`, retrieved 2026-10-29T06:23:56Z) and returned
  744/744 matched hours with MAE 2,122.81 MW, RMSE 2,616.69 MW,
  MBE +1,840.30 MW.
- The frontend served the SPA at `:8080`; a deep link to
  `/data?start=2026-01-01&end=2026-01-31` returned `index.html` (HTTP 200),
  confirming the nginx fallback.
- The built bundle contained the expected `http://localhost:8000` API base.
- CORS with `Origin: http://localhost:8080` returned
  `access-control-allow-origin: http://localhost:8080`; an unlisted origin
  received no allow-origin header.
- A headless Chromium screenshot of `http://localhost:8080` at 1440 × 1000
  showed live metrics (2,154 MW MAE / 2,590 MW RMSE / +1,984 MW MBE / 100%
  coverage for 1–7 January) and a “Live Elexon fetch” provenance badge.

### Local CI-equivalent gate

Command (alternate ports because port 8000 was already held by a local
process; the script derives the baked API URL and allowed origin from them):

```bash
API_PORT=8030 WEB_PORT=8090 bash scripts/verify.sh
```

Result, in one invocation:

```text
==> Backend: pytest                         80 passed in 1.77s
==> Frontend: typecheck                     clean
==> Frontend: unit tests                    47 passed (11 files)
==> Frontend: production build              built in 3.30s
==> Frontend: bundle budget                 PASS  largest 375.35 KiB (< 500 KiB)
==> Playwright: Chromium, Firefox, WebKit   44 passed, 22 skipped (2.3m)
==> Docker: compose configuration           valid
==> Docker: container smoke                 passed (both healthy, 744/744)
Gate passed in 188s.
```

Playwright ran with one worker because the gate sets it explicitly, so 2.3 m
is slower than the 3-worker standalone run. The Docker section reused cached
layers on this run; container images were 53.7 MB and 21.9 MB.

`--no-e2e` and `--no-docker` skip stages for faster loops. The gate mirrors
the four jobs in `.github/workflows/ci.yml`.

### Hosted CI

The workflow runs on every push to `main`. The first hosted run
(`40905624417`, commit `11975a9`) passed backend, frontend and Playwright and
failed the container job: `scripts/smoke.sh` passed the full-month API
response (279,016 bytes, about 273 KiB) as a command-line argument, which
exceeds Linux's per-argument limit even though macOS accepted it. The script
now pipes the JSON into Python on stdin. After the fix and an Actions
major-version update,
run `40906353001` (commit `6569904`) passed all four jobs:

```text
Backend tests                        success
Frontend typecheck, tests and build  success
Playwright end-to-end                success
Container build and smoke            success
```

A later run, `40907058285` on commit `032f84c`, also passed all four jobs.

Run `40931090240` on commit `a75e631` was the first hosted run to include the
three-theme and site-guide work. All four jobs passed in 3m32s:

```text
Backend tests                        success   11s
Frontend typecheck, tests and build  success   25s
Playwright end-to-end                success   3m02s
Container build and smoke            success   52s
```

That run executes the same suite as the local gate: 78 backend tests, 47
frontend unit tests in 11 files, the 66-run Playwright matrix and the container
smoke.

The argument-length failure is the kind of platform difference only a hosted
run exposes; the local gate could not reproduce it.

### Vercel Services validation (local)

The repository root contains a single `vercel.json` that deploys both halves
as one Vercel project using Services: `web` builds the Vite frontend and
`api` runs FastAPI through `backend/app/vercel.py`. Top-level rewrites send
`/health`, `/docs`, `/redoc`, `/openapi.json` and `/api/*` to the API service
and everything else to the SPA.

Validated with `vercel dev --local` on an isolated copy of the repository
(the CLI otherwise discovers `backend/.venv`, whose Python 3.11 cannot run
the Python 3.12 Vercel runtime; the hosted build pins 3.12 through
`backend/.python-version`). The CLI detected `web [Vite]` and
`api [FastAPI]`. Observed:

- `/health` returned 200 with `data_mode: snapshot`.
- `/api/meta` returned 200; a full-month
  `/api/accuracy?start_date=2026-01-01&end_date=2026-01-31` returned 200 with
  744 matched hours. The cold request took about 2.35 s.
- `/` served the built HTML, `/accuracy` served the SPA deep link (200), and
  `/openapi.json` and `/docs` served the API.
- Every response carried `x-request-id`.

Production builds default to same-origin API calls, so the single-project
deployment needs no `VITE_API_BASE_URL` and no CORS entry. The split
deployment (frontend on Vercel, backend on Heroku/Render) remains supported
through the same-origin fallback and `ALLOWED_ORIGINS`. No Vercel account was
used and no deployment was performed.

## Gate status

| Gate | Expected | Actual status |
| --- | --- | --- |
| **A** — requirements and real API verified | Params, units, availability, cutoff ambiguity | **PASS** — documented in `docs/elexon-api-notes.md`; no fabricated schema |
| **B** — domain correctness | Selection/matching/metrics tested before UI | **PASS** — 80 backend tests, including full-month snapshot invariants |
| **C** — backend API | Starts, schemas, status codes, CORS, request ids | **PASS** — live service, container service and API tests |
| **D** — React UI | Core use cases and explicit states | **PASS** — 47 unit tests + 44 E2E passes across Chromium, Firefox and WebKit, including the theme chooser and 19-step guide + browser walkthroughs at 320–1440 px |
| **E** — Docker | Containers build, start and serve real data | **PASS** — deterministic snapshot smoke: both healthchecks, 744/744 API, SPA deep link, CORS, request id; plus earlier live-fetch and `$PORT` checks |
| **F** — Deployment | Public URL verified | **NOT PERFORMED** — Vercel Services and split-deploy configs prepared and locally exercised with `vercel dev --local`; no credentials used and no URL claimed |
| **G** — CI | Workflow defined and mirrored locally | **PASS** — local `scripts/verify.sh` in 188 s; GitHub Actions run `40931090240` passed all four jobs with the theme/guide suite |

## Requirement traceability

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| BIZ-01 | Show the forecast available at decision time | Verified in browser | Explorer selected 31 Dec 09:30 publication for 1 Jan 00:00 delivery |
| BIZ-02 | Quantify forecast accuracy | Verified in browser + tests | MAE/RMSE/MBE API values and UI cards; metric unit tests |
| DATA-01 | FUELHH WIND actuals | Implemented + tested + live | Client tests; 1,488 real WIND records; half-hourly UI tab |
| DATA-02 | WINDFOR forecasts | Implemented + tested + live | Client tests; 18,104 real forecast records |
| DATA-03 | Separate delivery and publication time | Implemented + tested + UI | Schema fields, table columns, revision audit |
| TIME-01 | January 2026 period | Verified | Full-month request: 744/744 matched |
| TIME-02 | No look-ahead bias | Tested | Post-cutoff rejection; live response excludes later revisions |
| TIME-03 | Timezone/DST correctness | Tested | `zoneinfo` cutoff tests incl. DST transition |
| MATCH-01 | Interval matching | Tested | Missing halves excluded; duplicate policies tested |
| METRIC-01 | MAE/RMSE/MBE, no-data handling | Tested | Known-value and empty-input tests |
| METRIC-02 | Decision-support measures | Implemented + verified | P90/P95, P90 shortfall, underforecast share, lead-time buckets from matched hours |
| A11Y-01 | Accessible interface | Verified | axe critical/serious clean on four routes, the theme chooser, the open guide and the dark overview; four defects found and fixed |
| API-01 | Documented typed API | Verified | Complete HTML reference at `/` and `/docs`; OpenAPI at `/openapi.json`; `docs/api.md`; API tests; request-id contract documented and tested |
| UI-01/02 | Views and all states | Verified in browser + E2E | Overview, Explorer, Accuracy, Data (hourly + half-hourly); loading/error/partial/fallback; URL-addressable selection and deep links; three themes and a 19-step guide |
| TEST-01 | At least one E2E path | Verified | 44 passing Playwright results across three browsers: tooltip stability, date selection to metrics, explorer revisions, deep-linked audit, CSV export, failure/retry, axe, theme persistence and preview, guide navigation, freeze and geometry |
| OPS-01 | Docker | **Verified** | Snapshot compose smoke with both healthchecks, 744/744 API, SPA routing, CORS, request id; earlier live-fetch and `$PORT` checks |
| OPS-02 | Vercel/Heroku deployment | **Config prepared and locally validated, not deployed** | One-project Vercel Services config exercised with `vercel dev --local`; split Vercel + Heroku/Render path documented; no URL claimed |
| OPS-03 | CI workflow | **Verified locally and on GitHub** | `.github/workflows/ci.yml`; hosted run `40931090240` passed backend, frontend, Playwright and container smoke with the theme/guide suite |
| DOC-01/02 | README + AI disclosure | Implemented | `README.md` includes all required sections |
| DEL-01 | Public repository | **Published** | `main` pushed to `github.com/GauravKaloliya/Gridbricks` |
| DEL-02..04 | Video, submission | **Manual, pending** | Require recording and human submission |

## Known gaps and honest caveats

- **Deployment is not performed.** There is no public URL. Configs and exact
  steps exist in [`deployment.md`](deployment.md); the Vercel Services config
  was exercised with `vercel dev --local`, but neither path has been run
  against a live hosting provider.
- **Browser coverage has limits.** Functional E2E flows pass in Chromium,
  Firefox and WebKit, and responsive layout was checked at 320, 390, 606, 768
  and 1440 px in Chromium. No physical mobile device or screen-reader session
  was run; axe remains Chromium-only.
- **Hosted CI is green on the theme and guide.** Run `40931090240` passed all
  four jobs with that suite. A later documentation-only commit would need its
  own run to be covered. The local gate remains the faster path for iteration.
- **Guide geometry is not pixel-tested for every step.** The full-outline,
  freeze and mobile cases are asserted at two viewports; other step/viewport
  combinations rely on the geometry logic and manual review.
- **The theme choice is per browser.** It lives in `localStorage`, so it does
  not follow a visitor across devices or private windows.
- **The container smoke needs local Docker and two free host ports.** It
  defaults to 8000/8080 and accepts `API_PORT`/`WEB_PORT` overrides; it tears
  the stack down on exit.
- **Snapshot is a point-in-time real dataset.** It is labelled as a snapshot
  and is used only as a fallback, never presented as a live fetch.
- **Cache is per-instance.** No shared cache or database; multiple replicas
  would each fetch independently.
- **Unlisted video and submission form** remain manual human deliverables.
  The public repository is published from this commit; the Vercel deployment,
  video and form are not.

## Reproduction checklist

```bash
# Backend (Python 3.12 for the Vercel runtime; 3.11+ works locally)
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend (second terminal)
cd frontend
npm test
npm run build
npm run dev

# End-to-end (third terminal; starts its own servers on 8001/5174)
cd frontend
npm run test:e2e

# Full local gate: backend, typecheck, unit, build, chunk budget, browser
# matrix, compose validation and container smoke
bash scripts/verify.sh
# use --no-e2e / --no-docker to skip stages; API_PORT/WEB_PORT override the
# smoke's host ports when 8000 or 8080 are busy

# Containers only (defaults 8000/8080; free them first, or override ports)
API_PORT=8030 WEB_PORT=8090 bash scripts/smoke.sh
docker compose up --build      # or: docker-compose up --build
```

Then open <http://127.0.0.1:5173>, pick a theme in the first-visit chooser, open
the site guide from the header and click through it, select 1–7 January and
Full January, open Forecast explorer, inspect revisions for 1 Jan 00:00, open
Accuracy and Data (both tabs), and stop the backend to confirm the error state.
To see the chooser again, remove `gridbricks.theme` from `localStorage` and
reload. With the compose stack running, repeat at
<http://localhost:8080>.
