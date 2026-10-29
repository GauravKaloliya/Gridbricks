# Engineering decision log

This is a short architecture decision record for choices that materially change
the numbers or the behaviour of the app. Each entry states the context, the
decision, and the consequence — including the cost.

## D1 — Cutoff is 09:30 Europe/London on the previous calendar day, inclusive

**Context.** The brief asks for the forecast available at decision time but does
not name a clock time or timezone. Day-ahead procurement in the GB market
settles around a mid-morning gate, and the data is published in UK local time.

**Decision.** For a delivery hour on day *D*, the cutoff is 09:30 Europe/London
on day *D−1*. A forecast published exactly at 09:30 is eligible. The rule is
configurable through `DECISION_CUTOFF_TIME`, `DECISION_CUTOFF_TZ` and
`DECISION_CUTOFF_INCLUSIVE`, and the assumption is repeated in `/api/meta` and
in the UI.

**Consequence.** Every metric is reproducible from the stated rule. A client
with a different gate time must change configuration; the default is not
presented as a market fact. Cutoff computation uses `zoneinfo`, so it remains
correct across UK DST changes.

## D2 — The latest eligible publication wins; conflicting ties are invalid

**Context.** WINDFOR republishes each delivery hour many times. Selecting by
delivery time alone would leak later information into the decision.

**Decision.** Filter revisions to `publishTime <= cutoff`, take the maximum
publication time, and select that record. If two records share the winning
publication time but disagree on generation, mark the interval
`invalid_record` instead of picking one arbitrarily.

**Consequence.** No look-ahead bias, and duplicate corruption is visible rather
than silently averaged. Identical duplicates are accepted. The UI shows both
the selected publication time and every excluded later revision.

## D3 — Hourly forecasts are matched to the mean of two half-hourly actuals

**Context.** FUELHH reports half-hourly wind generation; WINDFOR forecasts are
hourly. Comparing a forecast directly with one half-hour would create a
systematic mismatch.

**Decision.** For each forecast hour, require both FUELHH settlement periods,
average them, and compare that mean with the forecast. If either half is absent,
the hour is `missing_actual`.

**Consequence.** Every matched error is an hour-to-hour comparison. Slightly
fewer hours are scoreable, but no half-hour value is invented and no partial
hour is silently treated as complete.

## D4 — Missing data is excluded, never zero-filled

**Context.** A zero is a valid wind generation value, so substituting zero for
missing data would both bias the metrics and hide outages.

**Decision.** Each candidate hour receives one status: `matched`,
`missing_forecast`, `missing_actual`, `invalid_record`, or
`upstream_unavailable`. Metrics use only matched hours; counts and coverage are
returned alongside them.

**Consequence.** MAE and RMSE describe the matched set, not an imputed one. The
UI shows a partial-data banner and the reason on each data-table row.

## D5 — Signed error is forecast minus actual

**Context.** Sign conventions are easy to invert and hard to notice.

**Decision.** `signed_error = forecast_generation - actual_generation`.
Positive means overforecast. MBE is the mean signed error; mean bias by
lead-time bucket uses the same sign. The convention is returned in the API
response and stated in the UI.

**Consequence.** A positive MBE consistently means the forecast was too high.
All tests and documentation use this convention.

## D6 — Percentiles use linear interpolation; shortfall includes zero hours

**Context.** "P90 error" can mean several different estimators, and a shortfall
percentile can be computed only over shortfall hours or over all hours.

**Decision.** Use the standard linear interpolation estimator with
`position = (n - 1) * q`. Compute `max(actual - forecast, 0)` for every matched
hour, including hours with no shortfall, then take the 90th percentile. P90 and
P95 absolute error use the same estimator.

**Consequence.** The reserve figures are conservative and reproducible, and are
not inflated by dropping hours when the forecast was sufficient. The method
string is part of the API response so a consumer can verify it.

## D7 — Lead-time buckets are half-open and exhaustive

**Context.** Bucket boundaries can double-count or drop hours at exactly 18,
24 or 30 hours.

**Decision.** Use `<18 h`, `[18, 24)`, `[24, 30)` and `>=30 h`. Lead time is
delivery start minus publication time. Bucket counts sum to the matched total
by construction.

**Consequence.** Every matched hour belongs to exactly one bucket. Exact
boundary values are tested.

## D8 — Snapshot fallback is real data and is always labelled

**Context.** The analysis period is January 2026, which is historical. Live
retrieval can fail or be rate-limited, but a demo must not invent values.

**Decision.** Try live Elexon, then a fresh disk cache, then the stored 2.4 MB
snapshot built from Elexon records. The response carries `data_state`
(`live`, `cache`, `snapshot`, `snapshot_fallback`), retrieval time, warnings and
a human-readable note. `DATA_MODE=snapshot` forces the stored dataset for
deterministic tests and container smoke checks.

**Consequence.** The UI can always distinguish live data from a fallback. The
snapshot is validated by a test that asserts full-month counts and metrics.

## D9 — The server owns analytics; the URL owns view state

**Context.** Recomputing metrics in React would create two sources of truth.

**Decision.** The backend returns intervals, counts, metrics and decision
support. The frontend formats and presents them. The selected date range and the
selected forecast interval live in URL query parameters, not component state.

**Consequence.** Every view is shareable and survives reload and back/forward
navigation. Largest-miss rows deep-link directly to the forecast audit for that
hour. No metric logic is duplicated in TypeScript.

## D10 — Route-level code splitting keeps charts off non-chart routes

**Context.** Recharts is large relative to the application shell.

**Decision.** Lazy-load pages at the router and let Vite split shared chart
dependencies. The build gate fails if any JavaScript chunk exceeds 500 kB.

**Consequence.** The base entry is about 289 kB and the chart chunk is fetched
only when a chart route is opened. The budget is enforced by
`scripts/verify.sh`, not only observed once.

## D11 — Every response carries a request id

**Context.** A polished API needs a way to connect a user-visible failure to a
server log line.

**Decision.** Accept a valid `X-Request-ID` from a proxy or generate a 32-hex
id. Return it on every response, expose it through CORS, include it in error
envelopes as `request_id`, and log one access line per request with method,
path, status, duration and id. Health checks log at debug level.

**Consequence.** A failed call can be traced end to end. Invalid or oversized
inbound ids are replaced to prevent header injection. The frontend appends the
request id to structured error messages.

## D12 — CI mirrors an executable local gate; deployment stays manual

**Context.** A workflow file that has never run is configuration, not evidence.
Publishing a repository or deployment requires account access and explicit
authorisation.

**Decision.** Put the CI commands in `scripts/verify.sh`, run the same commands
locally, and add a container smoke job (`scripts/smoke.sh`) that the workflow
also calls. Do not claim CI, deployment, a public repo, a video or a form
submission as complete until they actually happen.

**Consequence.** The CI definition and the local evidence cannot drift silently.
The remaining operational gap is limited to actions that require external
accounts, not unexercised commands.
