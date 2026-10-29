# Demo video outline (≤10 minutes)

One unlisted YouTube video, two parts. Target **4:30 customer** + **4:30
technical** = **9:00**, leaving buffer. Do not submit without the video.

Before recording:

- Start the backend (`uvicorn app.main:app --host 127.0.0.1 --port 8000`) and
  frontend (`npm run dev`), or use the deployed URLs once available.
- Warm the data by opening the app once, so the January fetch is cached.
- Set the date range to **1–7 January 2026** and the Explorer to
  **1 January 2026, 00:00**.
- Close unrelated tabs, hide bookmarks, disable notifications, and check audio.
- Use a 1280 px or wider window so the desktop grid is visible.
- Keep the cursor deliberate; avoid dead time while data loads.

---

## Part 1 — Customer presentation (target 4:30)

### 0:00–0:30 — The problem

“A UK utility must buy electricity a day ahead, before it knows how much wind
will actually be generated. Wind forecasts are revised several times a day, so
the team can only act on the version that existed at decision time. Using a
later revision would be hindsight.”

### 0:30–1:15 — What the pilot does

“This pilot uses Elexon’s national wind actuals and forecasts for January 2026.
For every delivery hour it identifies the latest forecast published by the
decision cutoff, then compares that eligible forecast with what was actually
delivered. It is decision support for forecast error — not a full procurement
optimiser.”

Show **Overview**:
- MAE, RMSE, mean signed error, coverage.
- Date range control (1–7 Jan, then Full January).
- Forecast vs actual chart.
- Point out: “Positive signed error means we forecast above what was delivered.”

### 1:15–2:15 — Delivery time versus publication time

Open **Forecast explorer**, 1 Jan 00:00.

- Delivery interval: **1 Jan 2026, 00:00–01:00**.
- Selected forecast: **19,466 MW**.
- Published: **31 Dec 2025, 09:30**.
- Decision cutoff: **31 Dec 2025, 09:30**, previous day, inclusive.
- Eligible versions: 12.

“The audit table below lists every revision. Everything after 09:30 is shown
greyed out and marked ‘After cutoff — excluded’. It is kept for transparency,
but it cannot influence the analysis.”

### 2:15–3:00 — Accuracy

Open **Accuracy analysis**.

- MAE and RMSE in MW.
- Signed-error chart: amber above zero = overforecast; teal below = under.
- Coverage card: matched hours, missing forecast, missing actual, invalid.
- Decision support: P90/P95 absolute error, P90 shortfall, underforecast share,
  MAE by forecast lead time, and the largest misses.
- Metric definitions.

“Only hours with an eligible forecast and both half-hourly actuals enter the
metrics. Missing data is excluded and counted, never treated as zero. The
percentiles describe the bad hours, not just the average, so they are closer to
how a reserve decision is actually made.”

### 3:00–3:45 — Data and honesty

Open **Data table**.

- Show delivery start, publish time, cutoff, lead time, forecast, actual,
  errors, status.
- Export the visible range as CSV so the row-level audit leaves the app.
- Page through once.
- Switch to the **Half-hourly actuals** tab: raw FUELHH settlement periods at
  30-minute resolution, with their own pagination. Point out that no half-hour
  forecast values are invented.
- Point to provenance: live fetch/cached/snapshot state.

“Every row is auditable, and the app says where the data came from. The bundled
fallback is real Elexon data, clearly labelled — not a demo mock.”

### 3:45–4:30 — What it means and limitations

“For the first week of January, the eligible forecasts averaged about
2.1 GW absolute error, with a positive bias of about 2.0 GW — a consistent
overforecast in that window. That is the kind of quantified input a procurement
team can use when deciding how much margin to carry.

This does not calculate an optimal purchase volume. Demand, prices, other
generation and contracts are out of scope.”

---

## Part 2 — Technical lead walkthrough (target 4:30)

### 4:30–5:10 — Architecture

Show the README architecture diagram or a simple slide:

- React 19 + TypeScript + Vite; TanStack Query, Recharts, Tailwind.
- FastAPI + Pydantic v2; pure domain layer.
- Elexon FUELHH (actual) and WINDFOR (forecast).
- Disk cache + provenance-stamped real snapshot fallback; no database.

“React never implements selection or metric logic. The backend owns it, so it is
testable without a browser.”

### 5:10–6:00 — Elexon integration

- Verified the real parameters are `publishDateTimeFrom/To`, not `from/to`.
- Those filter publication time, so the client pads the window and filters by
  `startTime` locally.
- Requests are chunked into 5-day windows because the API rejects ≥7 days.
- FUELHH filtered to `fuelType == "WIND"`; WINDFOR keeps every revision.

Show `docs/elexon-api-notes.md` briefly.

### 6:00–6:45 — No look-ahead bias

Show `backend/app/domain/cutoff.py` and `selection.py`:

- Cutoff = previous local day at 09:30 Europe/London, DST-aware.
- Filter `publishTime <= cutoff`.
- Select max `publishTime`.
- No eligible forecast → null, not zero.
- Duplicate policy: same value deduped; conflicting values rejected.

Mention the test that pins the inclusive boundary and the test that rejects a
later publication.

### 6:45–7:30 — Matching and metrics

Show `matching.py` / `metrics.py`:

- WINDFOR is hourly, FUELHH half-hourly.
- Each hour uses the mean of both half-hour actuals; both required.
- MAE, RMSE, MBE computed only from finite matched pairs.
- Empty set returns `no_data` with nulls.

“This is a deliberate resolution decision, and it is documented in the API and
UI rather than hidden.”

### 7:30–8:15 — Tests and API

Run or show:

```bash
cd backend && .venv/bin/python -m pytest -q     # 80 passed
cd frontend && npm test                          # 47 passed
cd frontend && npm run test:e2e                  # 44 passing, 22 platform skips
cd frontend && npm run build                     # tsc + vite build
bash scripts/verify.sh                           # full local gate (~2–3 min)
```

Mention that the E2E suite runs every analysis flow in Chromium, Firefox and
WebKit, plus axe on all four routes, the theme chooser, the guide overlay and
the dark theme in Chromium, and fails on critical or serious violations.
Accessibility runs found and fixed four real defects.

Show FastAPI `/docs` and one response, e.g. `/api/forecast-revisions` for
1 Jan 00:00, highlighting `eligible: false` after the cutoff.

### 8:15–8:50 — States, Docker, deployment

- Show the UI error state (optional: stop backend briefly) and Retry.
- Docker: two Dockerfiles and compose; the stack was built and smoke-tested
  against the real snapshot — both healthchecks green, 744/744 matched hours,
  CORS and request ids verified. An earlier run performed a live Elexon fetch.
  The backend image binds an injected `$PORT`, which is the Heroku contract.
- Deployment: the root `vercel.json` deploys the whole stack as one Vercel
  project (Vite frontend service plus FastAPI service), validated locally with
  `vercel dev --local`: `/health`, `/api/*`, `/docs` and SPA deep links all
  served, snapshot mode on the serverless filesystem. Split Vercel +
  Heroku/Render configs are also prepared. Nothing was deployed; no public URL
  is claimed.
- CI: `.github/workflows/ci.yml` defines four jobs, mirrored locally by
  `scripts/verify.sh`; the hosted run on `main` passed all four. The first
  hosted run caught a Linux-only argument-size bug in the smoke script, which
  was fixed and re-run green.

### 8:50–9:00 — Close

“The result is a tested, real-data, cutoff-aware wind forecast analytics pilot.
Known limits: wind only, January 2026 only, hourly evaluation, cutoff is a
documented assumption, and deployment/video/repo publication are the remaining
external steps.”

---

## Recording checklist

- [ ] Video length ≤ 10:00.
- [ ] Part 1 ≤ 5:00 and understandable without technical background.
- [ ] Delivery time and publication time stated explicitly.
- [ ] Post-cutoff revisions shown as excluded.
- [ ] Metric units (MW) and sign convention stated.
- [ ] Limitations stated (wind-only, not a procurement optimiser).
- [ ] Tests and actual counts shown or quoted accurately.
- [ ] Docker/deployment status stated honestly.
- [ ] Audio clear; text readable at 1080p.
- [ ] No secrets, local `.env` contents, tokens or personal data on screen.
- [ ] Uploaded as **unlisted**; link checked in an incognito window.
- [ ] Submission form completed by an authorised person.
