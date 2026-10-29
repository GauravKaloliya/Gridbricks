"""Human-readable landing page served at the backend root.

The root used to return a bare JSON blob, which is a poor first impression when
someone opens the API host in a browser. The machine-readable equivalent lives
at ``/api/meta`` and in ``/openapi.json``; this page is a static, script-free
overview that links to the interactive docs.
"""

from __future__ import annotations

from html import escape

from app.core.config import Settings

_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>[[APP_NAME]]</title>
<meta name="description" content="Read-only JSON API for Elexon wind generation actuals and cutoff-aware forecast accuracy for January 2026.">
<meta name="theme-color" content="#f4f1e9">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23f4f1e9'/%3E%3Crect x='3' y='3' width='5' height='5' fill='%23c6431e'/%3E%3Crect x='10' y='3' width='5' height='5' fill='%2317150f'/%3E%3Crect x='17' y='3' width='4' height='5' fill='%2317150f'/%3E%3Crect x='3' y='10' width='5' height='5' fill='%2317150f'/%3E%3Crect x='10' y='10' width='5' height='5' fill='%231b5e57'/%3E%3Crect x='17' y='10' width='4' height='5' fill='%2317150f'/%3E%3Crect x='3' y='17' width='5' height='4' fill='%2317150f'/%3E%3Crect x='10' y='17' width='5' height='4' fill='%2317150f'/%3E%3Crect x='17' y='17' width='4' height='4' fill='%23c6431e'/%3E%3C/svg%3E">
<style>
  :root {
    --paper: #f4f1e9;
    --raised: #fbf9f3;
    --tint: #ebe6d8;
    --ink: #17150f;
    --ink-soft: #464339;
    --ink-mute: #6b665a;
    --rule: rgba(23, 21, 15, 0.16);
    --rule-soft: rgba(23, 21, 15, 0.08);
    --signal: #c6431e;
    --actual: #1b5e57;
    --ochre: #74530d;
    --serif: "Newsreader", "Iowan Old Style", "Palatino Linotype", Georgia, serif;
    --sans: "IBM Plex Sans", ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    color-scheme: light;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --paper: #121211;
      --raised: #1b1b19;
      --tint: #242421;
      --ink: #edeae1;
      --ink-soft: #c6c2b7;
      --ink-mute: #989287;
      --rule: rgba(237, 234, 225, 0.17);
      --rule-soft: rgba(237, 234, 225, 0.09);
      --signal: #e86a42;
      --actual: #63c4b6;
      --ochre: #d9ad5b;
      color-scheme: dark;
    }
  }

  * { box-sizing: border-box; }

  html { -webkit-text-size-adjust: 100%; }

  body {
    margin: 0;
    background-color: var(--paper);
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; }

  .skip {
    position: absolute;
    left: -9999px;
    top: 0;
    padding: 0.6rem 1rem;
    background: var(--ink);
    color: var(--paper);
    font-family: var(--mono);
    font-size: 0.75rem;
    z-index: 10;
  }
  .skip:focus { left: 1rem; top: 1rem; }

  :focus-visible {
    outline: 2px solid var(--signal);
    outline-offset: 3px;
  }

  .shell {
    max-width: 1120px;
    margin: 0 auto;
    padding: 0 clamp(1.25rem, 4vw, 3rem);
  }

  .masthead {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem 1.5rem;
    padding: 1.4rem 0 1.2rem;
    border-bottom: 1px solid var(--rule);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    text-decoration: none;
  }

  .mark { width: 22px; height: 22px; flex: none; }

  .brand-name {
    font-family: var(--mono);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .brand-sub {
    padding-left: 0.75rem;
    border-left: 1px solid var(--rule);
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.67rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .masthead nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.25rem;
    font-family: var(--mono);
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .masthead nav a {
    color: var(--ink-soft);
    text-decoration: none;
    padding-bottom: 0.15rem;
    border-bottom: 1px solid transparent;
  }

  .masthead nav a:hover { color: var(--ink); border-bottom-color: var(--signal); }

  .hero {
    position: relative;
    padding: clamp(2.5rem, 7vw, 5.5rem) 0 clamp(2rem, 5vw, 3.5rem);
    overflow: hidden;
  }

  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(to right, var(--rule-soft) 1px, transparent 1px),
      linear-gradient(to bottom, var(--rule-soft) 1px, transparent 1px);
    background-size: 72px 72px;
    -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent 78%);
    mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.9), transparent 78%);
    pointer-events: none;
  }

  .hero > * { position: relative; }

  .kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.7rem;
    margin: 0 0 1.4rem;
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .kicker::before {
    content: "";
    width: 2.25rem;
    height: 1px;
    background: var(--signal);
  }

  h1 {
    max-width: 18ch;
    margin: 0;
    font-family: var(--serif);
    font-size: clamp(2.7rem, 6.6vw, 4.7rem);
    font-weight: 400;
    line-height: 0.98;
    letter-spacing: -0.025em;
    text-wrap: balance;
  }

  h1 em { color: var(--signal); font-style: italic; }

  .lede {
    max-width: 58ch;
    margin: 1.5rem 0 0;
    color: var(--ink-soft);
    font-size: clamp(1rem, 1.4vw, 1.1rem);
    line-height: 1.6;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin-top: 2rem;
  }

  .button {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.8rem 1.15rem;
    border: 1px solid var(--ink);
    background: var(--ink);
    color: var(--paper);
    font-family: var(--mono);
    font-size: 0.72rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-decoration: none;
    transition: transform 120ms ease, background-color 120ms ease;
  }

  .button:hover { transform: translateY(-1px); background: var(--signal); border-color: var(--signal); }

  .button.secondary {
    background: transparent;
    color: var(--ink);
    border-color: var(--rule);
  }

  .button.secondary:hover { background: var(--raised); border-color: var(--ink); color: var(--ink); }

  .mode {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin-left: auto;
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--rule);
    background: var(--raised);
    color: var(--ink-soft);
    font-family: var(--mono);
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .mode::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--actual);
  }

  .mode-snapshot::before { background: var(--ochre); }

  .specs {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 2px solid var(--ink);
    border-bottom: 1px solid var(--rule);
  }

  .spec {
    padding: 1.1rem 1.2rem 1.2rem;
    border-left: 1px solid var(--rule);
  }
  .spec:first-child { border-left: 0; padding-left: 0; }

  .spec dt {
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.62rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .spec dd {
    margin: 0.45rem 0 0;
    font-family: var(--serif);
    font-size: 1.08rem;
    line-height: 1.3;
    font-variant-numeric: tabular-nums;
  }

  .spec dd small {
    display: block;
    margin-top: 0.2rem;
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.64rem;
    letter-spacing: 0.04em;
    font-variant-numeric: normal;
  }

  section { padding: clamp(2.5rem, 5vw, 4rem) 0 0; }

  .section-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--ink);
  }

  .section-head h2 {
    margin: 0;
    font-family: var(--serif);
    font-size: clamp(1.55rem, 2.6vw, 2rem);
    font-weight: 400;
    letter-spacing: -0.015em;
  }

  .section-head p {
    margin: 0;
    max-width: 46ch;
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.68rem;
    letter-spacing: 0.03em;
    text-align: right;
  }

  .endpoints {
    margin: 0;
    padding: 0;
    list-style: none;
    border-bottom: 1px solid var(--rule);
  }

  .endpoint {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr) auto;
    gap: 0.5rem 1.25rem;
    align-items: start;
    padding: 1.15rem 0;
    border-bottom: 1px solid var(--rule-soft);
  }
  .endpoint:last-child { border-bottom: 0; }

  .num {
    padding-top: 0.2rem;
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.64rem;
    font-variant-numeric: tabular-nums;
  }

  .route {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.55rem;
  }

  .method {
    padding: 0.18rem 0.4rem;
    border: 1px solid var(--rule);
    color: var(--ink-soft);
    font-family: var(--mono);
    font-size: 0.6rem;
    letter-spacing: 0.08em;
  }

  .route code {
    font-family: var(--mono);
    font-size: 0.92rem;
    overflow-wrap: anywhere;
  }

  .purpose {
    margin: 0.4rem 0 0;
    max-width: 72ch;
    color: var(--ink-soft);
    font-size: 0.92rem;
  }

  .params {
    margin: 0.35rem 0 0;
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.66rem;
    letter-spacing: 0.02em;
  }

  .params code { color: var(--ink-soft); }

  .try {
    align-self: center;
    padding-bottom: 0.1rem;
    border-bottom: 1px solid var(--rule);
    color: var(--ink);
    font-family: var(--mono);
    font-size: 0.66rem;
    letter-spacing: 0.06em;
    text-decoration: none;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .try:hover { color: var(--signal); border-bottom-color: var(--signal); }

  .quickstart {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
    gap: clamp(1.25rem, 3vw, 2.5rem);
    align-items: start;
  }

  .code {
    background: #17150f;
    color: #f4f1e9;
    padding: 1.2rem 1.25rem;
    overflow-x: auto;
    font-family: var(--mono);
    font-size: 0.72rem;
    line-height: 1.75;
    tab-size: 2;
  }

  .code .c { color: rgba(244, 241, 233, 0.62); }
  .code .p { color: #f0a98d; }

  .notes {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .note {
    display: grid;
    grid-template-columns: 1.6rem minmax(0, 1fr);
    gap: 0.9rem;
    padding: 0.85rem 0;
    border-top: 1px solid var(--rule-soft);
  }
  .note:first-child { border-top: 0; padding-top: 0; }

  .note .n {
    color: var(--ochre);
    font-family: var(--mono);
    font-size: 0.66rem;
    padding-top: 0.15rem;
  }

  .note h3 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
    letter-spacing: 0.005em;
  }

  .note p {
    margin: 0.2rem 0 0;
    color: var(--ink-soft);
    font-size: 0.84rem;
    line-height: 1.55;
  }

  .method-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 clamp(1.5rem, 4vw, 3.5rem);
    margin-top: 1.25rem;
  }

  .method-grid .note { grid-template-columns: 2rem minmax(0, 1fr); }

  .method-grid .note h3 { font-family: var(--serif); font-size: 1.08rem; font-weight: 400; }

  .callout {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem 1.5rem;
    margin-top: 2rem;
    padding: 1.1rem 1.25rem;
    border: 1px solid var(--rule);
    border-left: 3px solid var(--signal);
    background: var(--raised);
  }

  .callout p {
    margin: 0;
    max-width: 66ch;
    color: var(--ink-soft);
    font-size: 0.86rem;
  }

  .callout a {
    font-family: var(--mono);
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  footer {
    margin-top: clamp(3rem, 6vw, 5rem);
    padding: 1.4rem 0 2.2rem;
    border-top: 1px solid var(--ink);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.75rem 2rem;
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.64rem;
    letter-spacing: 0.04em;
    line-height: 1.7;
  }

  footer a { color: var(--ink-soft); text-decoration: none; border-bottom: 1px solid var(--rule); }
  footer a:hover { color: var(--ink); border-bottom-color: var(--signal); }

  @media (max-width: 860px) {
    .specs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .spec:nth-child(3) { border-left: 0; padding-left: 0; }
    .spec:nth-child(n + 3) { border-top: 1px solid var(--rule); }
    .quickstart { grid-template-columns: minmax(0, 1fr); }
    .method-grid { grid-template-columns: minmax(0, 1fr); }
    .section-head p { text-align: left; }
  }

  @media (max-width: 620px) {
    .brand-sub { display: none; }
    .masthead nav { gap: 0.9rem; }
    .endpoint { grid-template-columns: 1.75rem minmax(0, 1fr); }
    .try { grid-column: 2; justify-self: start; margin-top: 0.15rem; }
    .mode { margin-left: 0; width: 100%; justify-content: center; }
    .specs { grid-template-columns: minmax(0, 1fr); }
    .spec { border-left: 0; padding-left: 0; }
    .spec:nth-child(n + 2) { border-top: 1px solid var(--rule); }
    h1 { max-width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; }
  }
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<div class="shell">
  <header class="masthead">
    <a class="brand" href="/" aria-label="[[APP_NAME]] home">
      <svg class="mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="0" y="0" width="6.5" height="6.5" fill="#c6431e"/>
        <rect x="8.75" y="0" width="6.5" height="6.5" fill="currentColor"/>
        <rect x="17.5" y="0" width="6.5" height="6.5" fill="currentColor"/>
        <rect x="0" y="8.75" width="6.5" height="6.5" fill="currentColor"/>
        <rect x="8.75" y="8.75" width="6.5" height="6.5" fill="#1b5e57"/>
        <rect x="17.5" y="8.75" width="6.5" height="6.5" fill="currentColor"/>
        <rect x="0" y="17.5" width="6.5" height="6.5" fill="currentColor"/>
        <rect x="8.75" y="17.5" width="6.5" height="6.5" fill="currentColor"/>
        <rect x="17.5" y="17.5" width="6.5" height="6.5" fill="#c6431e"/>
      </svg>
      <span class="brand-name">Gridbricks</span>
      <span class="brand-sub">Wind forecast analytics</span>
    </a>
    <nav aria-label="Documentation">
      <a href="/docs">API reference</a>
      <a href="/redoc">Schema</a>
      <a href="/health">Health</a>
      <a href="/openapi.json">OpenAPI</a>
    </nav>
  </header>

  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <p class="kicker">Elexon BMRS &middot; FUELHH + WINDFOR &middot; January 2026</p>
      <h1 id="hero-title">Wind forecast analytics, <em>at decision time.</em></h1>
      <p class="lede">
        A read-only JSON API over real half-hourly wind generation and every
        published hourly forecast revision. Forecast selection is cutoff-aware,
        so each delivery hour is scored with only the information available at
        09:30 the previous day.
      </p>
      <div class="actions">
        <a class="button" href="/docs">Open API reference</a>
        <a class="button secondary" href="/api/accuracy?start_date=2026-01-01&amp;end_date=2026-01-07">Sample response</a>
        <span class="mode [[MODE_CLASS]]">[[MODE_LABEL]] &middot; v[[VERSION]]</span>
      </div>
    </section>

    <dl class="specs">
      <div class="spec">
        <dt>Analysis window</dt>
        <dd>[[WINDOW_HUMAN]]<small>[[DATES]]</small></dd>
      </div>
      <div class="spec">
        <dt>Resolution</dt>
        <dd>60 min forecast<small>mean of two 30 min halves</small></dd>
      </div>
      <div class="spec">
        <dt>Decision cutoff</dt>
        <dd>09:30 Europe/London<small>previous day &middot; inclusive</small></dd>
      </div>
      <div class="spec">
        <dt>Response</dt>
        <dd>JSON &middot; MW<small>every call carries X-Request-ID</small></dd>
      </div>
    </dl>

    <section aria-labelledby="endpoints-title">
      <div class="section-head">
        <h2 id="endpoints-title">Endpoints</h2>
        <p>All routes are GET. Dates are inclusive delivery dates inside the analysis window.</p>
      </div>
      <ol class="endpoints">
        <li class="endpoint">
          <span class="num" aria-hidden="true">01</span>
          <div>
            <div class="route"><span class="method">GET</span><code>/health</code></div>
            <p class="purpose">Liveness, version, timestamp and the process data mode. No upstream call.</p>
          </div>
          <a class="try" href="/health">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">02</span>
          <div>
            <div class="route"><span class="method">GET</span><code>/api/meta</code></div>
            <p class="purpose">Analysis period, resolutions, cutoff rule, source attribution and disclaimer.</p>
          </div>
          <a class="try" href="/api/meta">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">03</span>
          <div>
            <div class="route"><span class="method">GET</span><code>/api/accuracy</code></div>
            <p class="purpose">Coverage counts, MAE/RMSE/MBE, decision support and every matched interval.</p>
            <p class="params">Query: <code>start_date</code>, <code>end_date</code></p>
          </div>
          <a class="try" href="/api/accuracy?start_date=2026-01-01&amp;end_date=2026-01-07">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">04</span>
          <div>
            <div class="route"><span class="method">GET</span><code>/api/forecasts</code></div>
            <p class="purpose">The selected forecast for each delivery hour, without metrics.</p>
            <p class="params">Query: <code>start_date</code>, <code>end_date</code></p>
          </div>
          <a class="try" href="/api/forecasts?start_date=2026-01-01&amp;end_date=2026-01-07">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">05</span>
          <div>
            <div class="route"><span class="method">GET</span><code>/api/actuals</code></div>
            <p class="purpose">Half-hourly WIND records alongside their hourly means.</p>
            <p class="params">Query: <code>start_date</code>, <code>end_date</code></p>
          </div>
          <a class="try" href="/api/actuals?start_date=2026-01-01&amp;end_date=2026-01-07">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">06</span>
          <div>
            <div class="route"><span class="method">GET</span><code>/api/forecast-revisions</code></div>
            <p class="purpose">Every published revision for one delivery hour, marked eligible or after cutoff.</p>
            <p class="params">Query: <code>start_time</code> &mdash; ISO-8601 with timezone</p>
          </div>
          <a class="try" href="/api/forecast-revisions?start_time=2026-01-01T00:00:00Z">Try it</a>
        </li>
      </ol>
    </section>

    <section aria-labelledby="quickstart-title">
      <div class="section-head">
        <h2 id="quickstart-title">Quickstart</h2>
        <p>No key, no account. Point curl at this host or open the interactive console.</p>
      </div>
      <div class="quickstart">
        <pre class="code" tabindex="0" role="region" aria-label="Example curl requests"><code><span class="c"># Set the API host (this page's origin)</span>
BASE=<span class="p">"http://localhost:8000"</span>

<span class="c"># Liveness and data mode</span>
curl -s <span class="p">"$BASE/health"</span>

<span class="c"># Full-month accuracy: 744 hourly intervals</span>
curl -s <span class="p">"$BASE/api/accuracy?start_date=2026-01-01&amp;end_date=2026-01-31"</span> \\
  | python3 -m json.tool | head -40

<span class="c"># Every revision for the 1 January 00:00 delivery</span>
curl -s <span class="p">"$BASE/api/forecast-revisions?start_time=2026-01-01T00:00:00Z"</span></code></pre>
        <ul class="notes">
          <li class="note">
            <span class="n" aria-hidden="true">01</span>
            <div>
              <h3>Errors are structured</h3>
              <p>Failures return an <code>error</code> envelope with a code, a message and the same <code>request_id</code> as the header.</p>
            </div>
          </li>
          <li class="note">
            <span class="n" aria-hidden="true">02</span>
            <div>
              <h3>Dates are delivery dates</h3>
              <p>Inclusive, interpreted in Europe/London. Anything outside January 2026 returns <code>OUT_OF_ANALYSIS_PERIOD</code>.</p>
            </div>
          </li>
          <li class="note">
            <span class="n" aria-hidden="true">03</span>
            <div>
              <h3>No substituted values</h3>
              <p>Missing forecasts or actual halves are excluded and counted, never filled with zero. The <code>freshness</code> block says where each response came from.</p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section aria-labelledby="method-title">
      <div class="section-head">
        <h2 id="method-title">Method</h2>
        <p>Four rules that decide every number in a response.</p>
      </div>
      <div class="method-grid">
        <div class="note">
          <span class="n" aria-hidden="true">01</span>
          <div>
            <h3>Only what was known at the cutoff</h3>
            <p>For each delivery hour the API takes the latest WINDFOR publication at or before 09:30 Europe/London on the previous day. Later revisions are returned for audit and marked ineligible.</p>
          </div>
        </div>
        <div class="note">
          <span class="n" aria-hidden="true">02</span>
          <div>
            <h3>Two halves make an hour</h3>
            <p>The hourly actual is the mean of the two FUELHH settlement periods. If either half is missing, the hour is excluded from matching rather than imputed.</p>
          </div>
        </div>
        <div class="note">
          <span class="n" aria-hidden="true">03</span>
          <div>
            <h3>Error with direction</h3>
            <p>MAE and RMSE measure size; MBE keeps the sign. P90/P95 absolute error and P90 shortfall translate the same hours into reserve cover.</p>
          </div>
        </div>
        <div class="note">
          <span class="n" aria-hidden="true">04</span>
          <div>
            <h3>Provenance is part of the payload</h3>
            <p><code>freshness.data_state</code> distinguishes a live fetch, the stored snapshot, and a snapshot fallback, with a retrieval timestamp.</p>
          </div>
        </div>
      </div>
      <div class="callout">
        <p>
          This page is served by the API host. The React interface runs on its own
          origin and consumes the same endpoints same-origin when both are
          deployed together.
        </p>
        <a href="/docs">Start with /docs &rarr;</a>
      </div>
    </section>
  </main>

  <footer>
    <span>
      [[APP_NAME]] &middot; FastAPI &middot; Python 3.12 &middot; MIT licence<br>
      Source data: Elexon BMRS FUELHH and WINDFOR. Snapshot values are real observations.
    </span>
    <span>
      <a href="/docs">API reference</a> &middot;
      <a href="/redoc">ReDoc</a> &middot;
      <a href="/openapi.json">openapi.json</a> &middot;
      <a href="/health">health</a>
    </span>
  </footer>
</div>
</body>
</html>
"""


def _window_label(start, end) -> str:
    if (start.year, start.month) == (end.year, end.month):
        return f"{start.day}&ndash;{end.day} {end:%B %Y}"
    if start.year == end.year:
        return f"{start.day} {start:%B} &ndash; {end.day} {end:%B %Y}"
    return f"{start.day} {start:%B %Y} &ndash; {end.day} {end:%B %Y}"


def render_landing(settings: Settings, version: str) -> str:
    start = settings.analysis_start
    end = settings.analysis_end
    mode = settings.data_mode
    return (
        _TEMPLATE.replace("[[APP_NAME]]", escape(settings.app_name))
        .replace("[[VERSION]]", escape(version))
        .replace("[[WINDOW_HUMAN]]", _window_label(start, end))
        .replace("[[DATES]]", escape(f"{start.isoformat()} to {end.isoformat()}"))
        .replace(
            "[[MODE_LABEL]]",
            "Live Elexon fetch" if mode == "live" else "Snapshot data",
        )
        .replace("[[MODE_CLASS]]", "mode-live" if mode == "live" else "mode-snapshot")
    )
