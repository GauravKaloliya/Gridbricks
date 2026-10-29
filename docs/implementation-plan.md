# Gridbricks — Implementation Plan

> This is the plan as written before implementation, kept for traceability. It
> is historical: the delivered stack, commands and deployment target are in
> [`implementation-status.md`](implementation-status.md) and
> [`deployment.md`](deployment.md). The current deployment target is a single
> Vercel Services project (frontend + FastAPI), with the split
> Vercel/Heroku/Render path as an alternative.

**Sources of truth**

- `01_Complete_Project_Requirements.md` — consolidated requirements,
  acceptance criteria and traceability IDs (challenge material, not part of
  this repository).
- `02_AI_Agent_Development_Strategy.md` — execution contract, gates and
  16-hour budget (challenge material, not part of this repository).
- The original hiring challenge takes precedence over both if they conflict.

**Workspace snapshot**

- Only the two Markdown documents exist; no starter code.
- Not a Git repository yet.
- Node.js 26.5.0, npm 11.17.0, Python 3.11.9, pip 26.1.2, Git 2.50.1.
- **Docker was not installed at planning time.** Docker 29.x and colima were
  installed during Phase 7 so the container workflow could be built and run.
- Elexon BMRS API is public (no secret expected), but this must be confirmed at Gate A.

---

## 1. What the product is

A React + Python analytics tool for a UK energy utility's day-ahead electricity procurement team. It answers two questions:

1. **Which wind-generation forecast was actually available when a purchase decision had to be made?**
2. **How accurate were those eligible forecasts, quantitatively?**

It is decision support over Elexon national wind data only. It must never claim to calculate an optimal procurement volume, because demand, prices, other generation, and contracts are out of scope.

### The two hard correctness rules

- **No look-ahead bias:** only forecasts with `publishTime <= decision cutoff` may be selected.
- **No fabricated data:** missing values stay missing, failures stay visible, and fixtures never appear as live Elexon observations.

---

## 2. Locked defaults (documented assumptions, not client facts)

The challenge leaves these unspecified. Each is configurable and must be stated in the README.

| Decision | Default | Rationale |
|---|---|---|
| Delivery period | `startTime` from `2026-01-01T00:00Z` to `2026-01-31T23:30Z` (UTC) | "January 2026 purchase-decision period"; 30-minute intervals |
| Decision cutoff | **09:30 Europe/London on the calendar day before delivery**, inclusive (`publishTime <= cutoff`) | Mirrors the typical GB day-ahead auction gate-closure convention; remains an assumption, isolated in config |
| Decision-date nuance | For 1 Jan delivery the cutoff is 31 Dec 2025; this is documented explicitly | Avoids pretending a rule the client did not specify |
| Timezone policy | Store/compare in UTC; render in Europe/London with explicit labels; test DST transitions | Prevents naive-timestamp comparisons |
| Units | MW, pending Gate A confirmation from real responses | Never assume; verify source units |
| Duplicate forecasts at max `publishTime` | Same value → dedupe; conflicting value → `invalid_record` | Deterministic and honest rather than arbitrary |
| Duplicate actuals for one interval | Same value → dedupe; conflicting value → `invalid_record` | Same principle |
| Persistence | No database; bounded in-process TTL cache + optional provenance-stamped snapshot | Scope does not justify a DB; freshness must be visible |
| AI at runtime | None | Out of scope and not required |

**Config surface:** `DECISION_CUTOFF_TIME=09:30`, `DECISION_CUTOFF_TZ=Europe/London`, `DECISION_CUTOFF_INCLUSIVE=true`, `ANALYSIS_START`, `ANALYSIS_END`, `ALLOWED_ORIGINS`, `ELEXON_BASE_URL`, timeouts/retries, cache TTL.

---

## 3. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + TypeScript + Vite | Node 26 present |
| Routing / data | React Router, TanStack Query | Typed API client; retries only where safe |
| Charts | Recharts | Single chart library; accessible labels/tooltips |
| Styling | Tailwind CSS | Fast, consistent, responsive |
| Backend | Python 3.11 + FastAPI + Pydantic v2 | Type hints, OpenAPI, explicit schemas |
| HTTP client | httpx | Async, bounded timeout/retry |
| Backend tests | pytest, respx, FastAPI TestClient | Unit + API contract tests |
| Frontend tests | Vitest, React Testing Library, MSW | Loading/empty/error/partial states |
| E2E | Playwright (only if budget allows) | Otherwise documented manual E2E |
| Container | Docker + docker-compose | Backend and frontend images |
| Deployment | Heroku (backend container) + Vercel (frontend static) | Split documented; single-container Heroku is fallback. Credentials required |

No pandas unless a real need appears; the 30-minute volumes are small and pure functions are easier to test. No database, queue, LLM, or forecast model.

---

## 4. Architecture

```
React (Vite)
  └─ typed API client ──HTTP/JSON──> FastAPI
                                      ├─ API routes (validation, status codes, CORS)
                                      ├─ services (orchestration, caching, freshness)
                                      ├─ domain (pure: cutoff selection, matching, metrics)
                                      ├─ normalization (timestamps, numerics, validation)
                                      └─ data clients (Elexon FUELHH + WINDFOR)
                                             └─ cache / provenance-stamped snapshot
```

**Boundaries**

- React never implements cutoff, matching, or metric logic.
- Domain functions are pure and testable without HTTP or the web server.
- Data clients only fetch/parse; they do not decide eligibility.
- API layer owns query validation, response schemas, and HTTP error mapping.
- External errors are logged with detail but never exposed as stack traces.

---

## 5. Planned repository structure

```
project-root/
├── frontend/
│   ├── src/
│   │   ├── components/        # KPI card, chart, status badge, table, states
│   │   ├── pages/             # Overview, ForecastExplorer, Accuracy
│   │   ├── hooks/             # query hooks
│   │   ├── services/          # typed API client, error normalization
│   │   ├── types/             # API contracts mirrored from backend
│   │   ├── lib/               # formatting (timezone, MW, numbers)
│   │   ├── tests/             # Vitest + RTL + MSW
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── backend/
│   ├── app/
│   │   ├── api/               # health, forecasts, actuals, accuracy, revisions, meta
│   │   ├── services/          # analysis service, cache, freshness
│   │   ├── data/              # Elexon clients, normalization, fixtures (tests only)
│   │   ├── domain/            # selection.py, matching.py, metrics.py, cutoff.py
│   │   ├── schemas/           # request/response Pydantic models, status enum
│   │   ├── core/              # config, logging, errors, time utilities
│   │   └── main.py
│   ├── scripts/               # optional snapshot builder with provenance
│   ├── tests/                 # unit, API, fixtures with metadata
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
│   ├── implementation-plan.md
│   ├── implementation-status.md   # mandatory progress ledger
│   ├── api.md                     # endpoint + example responses
│   └── demo-script.md
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

No empty folders, no placeholders claiming unimplemented features.

---

## 6. Canonical data contracts

Adapt names only after inspecting real Elexon responses at Gate A.

### Actual wind record

```json
{
  "start_time": "2026-01-01T00:00:00Z",
  "generation": 1234.5,
  "unit": "MW",
  "source": "Elexon FUELHH",
  "fuel_type": "WIND"
}
```

### Forecast record

```json
{
  "start_time": "2026-01-01T00:00:00Z",
  "publish_time": "2025-12-31T09:15:00Z",
  "generation": 1300.0,
  "unit": "MW",
  "source": "Elexon WINDFOR"
}
```

### Matched interval

```json
{
  "start_time": "2026-01-01T00:00:00Z",
  "decision_cutoff": "2025-12-31T09:30:00Z",
  "selected_publish_time": "2025-12-31T09:15:00Z",
  "forecast_generation": 1300.0,
  "actual_generation": 1234.5,
  "signed_error": 65.5,
  "absolute_error": 65.5,
  "status": "matched"
}
```

Status vocabulary: `matched`, `missing_forecast`, `missing_actual`, `invalid_record`, `upstream_unavailable`. Missing values are `null`, never `0`.

### Accuracy response (per requirements §16.6)

Include: period, cutoff rule/version, candidate interval count, matched count, missing-forecast count, missing-actual count, MAE, RMSE, mean signed error, unit, sign convention, retrieval/freshness timestamp. If `matched_count == 0`, return explicit no-data status and `null` metrics — never `0`.

### Error envelope

```json
{ "error": { "code": "INVALID_DATE_RANGE", "message": "start_date must be <= end_date" } }
```

No stack traces, secrets, or upstream internals.

---

## 7. Domain algorithms

### 7.1 Cutoff

- Compute cutoff per delivery date: `(delivery_date - 1 day) at 09:30 Europe/London`.
- Use `zoneinfo`, not fixed offsets; January is GMT but tests cover DST transitions in March/October.
- Inclusive comparison `publishTime <= cutoff` unless config says otherwise.
- Return cutoff with every interval for auditability.

### 7.2 Forecast selection (pure)

1. Filter forecasts to the target `start_time`.
2. Keep `publish_time <= cutoff`.
3. Select maximum `publish_time`.
4. On ties: identical values dedupe; conflicting values mark `invalid_record`.
5. No eligible record → `missing_forecast` with `selected_publish_time = null`.
6. Preserve cutoff + selected publication time.

Never fall back to a post-cutoff forecast. Never use `publish_time` as the delivery join key.

### 7.3 Matching (pure)

- Normalize both sides to UTC instants; join on identical `start_time`.
- Apply duplicate-actual policy above.
- Classify every interval as matched / missing forecast / missing actual / invalid.
- Only valid matched pairs enter metrics; unavailable counts are reported.

### 7.4 Metrics

- `signed_error = forecast - actual` (positive = overforecast).
- `absolute_error = |signed_error|`.
- `MAE = mean(|e|)`, `RMSE = sqrt(mean(e²))`, `MBE = mean(e)`.
- Use only finite, valid matched pairs; reject NaN/infinity/missing.
- Report `n`, units, and explicit no-data state. No MAPE unless zero-denominator policy is implemented and documented.

---

## 8. API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness/version; no upstream call |
| GET | `/api/meta` | Effective cutoff config, supported period, data freshness |
| GET | `/api/forecasts?start_date=&end_date=` | Intervals with selected eligible forecast + cutoff |
| GET | `/api/actuals?start_date=&end_date=` | Normalized actual wind records |
| GET | `/api/accuracy?start_date=&end_date=` | Metrics + matched interval rows + coverage counts |
| GET | `/api/forecast-revisions?start_time=` | All forecast versions for one target interval (optional, last) |

**Validation:** ISO dates, `start_date <= end_date`, maximum 31-day range, supported-period checks. **Errors:** 400 invalid input, 502 upstream failure/envelope, 504 upstream timeout, 503 unavailable; consistent error envelope. **CORS:** explicit `ALLOWED_ORIGINS`; wildcard only in local dev. **OpenAPI** documented at `/docs` and in `docs/api.md`.

---

## 9. UI specification

1. **Overview** — date/range picker (default first 7 days of January 2026), MAE/RMSE/MBE cards with units, forecast-vs-actual time series, matched/coverage counts, freshness indicator, loading/empty/error/partial states.
2. **Forecast Explorer** — interval picker, selected forecast value, **delivery interval start** vs **forecast published** timestamps clearly separated, cutoff and eligibility explanation, revision comparison (optional).
3. **Accuracy Analysis** — metric definitions, sign convention, interval-level error chart/table, sample count and date range.
4. **Data Table** — start time, publish time, forecast, actual, signed error, absolute error, status; text labels for status (not color alone).
5. **Global** — responsive layout, accessible labels, keyboard-friendly controls, no fabricated values, explicit "not a full procurement optimizer" note.

---

## 10. Test matrix (must actually run)

| Area | Cases |
|---|---|
| Data clients | WIND filter; timestamp parsing; string/NaN/null generation; malformed JSON; non-2xx; timeout; pagination/limits; schema drift |
| Forecast selection | latest before cutoff; exactly at cutoff (inclusive); after cutoff rejected; none eligible; duplicate publication times (same/conflicting); different target intervals; equivalent timezone offsets; DST transitions |
| Matching | exact join; missing forecast; missing actual; duplicate actuals; interval mismatch; invalid records |
| Metrics | known-value MAE/RMSE/MBE; sign convention; single pair; empty → null/no-data; NaN/infinity excluded; units and `n` |
| API | response schemas/status codes; invalid/reversed/oversized dates; upstream failure mapping; CORS; health; no stack traces |
| Frontend | loading, error, empty, partial; date change updates all views; labels/units; no zero substitution; missing API base URL; empty chart |
| E2E | select date → metrics + chart + table; upstream error state; forecast explorer eligibility |
| Robustness | all 24 cases in strategy §17, each with explicit behavior |

Fixtures: trimmed, provenance-stamped real responses plus hand-built edge cases; stored only under `backend/tests/fixtures/`; never rendered in production UI.

---

## 11. Execution phases (16-hour budget)

### Phase 0 — Inspect and establish constraints (1h) — **Gate A**
- Confirm workspace/toolchain (partly done).
- Install Docker (manual: Docker Desktop or colima) — required.
- Inspect official Elexon docs and live responses for FUELHH and WINDFOR:
  - request parameters, pagination/stream semantics, limits, units, timestamp formats;
  - historical availability for January 2026;
  - forecast revision/publication behavior.
- Initialize Git, `.gitignore`, `.env.example`, `docs/implementation-status.md`.
- Record API findings and sample responses in the ledger.
- **Gate A evidence:** real response samples, params, units, date behavior, cutoff ambiguity documented.
- If API access fails: build a documented adapter + fixtures, but never claim live-data verification.

### Phase 1 — Scaffold and architecture (1h)
- Backend FastAPI skeleton: config, logging, health, error envelope, CORS.
- Frontend Vite + TS + Tailwind shell with routing and design tokens.
- Dockerfiles + compose skeleton, `.env.example`.
- Verify both start locally; record commands.
- **Gate:** backend `/health` and frontend shell both respond.

### Phase 2 — Elexon clients and normalization (2h)
- httpx clients with 10s timeout, bounded retries/backoff, no retry on 4xx.
- FUELHH WIND filter; WINDFOR retains all versions until selection.
- Pydantic response validation; explicit rejection reasons; retrieval timestamps.
- Aggressive but correct caching keyed by source + range + config; single-flight; stale data visibly labeled.
- Unit tests with respx; real-sample parsing tests.
- **Gate B input:** clients proven against fixtures/real responses.

### Phase 3 — Domain correctness and tests (3h) — **Gate B**
- Implement cutoff, selection, matching, metrics as pure functions.
- Implement duplicate and missing-data policies exactly as documented.
- Full test matrix for selection/matching/metrics, including DST and exact-cutoff cases.
- **Gate B:** all domain tests pass before any dashboard work.

### Phase 4 — Backend API (2h) — **Gate C**
- Routes, typed schemas, query validation, status codes, error mapping.
- CORS from env; no stack traces; bounded upstream behavior.
- API tests: success, invalid params, empty data, upstream failure, contract shape.
- `docs/api.md` with examples.
- **Gate C:** backend starts, health works, schemas inspectable, frontend/backend field names and units agree.

### Phase 5 — React UI (3h) — **Gate D**
- API client + TanStack Query hooks + error normalization.
- Overview, Forecast Explorer, Accuracy, Data Table; loading/error/empty/partial states.
- Timezone/unit labels, accessible charts/tables, responsive layout.
- Frontend tests for states and formatting; manual browser walkthrough.
- **Gate D:** both core use cases work with explicit states and no misleading values.

### Phase 6 — Integration and end-to-end (1.5h)
- Run frontend + backend together with real data.
- Verify date filters, CORS, cutoff display, matching, error and no-data paths, console cleanliness.
- Playwright E2E if time; otherwise documented manual E2E.
- Error injection: upstream failure, empty forecast, partial coverage.

### Phase 7 — Docker and deployment (1.5h) — **Gate E**
- Build and start both containers; verify compose and README commands.
- Deploy backend to Heroku (container) and frontend to Vercel; configure env, CORS, API base URL.
- Verify live URL in incognito: health, real API data, UI rendering.
- If credentials/platform access missing: complete configs, provide exact manual steps, mark deployment `BLOCKED`, never claim success.
- **Gate E:** tests run/results recorded, Docker built/started, deployment verified or blocker stated, README matches reality.

### Phase 8 — README, demo, final verification (2h)
- README covers all 19 required sections (architecture, sources, cutoff assumptions, selection algorithm, metric convention, env, local/Docker/tests, deployment, limitations, AI disclosure).
- Complete `docs/implementation-status.md` ledger with evidence per requirement ID.
- Prepare `docs/demo-script.md` (≤10 min: ~5 min customer, ~5 min technical) + recording checklist.
- Public anonymous GitHub repo, `.gitignore` hygiene, secret scan.
- Final quality gate and submission checklist; incognito checks; form submission by an authorized person.

**Total: 16h.** If behind: cut revision comparison/polish first; keep correctness, tests, E2E path, README, deployment attempts, demo preparation.

---

## 12. Requirement traceability (evidence plan)

| ID | Implementation | Evidence |
|---|---|---|
| BIZ-01 | Forecast Explorer + cutoff display | UI walkthrough / frontend test |
| BIZ-02 | Accuracy page + metrics | Metric unit tests + UI test |
| DATA-01/02 | Elexon clients, source attribution | Client tests + real-sample parsing |
| DATA-03 | Separate `start_time`/`publish_time` | Schemas + UI labels + test |
| TIME-01 | January 2026 period config | Fixtures + ledger |
| TIME-02 | Cutoff exclusion | Unit test: post-cutoff rejected |
| TIME-03 | Timezone/DST policy | Timestamp/DST tests |
| MATCH-01 | Interval join | Matching unit tests |
| METRIC-01 | MAE/RMSE/MBE | Known-value tests |
| API-01 | Documented typed API | API contract tests + `docs/api.md` |
| UI-01/02 | Views + all states | RTL tests + manual E2E |
| OPS-01 | Docker | Build/start command output |
| OPS-02 | Vercel/Heroku | Verified URL or blocker |
| DOC-01/02 | README + AI disclosure | README checklist |
| DEL-01..04 | Repo, video, submission | Incognito checks, human verification |

---

## 13. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Elexon historical data for Jan 2026 unavailable/limited | Core product impossible live | Gate A verification first; document limits; provenance-stamped snapshot of real fetched data if needed; no fabricated fallback |
| WINDFOR volume/revisions larger than expected | Slow responses | Date-bounded queries, caching, concurrency limits, response size checks |
| Docker not installed | Required deliverable blocked | Install Docker Desktop/colima before Phase 7; if impossible, state blocker. Resolved: colima + Docker installed and the compose stack was built and exercised |
| Deployment credentials unavailable | Cannot verify live | Complete configs, exact manual steps, report `BLOCKED` honestly |
| Platform limits (Vercel serverless timeout vs Heroku cost) | Deployment failure | Prefer Heroku container backend + Vercel static frontend; verify platform docs at implementation time |
| Timestamp/DST mistakes | Wrong joins/metrics | UTC normalization, `zoneinfo`, explicit tests |
| Time overrun | Missing deliverables | Strict phase budget; cut optional features first; ledger tracks gaps |
| Accidental secret commit | Security failure | `.gitignore`, `.env.example` placeholders, pre-push inspection |
| Fixtures leaking into live UI | Integrity failure | Fixtures only in tests; source/retrieval metadata enforced in schemas |

---

## 14. Definition of done

A requirement is `VERIFIED` only when: implemented, tested (automated or recorded manual), working in the integrated app, failure state handled, documented accurately, and any deployment claim checked live. The final report follows strategy §15.5 headings and distinguishes `implemented`, `tested locally`, `deployed`, and `externally verified`. It must never claim "all tests passed", "production-ready", or "deployed successfully" without evidence.

---

## 15. Open decisions for the user

1. **Cutoff rule:** accept default 09:30 Europe/London, D-1, inclusive? (Configurable if not.)
2. **January semantics:** analyze delivery intervals in January 2026 with D-1 cutoffs (1 Jan decision falls on 31 Dec 2025)? Or restrict to decisions whose timestamps fall in January (delivery 2 Jan–1 Feb)?
3. **Deployment accounts:** Heroku + Vercel credentials/access available? Otherwise deployment stays `BLOCKED` with manual steps.
4. **Docker:** permission to install Docker Desktop (or colima) locally.
5. **Snapshot policy:** whether to commit a real, provenance-stamped January 2026 snapshot for reliability, or fetch live at runtime only (default: decide after Gate A volume check).
6. **External deliverables:** GitHub account for the public anonymous repo, and a person to record/upload the unlisted YouTube video and submit the form.

---

## 16. Immediate next actions

1. Approve this plan and resolve the open decisions (at least cutoff and deployment access).
2. Run Phase 0: install Docker, inspect Elexon live responses, verify January 2026 availability, initialize Git and the progress ledger.
3. Build the first vertical slice: one real actual + one forecast → selection → match → metric → one API endpoint → one React view → one test.
4. Proceed through Gates B–E without skipping verification.
