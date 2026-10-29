# API reference

Base URL (local): `http://localhost:8000`

HTML reference: `/` and `/docs` (same page) · OpenAPI schema: `/openapi.json` ·
ReDoc: `/redoc`

`/` and `/docs` serve one self-contained HTML reference rendered from the
running settings. It covers every route, query parameter, response field,
enum value, error code and example, plus conventions and a copy-ready
quickstart. Swagger UI is disabled; the page uses no JavaScript and is not part
of the OpenAPI schema. See `GET /` below.

All timestamps are ISO-8601 UTC with a `Z` suffix. Generation values are in
**MW**. Delivery dates are inclusive and must fall within the configured
analysis period (2026-01-01 to 2026-01-31).

Every response carries an `X-Request-ID` header. A client may send its own
`X-Request-ID` (1–128 characters of letters, digits, `.`, `_`, `:`, `-`) to
correlate with an upstream proxy; invalid or oversized values are replaced with
a generated 32-character hex id. The header is exposed through CORS, and the
same id is logged with the method, path, status and duration.

## Error envelope

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Date range must not exceed 31 days",
    "request_id": "8f14e45fceea167a5a36dedd4bea2543"
  }
}
```

`request_id` matches the `X-Request-ID` response header, so a user-visible
failure can be traced to one server log line.

| HTTP | Code | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid query parameter, inverted range, oversized range, non-hour `start_time` |
| 400 | `OUT_OF_ANALYSIS_PERIOD` | Dates or interval outside January 2026 |
| 502 | `UPSTREAM_UNAVAILABLE` | Elexon failed and no stored snapshot exists |
| 504 | `UPSTREAM_TIMEOUT` | Upstream request timed out and no snapshot exists |
| 503 | `DATA_UNAVAILABLE` | No dataset available |
| 500 | `INTERNAL_ERROR` | Unexpected server error (details logged, not returned) |

A live-fetch failure normally still returns **200** with
`freshness.data_state = "snapshot_fallback"` and a visible note/warning,
because the bundled snapshot is real Elexon data.

---

## `GET /` and `GET /docs`

Both routes return the same complete HTML API reference, byte for byte. It is
served by the API process itself and rendered from the running settings:
effective analysis window, data mode, decision cutoff, maximum range and
version. The page contains:

- conventions: base URL, methods, authentication, content types, date window,
  resolutions, units, timestamp format and request correlation;
- a summary table and a full reference block for each of the six JSON
  endpoints, with query parameters, response fields, statuses and a complete
  example response;
- object references for every schema, including all enum values;
- the error envelope, every error code and the fallback and missing-data rules;
- a copy-ready `curl` quickstart and links to `/redoc`, `/health` and
  `/openapi.json`.

Swagger UI is not mounted (`docs_url=None`). The HTML page is dependency-free
and served from both `/` and `/docs`, so either URL shows the full reference.

- `Content-Type: text/html; charset=utf-8`
- No JavaScript and no external assets; a strict
  `Content-Security-Policy: default-src 'none'` allows inline styles and the
  inline SVG mark only.
- Honours `prefers-color-scheme` and is keyboard-navigable. On narrow screens
  tables scroll horizontally with a sticky first column, and example payloads
  wrap instead of clipping.
- Excluded from the OpenAPI schema (`include_in_schema=False`), so generated
  clients only see the JSON API.
- Cacheable for five minutes (`Cache-Control: public, max-age=300`).

---

## `GET /health`

No upstream call. Useful for platform health checks.

```json
{
  "status": "ok",
  "service": "Gridbricks Wind Forecast Analytics",
  "version": "0.1.0",
  "timestamp": "2026-10-29T05:51:58.425498+00:00",
  "data_mode": "live"
}
```

---

## `GET /api/meta`

Returns the effective period, resolution, cutoff rule, data mode, attribution
and disclaimer. The UI uses it for source notes.

```json
{
  "app_name": "Gridbricks Wind Forecast Analytics",
  "analysis_start": "2026-01-01",
  "analysis_end": "2026-01-31",
  "timezone": "Europe/London",
  "forecast_resolution_minutes": 60,
  "actual_resolution_minutes": 30,
  "cutoff": {
    "local_time": "09:30",
    "timezone": "Europe/London",
    "inclusive": true,
    "rule": "For each delivery interval, choose the forecast with the latest publishTime where publishTime <= cutoff.",
    "assumption": "The challenge does not specify a clock-time cutoff. This implementation uses 09:30 Europe/London on the calendar day before delivery, inclusive. The rule is configurable and is an explicit assumption, not a client rule."
  },
  "data_mode": "live",
  "source_attribution": "Actuals: Elexon BMRS FUELHH (WIND). Forecasts: Elexon BMRS WINDFOR. Public data, used under the Elexon BMRS terms.",
  "disclaimer": "This tool analyses national wind forecast accuracy only. It does not calculate an optimal procurement volume and does not use demand, prices, other generation, or contract data."
}
```

---

## `GET /api/accuracy`

Query parameters:

| Name | Type | Required | Default |
| --- | --- | --- | --- |
| `start_date` | ISO date | No | `2026-01-01` |
| `end_date` | ISO date | No | `start_date + 6 days`, capped at 2026-01-31 |

Returns counts, metrics and one row per hourly delivery interval.

```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-01",
  "timezone": "Europe/London",
  "unit": "MW",
  "forecast_resolution_minutes": 60,
  "actual_resolution_minutes": 30,
  "matching_rule": "WINDFOR forecasts are hourly and FUELHH actuals are half-hourly. Each forecast hour is paired with the mean of the two half-hourly actuals in that hour; both halves must be present. No half-hourly forecast values are invented.",
  "cutoff": { "...": "see /api/meta" },
  "counts": {
    "candidate_count": 24,
    "matched_count": 24,
    "missing_forecast_count": 0,
    "missing_actual_count": 0,
    "invalid_record_count": 0,
    "coverage_pct": 100.0
  },
  "metrics": {
    "status": "ok",
    "mae": 4258.208333333333,
    "rmse": 4300.91879718741,
    "mbe": 4258.208333333333,
    "matched_count": 24,
    "unit": "MW",
    "sign_convention": "forecast - actual"
  },
  "decision_support": {
    "p90_absolute_error": 5104.15,
    "p95_absolute_error": 5532.125,
    "p90_shortfall": 0.0,
    "underforecast_share_pct": 0.0,
    "lead_time_buckets": [
      { "label": "Under 18 h", "lower_hours": null, "upper_hours": 18.0, "matched_count": 4, "mae": 5193.75, "mean_signed_error": 5193.75 },
      { "label": "18–24 h", "lower_hours": 18.0, "upper_hours": 24.0, "matched_count": 6, "mae": 3930.9166666666665, "mean_signed_error": 3930.9166666666665 },
      { "label": "24–30 h", "lower_hours": 24.0, "upper_hours": 30.0, "matched_count": 6, "mae": 3865.6666666666665, "mean_signed_error": 3865.6666666666665 },
      { "label": "30 h and over", "lower_hours": 30.0, "upper_hours": null, "matched_count": 8, "mae": 4330.3125, "mean_signed_error": 4330.3125 }
    ],
    "method": "Percentiles use linear interpolation between order statistics (position = (n - 1) x q). Shortfall is max(actual - forecast, 0) over every matched hour, so hours with no shortfall are included."
  },
  "intervals": [
    {
      "start_time": "2026-01-01T00:00:00Z",
      "end_time": "2026-01-01T01:00:00Z",
      "decision_cutoff": "2025-12-31T09:30:00Z",
      "selected_publish_time": "2025-12-31T09:30:00Z",
      "forecast_generation": 19466.0,
      "actual_generation": 13814.5,
      "signed_error": 5651.5,
      "absolute_error": 5651.5,
      "status": "matched",
      "detail": null,
      "actual_periods_used": 2,
      "eligible_forecast_count": 12,
      "lead_time_hours": 14.5
    }
  ],
  "freshness": {
    "retrieved_at": "2026-10-29T05:45:48Z",
    "data_state": "cache",
    "source": "Elexon FUELHH + Elexon WINDFOR",
    "cache_age_seconds": 719,
    "is_fallback": false,
    "note": "Loaded from the local disk cache of real Elexon data",
    "warnings": []
  }
}
```

`metrics.status` is `"no_data"` when no interval matches; then `mae`, `rmse`
and `mbe` are `null` and `matched_count` is `0`.

`decision_support` is computed from matched intervals only:

- `p90_absolute_error` / `p95_absolute_error` — percentiles of absolute error,
  linearly interpolated between order statistics (`position = (n − 1) × q`).
- `p90_shortfall` — 90th percentile of `max(actual − forecast, 0)` across every
  matched hour, so hours with no shortfall are included.
- `underforecast_share_pct` — percentage of matched hours with
  `actual > forecast`.
- `lead_time_buckets` — `[<18 h)`, `[18, 24 h)`, `[24, 30 h)`, `[30 h, ∞)` using
  delivery start minus the selected forecast publication time; each bucket
  reports its matched count, MAE and mean signed error.
- `lead_time_hours` on an interval is that difference for the selected
  forecast, or `null` when no forecast was eligible.

With no matched hours every decision-support value is `null` and the bucket
list is empty.

### Interval statuses

| Status | Meaning |
| --- | --- |
| `matched` | Eligible forecast and both half-hourly actuals present |
| `missing_forecast` | No forecast published on or before the cutoff |
| `missing_actual` | One or both half-hour actuals missing or invalid |
| `invalid_record` | Malformed or contradictory duplicate source records |
| `upstream_unavailable` | Reserved for upstream unavailability markers |

Missing values are `null`, never `0`.

---

## `GET /api/forecasts`

Same range parameters as `/api/accuracy`. Returns the selected interval rows
with the cutoff information, without metrics.

```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-07",
  "cutoff": { "...": "see /api/meta" },
  "intervals": [ "... IntervalResult objects ..." ],
  "freshness": { "...": "see /api/accuracy" }
}
```

---

## `GET /api/actuals`

Same range parameters. Returns raw WIND records for audit plus hourly
aggregates used in matching.

```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-01",
  "unit": "MW",
  "actual_resolution_minutes": 30,
  "hourly_resolution_minutes": 60,
  "records": [
    {
      "start_time": "2025-12-31T23:30:00Z",
      "publish_time": "2026-01-01T00:00:00Z",
      "generation": 13733.0,
      "fuel_type": "WIND",
      "settlement_date": "2025-12-31",
      "settlement_period": 48,
      "source": "Elexon FUELHH"
    }
  ],
  "hourly": [
    { "start_time": "2026-01-01T00:00:00Z", "generation": 13814.5, "periods_used": 2 }
  ],
  "freshness": { "...": "see /api/accuracy" }
}
```

Only hours with both actual halves appear in `hourly`.

---

## `GET /api/forecast-revisions`

Query parameter:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `start_time` | ISO datetime | Yes | Must include a timezone and align to a whole hour |

Returns every WINDFOR revision for that delivery hour, with eligibility and the
selected version.

```json
{
  "start_time": "2026-01-01T00:00:00Z",
  "decision_cutoff": "2025-12-31T09:30:00Z",
  "selected_publish_time": "2025-12-31T09:30:00Z",
  "status": "matched",
  "revisions": [
    {
      "publish_time": "2025-12-30T02:30:00Z",
      "generation": 19028.0,
      "eligible": true,
      "selected": false
    },
    {
      "publish_time": "2025-12-31T11:30:00Z",
      "generation": 19563.0,
      "eligible": false,
      "selected": false
    }
  ],
  "freshness": { "...": "see /api/accuracy" }
}
```

Post-cutoff revisions remain visible for audit with `eligible: false`; they are
never selected.

---

## CORS

Allowed origins come from `ALLOWED_ORIGINS` (comma-separated). The defaults
allow the Vite dev server on `localhost:5173` and `127.0.0.1:5173`. The Docker
compose configuration allows `localhost:8080`. Only `GET` and `OPTIONS` are
allowed; credentials are disabled.
