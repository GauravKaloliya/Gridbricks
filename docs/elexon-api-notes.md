# Elexon BMRS API — verified behaviour (29 Oct 2026)

All findings below were verified with live HTTP requests against the public Elexon BMRS API while building this project. No response schema was assumed.

## Endpoints

- Base: `https://data.elexon.co.uk/bmrs/api/v1/datasets`
- Actuals: `GET /FUELHH?publishDateTimeFrom=...&publishDateTimeTo=...&format=json`
- Forecasts: `GET /WINDFOR?publishDateTimeFrom=...&publishDateTimeTo=...&format=json`
- Documentation pages: `https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream` and `.../WINDFOR/stream`
- No API key is required for these dataset endpoints.

## Critical query-parameter finding

The documented-looking `from` / `to` parameters are **ignored** by these dataset endpoints: requesting January 2026 with `from`/`to` returned data published on 29 Oct 2026 (the current day). The real filters are:

- `publishDateTimeFrom`
- `publishDateTimeTo`

These filter on **publication time**, not on delivery/start time. Requests must therefore be padded and then filtered locally by `startTime`.

## Range limit

A request whose publication window exceeds the API limit returns HTTP 400:

> "The date range between PublishDateTimeFrom and PublishDateTimeTo inclusive must not exceed 7 days"

- 5-day windows succeed.
- 7-day windows failed in testing (inclusive day counting).
- The backend chunks requests into 5-day windows.

## FUELHH actuals — observed shape

```json
{
  "dataset": "FUELHH",
  "publishTime": "2026-01-01T00:00:00Z",
  "startTime": "2025-12-31T23:30:00Z",
  "settlementDate": "2025-12-31",
  "settlementPeriod": 48,
  "fuelType": "WIND",
  "generation": 13733
}
```

- One publication day returns 49 half-hourly intervals and 20 fuel types (980 rows).
- Filter to `fuelType == "WIND"` in the backend.
- Generation is an integer number of **MW** (values around 13,000–16,400 MW for GB wind).
- No null generation values were observed in sampled January 2026 data.
- The publish lag means a publication window includes the preceding 23:30 interval; always filter by `startTime`.

## WINDFOR forecasts — observed shape

```json
{
  "dataset": "WINDFOR",
  "publishTime": "2025-12-31T09:30:00Z",
  "startTime": "2026-01-01T12:00:00Z",
  "generation": 19824
}
```

- Target `startTime` is **hourly** (minutes always `00`), not half-hourly.
- 8 publications per day were observed: 02:30, 04:30, 07:30, 09:30, 11:30, 15:30, 18:30, 22:30 UTC.
- Multiple forecast versions exist for the same target hour, including versions published after a day-ahead cutoff. Look-ahead bias is therefore a real risk and must be prevented.
- Generation is in **MW**.
- No null generation values were observed in sampled January 2026 data.
- A publication at exactly 09:30 UTC exists on 31 Dec 2025 for 1 Jan 2026 delivery, which makes an inclusive 09:30 cutoff meaningful.

## January 2026 availability

January 2026 historical data is available through `publishDateTimeFrom/To`:
- FUELHH: 31 days × 49 intervals × 1 WIND row per interval.
- WINDFOR: all 8 daily publications, with revisions for target hours.
- Data was fetched successfully in 5-day chunks and stored as a provenance-stamped snapshot.

## Resolution consequence

Because WINDFOR is hourly and FUELHH is half-hourly, the application does not invent half-hourly forecast values. Accuracy is computed on the forecast's native hourly intervals, pairing each forecast hour with the mean of the two half-hourly actuals in that hour (both required). This rule is documented in the README and shown in the UI.
