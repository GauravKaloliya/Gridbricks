"""Human-readable landing page served at the backend root.

The root used to return a bare JSON blob, which is a poor first impression when
someone opens the API host in a browser. The machine-readable equivalent lives
at ``/api/meta`` and in ``/openapi.json``; this page is a static, script-free
overview that links to the interactive docs.
"""

from __future__ import annotations

from datetime import UTC, datetime, time, timedelta
from html import escape

from app.core.config import Settings

_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>[[APP_NAME]] &middot; API reference</title>
<meta name="description" content="Complete reference for the Gridbricks wind forecast analytics API: endpoints, parameters, response fields, error codes and data provenance.">
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

  section { scroll-margin-top: 1.5rem; }

  .route a {
    color: inherit;
    text-decoration: none;
    border-bottom: 1px solid var(--rule);
  }

  .route a:hover { border-bottom-color: var(--signal); }

  .endpoint-detail {
    padding: 1.9rem 0;
    border-bottom: 1px solid var(--rule);
    scroll-margin-top: 1.5rem;
  }

  .ep-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem 1.5rem;
  }

  .endpoint-detail h3 {
    margin: 0;
    font-family: var(--serif);
    font-size: 1.3rem;
    font-weight: 400;
    letter-spacing: -0.01em;
  }

  .endpoint-detail h3 code { font-family: var(--mono); font-size: 1.02rem; }

  .endpoint-detail h4, .object h4, #errors h4 {
    margin: 1.5rem 0 0.35rem;
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .endpoint-detail .purpose { max-width: 82ch; }

  .table-wrap {
    margin-top: 0.55rem;
    overflow-x: auto;
    border: 1px solid var(--rule);
    background: var(--raised);
  }

  .table-wrap:focus-visible { outline: 2px solid var(--signal); outline-offset: 2px; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    line-height: 1.5;
  }

  th {
    padding: 0.6rem 0.8rem;
    border-bottom: 1px solid var(--ink);
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }

  td {
    padding: 0.55rem 0.8rem;
    border-bottom: 1px solid var(--rule-soft);
    color: var(--ink-soft);
    vertical-align: top;
  }

  tr:last-child td { border-bottom: 0; }

  th:first-child, td:first-child { min-width: 9.5rem; }

  td code { color: var(--ink); font-size: 0.74rem; overflow-wrap: break-word; }

  .example {
    margin-top: 0.55rem;
    border: 1px solid var(--rule);
    background: var(--raised);
  }

  .example summary {
    padding: 0.65rem 0.8rem;
    color: var(--ink-soft);
    cursor: pointer;
    font-family: var(--mono);
    font-size: 0.64rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .example summary:hover { color: var(--ink); }

  .example .code {
    margin: 0;
    border-top: 1px solid var(--rule);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .example-note {
    margin: 0.35rem 0 0;
    color: var(--ink-mute);
    font-family: var(--mono);
    font-size: 0.64rem;
  }

  .human-routes { margin-top: 1.25rem; }

  .subhead {
    margin: 2rem 0 0.35rem;
    font-family: var(--serif);
    font-size: 1.2rem;
    font-weight: 400;
    letter-spacing: -0.01em;
  }

  .object {
    padding: 1.5rem 0;
    border-bottom: 1px solid var(--rule-soft);
    scroll-margin-top: 1.5rem;
  }

  .object h3 {
    margin: 0;
    font-family: var(--serif);
    font-size: 1.15rem;
    font-weight: 400;
  }

  .object h3 code { font-family: var(--mono); font-size: 0.96rem; }

  .object .desc {
    margin: 0.35rem 0 0;
    max-width: 82ch;
    color: var(--ink-soft);
    font-size: 0.86rem;
  }

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
    th:first-child, td:first-child {
      position: sticky;
      left: 0;
      z-index: 1;
      background: var(--raised);
      box-shadow: 1px 0 0 var(--rule);
    }
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
    <nav aria-label="Reference sections">
      <a href="#conventions">Conventions</a>
      <a href="#endpoints">Endpoints</a>
      <a href="#objects">Objects</a>
      <a href="#errors">Errors</a>
      <a href="#quickstart">Quickstart</a>
      <a href="/openapi.json">OpenAPI</a>
    </nav>
  </header>

  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <p class="kicker">API reference &middot; Elexon BMRS &middot; [[WINDOW_HUMAN]]</p>
      <h1 id="hero-title">Wind forecast analytics, <em>at decision time.</em></h1>
      <p class="lede">
        The complete reference for every route, parameter, field, status code
        and provenance marker. The API is read-only, needs no key, and scores
        each delivery hour with only the information available at the decision
        cutoff.
      </p>
      <div class="actions">
        <a class="button" href="#quickstart">Quickstart</a>
        <a class="button secondary" href="/openapi.json">OpenAPI schema</a>
        <a class="button secondary" href="/api/accuracy?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]">Sample response</a>
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
        <dd>[[CUTOFF_TIME]] [[CUTOFF_TZ]]<small>previous day &middot; [[CUTOFF_FLAG]]</small></dd>
      </div>
      <div class="spec">
        <dt>Response</dt>
        <dd>JSON &middot; MW<small>every call carries X-Request-ID</small></dd>
      </div>
    </dl>

    <section id="conventions" aria-labelledby="conventions-title">
      <div class="section-head">
        <h2 id="conventions-title">Conventions</h2>
        <p>These rules apply to every JSON endpoint.</p>
      </div>
      <div class="table-wrap" tabindex="0" role="region" aria-label="API conventions">
        <table>
          <thead>
            <tr><th scope="col">Property</th><th scope="col">Value</th></tr>
          </thead>
          <tbody>
            <tr><td>Base URL</td><td>The origin serving this page. Local development defaults to <code>http://localhost:8000</code>.</td></tr>
            <tr><td>Methods</td><td><code>GET</code> for every data endpoint; <code>OPTIONS</code> for CORS preflight. No other method is supported.</td></tr>
            <tr><td>Authentication</td><td>None. No API key, token, cookie or credential is required or accepted.</td></tr>
            <tr><td>Content types</td><td>JSON responses are <code>application/json</code>. This reference is <code>text/html; charset=utf-8</code>.</td></tr>
            <tr><td>Analysis window</td><td><code>[[DATES]]</code>. Requests outside it return <code>OUT_OF_ANALYSIS_PERIOD</code>.</td></tr>
            <tr><td>Delivery dates</td><td><code>start_date</code> and <code>end_date</code> are inclusive calendar dates interpreted in <code>Europe/London</code>, not publication dates.</td></tr>
            <tr><td>Default range</td><td>Omit both dates: the range starts at the analysis start and runs six days, capped at the analysis end.</td></tr>
            <tr><td>Maximum range</td><td>[[MAX_RANGE]] days per request. Longer or inverted ranges return <code>INVALID_REQUEST</code>.</td></tr>
            <tr><td>Resolutions</td><td>Forecasts are hourly (60 min). Actuals are half-hourly (30 min). Each hourly actual is the mean of its two halves.</td></tr>
            <tr><td>Units</td><td>Generation and every error value are in <strong>MW</strong>.</td></tr>
            <tr><td>Signed error</td><td><code>forecast - actual</code>. A positive value means the forecast was too high.</td></tr>
            <tr><td>Timestamps</td><td>ISO-8601 UTC with a <code>Z</code> suffix. A delivery hour is identified by its <code>start_time</code>.</td></tr>
            <tr><td>Missing values</td><td><code>null</code>, never <code>0</code>. Missing or invalid source data is excluded from metrics and counted in <code>counts</code>.</td></tr>
            <tr><td>Request correlation</td><td><code>X-Request-ID</code> is returned on every response and repeated as <code>request_id</code> in error envelopes.</td></tr>
            <tr><td>CORS</td><td><code>GET</code> and <code>OPTIONS</code> for configured origins, credentials disabled, <code>X-Request-ID</code> exposed.</td></tr>
            <tr><td>Provenance</td><td>Every analysis response carries a <code>freshness</code> object describing the live, cached, snapshot or fallback source.</td></tr>
            <tr><td>Schema</td><td><code>/openapi.json</code> is OpenAPI 3.1 for the JSON endpoints. <code>/redoc</code> renders it.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section id="endpoints" aria-labelledby="endpoints-title">
      <div class="section-head">
        <h2 id="endpoints-title">Endpoints</h2>
        <p>Six JSON endpoints, plus human and schema routes. Every JSON endpoint is GET.</p>
      </div>
      <ol class="endpoints">
        <li class="endpoint">
          <span class="num" aria-hidden="true">01</span>
          <div>
            <div class="route"><span class="method">GET</span><a href="#ep-health"><code>/health</code></a></div>
            <p class="purpose">Liveness, version, timestamp and the process data mode. No upstream call.</p>
          </div>
          <a class="try" href="/health">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">02</span>
          <div>
            <div class="route"><span class="method">GET</span><a href="#ep-meta"><code>/api/meta</code></a></div>
            <p class="purpose">Analysis period, resolutions, cutoff rule, source attribution and disclaimer.</p>
          </div>
          <a class="try" href="/api/meta">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">03</span>
          <div>
            <div class="route"><span class="method">GET</span><a href="#ep-accuracy"><code>/api/accuracy</code></a></div>
            <p class="purpose">Coverage counts, MAE/RMSE/MBE, decision support and every matched interval.</p>
            <p class="params">Query: <code>start_date</code>, <code>end_date</code></p>
          </div>
          <a class="try" href="/api/accuracy?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">04</span>
          <div>
            <div class="route"><span class="method">GET</span><a href="#ep-forecasts"><code>/api/forecasts</code></a></div>
            <p class="purpose">The selected forecast for each delivery hour, without metrics.</p>
            <p class="params">Query: <code>start_date</code>, <code>end_date</code></p>
          </div>
          <a class="try" href="/api/forecasts?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">05</span>
          <div>
            <div class="route"><span class="method">GET</span><a href="#ep-actuals"><code>/api/actuals</code></a></div>
            <p class="purpose">Half-hourly WIND records alongside their hourly means.</p>
            <p class="params">Query: <code>start_date</code>, <code>end_date</code></p>
          </div>
          <a class="try" href="/api/actuals?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]">Try it</a>
        </li>
        <li class="endpoint">
          <span class="num" aria-hidden="true">06</span>
          <div>
            <div class="route"><span class="method">GET</span><a href="#ep-revisions"><code>/api/forecast-revisions</code></a></div>
            <p class="purpose">Every published revision for one delivery hour, marked eligible or after cutoff.</p>
            <p class="params">Query: <code>start_time</code> &mdash; ISO-8601 with timezone</p>
          </div>
          <a class="try" href="/api/forecast-revisions?start_time=[[SAMPLE_HOUR]]">Try it</a>
        </li>
      </ol>

      <h3 class="subhead">Human and schema routes</h3>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Human and schema routes">
        <table>
          <thead>
            <tr><th scope="col">Route</th><th scope="col">Returns</th><th scope="col">Notes</th></tr>
          </thead>
          <tbody>
            <tr><td><code>/</code> and <code>/docs</code></td><td>This HTML reference</td><td>Rendered from the running settings. No JavaScript, strict CSP, 5-minute cache, excluded from OpenAPI.</td></tr>
            <tr><td><code>/redoc</code></td><td>ReDoc interface</td><td>Generated from the OpenAPI schema in the browser.</td></tr>
            <tr><td><code>/openapi.json</code></td><td>OpenAPI 3.1 document</td><td>Machine-readable contract for the six JSON endpoints.</td></tr>
          </tbody>
        </table>
      </div>

      <article class="endpoint-detail" id="ep-health" aria-labelledby="ep-health-title">
        <div class="ep-head">
          <div class="route"><span class="method">GET</span><h3 id="ep-health-title"><code>/health</code></h3></div>
          <a class="try" href="/health">Try it</a>
        </div>
        <p class="purpose">Liveness and process identity. It performs no upstream call and no dataset read, so it is safe for platform health checks.</p>
        <h4>Response fields</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Health response fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>status</code></td><td>string</td><td>Always <code>"ok"</code> when the process can answer.</td></tr>
              <tr><td><code>service</code></td><td>string</td><td>Configured application name.</td></tr>
              <tr><td><code>version</code></td><td>string</td><td>API build version.</td></tr>
              <tr><td><code>timestamp</code></td><td>string</td><td>Response generation time, ISO-8601 UTC with offset.</td></tr>
              <tr><td><code>data_mode</code></td><td>string</td><td><code>live</code> when the process fetches Elexon upstream, <code>snapshot</code> when it reads the bundled dataset.</td></tr>
            </tbody>
          </table>
        </div>
        <details class="example" open>
          <summary>Example response</summary>
          <pre class="code" tabindex="0" role="region" aria-label="Health example response"><code>{
  "status": "ok",
  "service": "[[APP_NAME]]",
  "version": "[[VERSION]]",
  "timestamp": "2026-01-01T09:45:12.345678+00:00",
  "data_mode": "snapshot"
}</code></pre>
        </details>
      </article>

      <article class="endpoint-detail" id="ep-meta" aria-labelledby="ep-meta-title">
        <div class="ep-head">
          <div class="route"><span class="method">GET</span><h3 id="ep-meta-title"><code>/api/meta</code></h3></div>
          <a class="try" href="/api/meta">Try it</a>
        </div>
        <p class="purpose">The effective configuration and attribution: analysis period, resolutions, cutoff rule, data mode, source attribution and the scope disclaimer. No query parameters.</p>
        <h4>Response fields</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Meta response fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>app_name</code></td><td>string</td><td>Application name.</td></tr>
              <tr><td><code>analysis_start</code></td><td>date</td><td>First supported delivery date, inclusive.</td></tr>
              <tr><td><code>analysis_end</code></td><td>date</td><td>Last supported delivery date, inclusive.</td></tr>
              <tr><td><code>timezone</code></td><td>string</td><td>IANA zone used to interpret delivery dates and the cutoff.</td></tr>
              <tr><td><code>forecast_resolution_minutes</code></td><td>integer</td><td><code>60</code>.</td></tr>
              <tr><td><code>actual_resolution_minutes</code></td><td>integer</td><td><code>30</code>.</td></tr>
              <tr><td><code>cutoff</code></td><td>object</td><td><a href="#obj-cutoff">CutoffInfo</a>: clock time, zone, inclusivity, rule and documented assumption.</td></tr>
              <tr><td><code>data_mode</code></td><td>string</td><td><code>live</code> or <code>snapshot</code> for this process.</td></tr>
              <tr><td><code>source_attribution</code></td><td>string</td><td>Exact upstream datasets and their terms.</td></tr>
              <tr><td><code>disclaimer</code></td><td>string</td><td>What the tool does and does not model.</td></tr>
            </tbody>
          </table>
        </div>
        <details class="example" open>
          <summary>Example response</summary>
          <pre class="code" tabindex="0" role="region" aria-label="Meta example response"><code>{
  "app_name": "[[APP_NAME]]",
  "analysis_start": "2026-01-01",
  "analysis_end": "2026-01-31",
  "timezone": "Europe/London",
  "forecast_resolution_minutes": 60,
  "actual_resolution_minutes": 30,
  "cutoff": {
    "local_time": "09:30",
    "timezone": "Europe/London",
    "inclusive": true,
    "rule": "For each delivery interval, choose the forecast with the latest publishTime where publishTime &lt;= cutoff.",
    "assumption": "The brief does not specify a clock-time cutoff. This implementation uses 09:30 Europe/London on the calendar day before delivery, inclusive. The rule is configurable and is an explicit assumption, not a client rule."
  },
  "data_mode": "snapshot",
  "source_attribution": "Actuals: Elexon BMRS FUELHH (WIND). Forecasts: Elexon BMRS WINDFOR. Public data, used under the Elexon BMRS terms.",
  "disclaimer": "This tool analyses national wind forecast accuracy only. It does not calculate an optimal procurement volume and does not use demand, prices, other generation, or contract data."
}</code></pre>
        </details>
      </article>

      <article class="endpoint-detail" id="ep-accuracy" aria-labelledby="ep-accuracy-title">
        <div class="ep-head">
          <div class="route"><span class="method">GET</span><h3 id="ep-accuracy-title"><code>/api/accuracy</code></h3></div>
          <a class="try" href="/api/accuracy?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]">Try it</a>
        </div>
        <p class="purpose">The full analysis for a date range: coverage counts, error metrics, decision-support statistics and one row per delivery hour. This is the endpoint the interface uses for its accuracy, breakdown and data pages.</p>
        <h4>Query parameters</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Accuracy query parameters">
          <table>
            <thead><tr><th scope="col">Parameter</th><th scope="col">Type</th><th scope="col">Required</th><th scope="col">Default and rules</th></tr></thead>
            <tbody>
              <tr><td><code>start_date</code></td><td>ISO date</td><td>No</td><td>Analysis start. Must be on or before <code>end_date</code>.</td></tr>
              <tr><td><code>end_date</code></td><td>ISO date</td><td>No</td><td><code>start_date + 6 days</code>, capped at the analysis end. Range must not exceed [[MAX_RANGE]] days.</td></tr>
            </tbody>
          </table>
        </div>
        <h4>Response fields</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Accuracy response fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>start_date</code></td><td>date</td><td>First delivery date in the response.</td></tr>
              <tr><td><code>end_date</code></td><td>date</td><td>Last delivery date in the response.</td></tr>
              <tr><td><code>timezone</code></td><td>string</td><td>Zone used for delivery dates and the cutoff.</td></tr>
              <tr><td><code>unit</code></td><td>string</td><td><code>"MW"</code>.</td></tr>
              <tr><td><code>forecast_resolution_minutes</code></td><td>integer</td><td><code>60</code>.</td></tr>
              <tr><td><code>actual_resolution_minutes</code></td><td>integer</td><td><code>30</code>.</td></tr>
              <tr><td><code>matching_rule</code></td><td>string</td><td>How hourly forecasts are paired with half-hourly actuals.</td></tr>
              <tr><td><code>cutoff</code></td><td>object</td><td><a href="#obj-cutoff">CutoffInfo</a>.</td></tr>
              <tr><td><code>counts</code></td><td>object</td><td><a href="#obj-counts">AnalysisCounts</a>: candidates, matches and failure counts.</td></tr>
              <tr><td><code>metrics</code></td><td>object</td><td><a href="#obj-metrics">AccuracyMetrics</a>: MAE, RMSE, MBE and status.</td></tr>
              <tr><td><code>decision_support</code></td><td>object</td><td><a href="#obj-decision">DecisionSupport</a>: percentiles, shortfall, underforecast share and lead-time buckets.</td></tr>
              <tr><td><code>intervals</code></td><td>array</td><td>One <a href="#obj-interval">IntervalResult</a> per delivery hour in range, in time order.</td></tr>
              <tr><td><code>freshness</code></td><td>object</td><td><a href="#obj-freshness">DataFreshness</a>.</td></tr>
            </tbody>
          </table>
        </div>
        <details class="example" open>
          <summary>Example response</summary>
          <pre class="code" tabindex="0" role="region" aria-label="Accuracy example response"><code>{
  "start_date": "2026-01-01",
  "end_date": "2026-01-01",
  "timezone": "Europe/London",
  "unit": "MW",
  "forecast_resolution_minutes": 60,
  "actual_resolution_minutes": 30,
  "matching_rule": "WINDFOR forecasts are hourly and FUELHH actuals are half-hourly. Each forecast hour is paired with the mean of the two half-hourly actuals in that hour; both halves must be present. No half-hourly forecast values are invented.",
  "cutoff": {
    "local_time": "09:30",
    "timezone": "Europe/London",
    "inclusive": true,
    "rule": "For each delivery interval, choose the forecast with the latest publishTime where publishTime &lt;= cutoff.",
    "assumption": "The brief does not specify a clock-time cutoff. This implementation uses 09:30 Europe/London on the calendar day before delivery, inclusive."
  },
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
      { "label": "18-24 h", "lower_hours": 18.0, "upper_hours": 24.0, "matched_count": 6, "mae": 3930.9166666666665, "mean_signed_error": 3930.9166666666665 },
      { "label": "24-30 h", "lower_hours": 24.0, "upper_hours": 30.0, "matched_count": 6, "mae": 3865.6666666666665, "mean_signed_error": 3865.6666666666665 },
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
}</code></pre>
        </details>
        <p class="example-note">The intervals array is trimmed to one entry. Every hour in range is returned.</p>
      </article>

      <article class="endpoint-detail" id="ep-forecasts" aria-labelledby="ep-forecasts-title">
        <div class="ep-head">
          <div class="route"><span class="method">GET</span><h3 id="ep-forecasts-title"><code>/api/forecasts</code></h3></div>
          <a class="try" href="/api/forecasts?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]">Try it</a>
        </div>
        <p class="purpose">The selected forecast for each delivery hour, with the cutoff that governed the choice. It is the accuracy endpoint without metrics, counts or decision support, and is useful for auditing the selection itself.</p>
        <h4>Query parameters</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Forecasts query parameters">
          <table>
            <thead><tr><th scope="col">Parameter</th><th scope="col">Type</th><th scope="col">Required</th><th scope="col">Default and rules</th></tr></thead>
            <tbody>
              <tr><td><code>start_date</code></td><td>ISO date</td><td>No</td><td>Analysis start.</td></tr>
              <tr><td><code>end_date</code></td><td>ISO date</td><td>No</td><td>Start plus six days, capped at the analysis end; maximum [[MAX_RANGE]] days.</td></tr>
            </tbody>
          </table>
        </div>
        <h4>Response fields</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Forecasts response fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>start_date</code></td><td>date</td><td>First delivery date in the response.</td></tr>
              <tr><td><code>end_date</code></td><td>date</td><td>Last delivery date in the response.</td></tr>
              <tr><td><code>cutoff</code></td><td>object</td><td><a href="#obj-cutoff">CutoffInfo</a>.</td></tr>
              <tr><td><code>intervals</code></td><td>array</td><td>One <a href="#obj-interval">IntervalResult</a> per hour, including forecasts, actuals, errors and status.</td></tr>
              <tr><td><code>freshness</code></td><td>object</td><td><a href="#obj-freshness">DataFreshness</a>.</td></tr>
            </tbody>
          </table>
        </div>
        <details class="example" open>
          <summary>Example response</summary>
          <pre class="code" tabindex="0" role="region" aria-label="Forecasts example response"><code>{
  "start_date": "2026-01-01",
  "end_date": "2026-01-01",
  "cutoff": {
    "local_time": "09:30",
    "timezone": "Europe/London",
    "inclusive": true,
    "rule": "For each delivery interval, choose the forecast with the latest publishTime where publishTime &lt;= cutoff.",
    "assumption": "The brief does not specify a clock-time cutoff. This implementation uses 09:30 Europe/London on the calendar day before delivery, inclusive."
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
}</code></pre>
        </details>
      </article>

      <article class="endpoint-detail" id="ep-actuals" aria-labelledby="ep-actuals-title">
        <div class="ep-head">
          <div class="route"><span class="method">GET</span><h3 id="ep-actuals-title"><code>/api/actuals</code></h3></div>
          <a class="try" href="/api/actuals?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]">Try it</a>
        </div>
        <p class="purpose">Raw half-hourly WIND records for audit, plus the hourly means used when matching against forecasts.</p>
        <h4>Query parameters</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Actuals query parameters">
          <table>
            <thead><tr><th scope="col">Parameter</th><th scope="col">Type</th><th scope="col">Required</th><th scope="col">Default and rules</th></tr></thead>
            <tbody>
              <tr><td><code>start_date</code></td><td>ISO date</td><td>No</td><td>Analysis start.</td></tr>
              <tr><td><code>end_date</code></td><td>ISO date</td><td>No</td><td>Start plus six days, capped at the analysis end; maximum [[MAX_RANGE]] days.</td></tr>
            </tbody>
          </table>
        </div>
        <h4>Response fields</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Actuals response fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>start_date</code></td><td>date</td><td>First delivery date.</td></tr>
              <tr><td><code>end_date</code></td><td>date</td><td>Last delivery date.</td></tr>
              <tr><td><code>unit</code></td><td>string</td><td><code>"MW"</code>.</td></tr>
              <tr><td><code>actual_resolution_minutes</code></td><td>integer</td><td><code>30</code>.</td></tr>
              <tr><td><code>hourly_resolution_minutes</code></td><td>integer</td><td><code>60</code>.</td></tr>
              <tr><td><code>records</code></td><td>array</td><td><a href="#obj-actual-record">ActualRecord</a> objects, sorted by start time.</td></tr>
              <tr><td><code>hourly</code></td><td>array</td><td><a href="#obj-hourly">HourlyActual</a> objects. Only hours with both halves present appear.</td></tr>
              <tr><td><code>freshness</code></td><td>object</td><td><a href="#obj-freshness">DataFreshness</a>.</td></tr>
            </tbody>
          </table>
        </div>
        <details class="example" open>
          <summary>Example response</summary>
          <pre class="code" tabindex="0" role="region" aria-label="Actuals example response"><code>{
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
    },
    {
      "start_time": "2026-01-01T00:00:00Z",
      "publish_time": "2026-01-01T00:30:00Z",
      "generation": 13896.0,
      "fuel_type": "WIND",
      "settlement_date": "2025-12-31",
      "settlement_period": 49,
      "source": "Elexon FUELHH"
    }
  ],
  "hourly": [
    { "start_time": "2026-01-01T00:00:00Z", "generation": 13814.5, "periods_used": 2 }
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
}</code></pre>
        </details>
        <p class="example-note">Records and hourly rows are trimmed. Settlement periods 49 and 50 belong to the same UK settlement day as periods 1 and 2 of the next day.</p>
      </article>

      <article class="endpoint-detail" id="ep-revisions" aria-labelledby="ep-revisions-title">
        <div class="ep-head">
          <div class="route"><span class="method">GET</span><h3 id="ep-revisions-title"><code>/api/forecast-revisions</code></h3></div>
          <a class="try" href="/api/forecast-revisions?start_time=[[SAMPLE_HOUR]]">Try it</a>
        </div>
        <p class="purpose">Every published WINDFOR version for one delivery hour, including versions published after the cutoff. Each version is marked eligible and at most one is marked selected, so the selection can be audited directly.</p>
        <h4>Query parameters</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Revisions query parameters">
          <table>
            <thead><tr><th scope="col">Parameter</th><th scope="col">Type</th><th scope="col">Required</th><th scope="col">Rules</th></tr></thead>
            <tbody>
              <tr><td><code>start_time</code></td><td>ISO datetime</td><td>Yes</td><td>Must include a timezone offset, align to a whole hour, and fall inside the analysis period.</td></tr>
            </tbody>
          </table>
        </div>
        <h4>Response fields</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Revisions response fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>start_time</code></td><td>datetime</td><td>Requested delivery hour, normalised to UTC.</td></tr>
              <tr><td><code>decision_cutoff</code></td><td>datetime</td><td>Cutoff applied to this delivery hour.</td></tr>
              <tr><td><code>selected_publish_time</code></td><td>datetime | null</td><td>Publication time of the selected version, or null when none was eligible.</td></tr>
              <tr><td><code>status</code></td><td>enum</td><td><a href="#obj-status">IntervalStatus</a> after selection.</td></tr>
              <tr><td><code>revisions</code></td><td>array</td><td><a href="#obj-revision">ForecastRevision</a> objects, sorted by publication time.</td></tr>
              <tr><td><code>freshness</code></td><td>object</td><td><a href="#obj-freshness">DataFreshness</a>.</td></tr>
            </tbody>
          </table>
        </div>
        <details class="example" open>
          <summary>Example response</summary>
          <pre class="code" tabindex="0" role="region" aria-label="Revisions example response"><code>{
  "start_time": "2026-01-01T00:00:00Z",
  "decision_cutoff": "2025-12-31T09:30:00Z",
  "selected_publish_time": "2025-12-31T09:30:00Z",
  "status": "matched",
  "revisions": [
    { "publish_time": "2025-12-30T02:30:00Z", "generation": 19028.0, "eligible": true, "selected": false },
    { "publish_time": "2025-12-31T09:30:00Z", "generation": 19466.0, "eligible": true, "selected": true },
    { "publish_time": "2025-12-31T11:30:00Z", "generation": 19563.0, "eligible": false, "selected": false }
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
}</code></pre>
        </details>
        <p class="example-note">Post-cutoff versions remain visible with eligible false. They are never selected.</p>
      </article>
    </section>

    <section id="objects" aria-labelledby="objects-title">
      <div class="section-head">
        <h2 id="objects-title">Objects</h2>
        <p>Every field the JSON API can return, including nested objects and enumerations.</p>
      </div>

      <article class="object" id="obj-cutoff">
        <h3><code>CutoffInfo</code></h3>
        <p class="desc">The selection rule applied to every delivery hour. It is embedded in meta and accuracy responses and returned by forecasts.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="CutoffInfo fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>local_time</code></td><td>string</td><td>Cutoff clock time as <code>HH:MM</code>.</td></tr>
              <tr><td><code>timezone</code></td><td>string</td><td>IANA zone in which the cutoff time is interpreted.</td></tr>
              <tr><td><code>inclusive</code></td><td>boolean</td><td>True when a forecast published exactly at the cutoff is eligible.</td></tr>
              <tr><td><code>rule</code></td><td>string</td><td>Human-readable selection rule, including the comparison operator.</td></tr>
              <tr><td><code>assumption</code></td><td>string</td><td>The documented assumption about the clock time, because the brief does not prescribe one.</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="object" id="obj-counts">
        <h3><code>AnalysisCounts</code></h3>
        <p class="desc">Coverage totals across the hourly intervals in the requested range. Counts partition candidates by status.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="AnalysisCounts fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>candidate_count</code></td><td>integer</td><td>Number of hourly delivery intervals in range.</td></tr>
              <tr><td><code>matched_count</code></td><td>integer</td><td>Intervals with status <code>matched</code>.</td></tr>
              <tr><td><code>missing_forecast_count</code></td><td>integer</td><td>Intervals with no eligible forecast.</td></tr>
              <tr><td><code>missing_actual_count</code></td><td>integer</td><td>Intervals missing one or both actual halves.</td></tr>
              <tr><td><code>invalid_record_count</code></td><td>integer</td><td>Intervals blocked by malformed or contradictory records.</td></tr>
              <tr><td><code>coverage_pct</code></td><td>number</td><td><code>matched_count / candidate_count x 100</code>; <code>0.0</code> when there are no candidates.</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="object" id="obj-metrics">
        <h3><code>AccuracyMetrics</code></h3>
        <p class="desc">Errors over matched hours only. The sign convention is <code>forecast - actual</code>.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="AccuracyMetrics fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>status</code></td><td>enum</td><td><code>ok</code> when at least one hour matched, otherwise <code>no_data</code>.</td></tr>
              <tr><td><code>mae</code></td><td>number | null</td><td>Mean absolute error in MW.</td></tr>
              <tr><td><code>rmse</code></td><td>number | null</td><td>Root mean squared error in MW.</td></tr>
              <tr><td><code>mbe</code></td><td>number | null</td><td>Mean signed error in MW. Positive means forecasts ran high.</td></tr>
              <tr><td><code>matched_count</code></td><td>integer</td><td>Hours included in the three metrics.</td></tr>
              <tr><td><code>unit</code></td><td>string</td><td><code>"MW"</code>.</td></tr>
              <tr><td><code>sign_convention</code></td><td>string</td><td><code>"forecast - actual"</code>.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="example-note">With status no_data, mae, rmse and mbe are null and matched_count is 0.</p>
      </article>

      <article class="object" id="obj-decision">
        <h3><code>DecisionSupport</code></h3>
        <p class="desc">Distribution and reserve statistics computed from matched hours only.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="DecisionSupport fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>p90_absolute_error</code></td><td>number | null</td><td>90th percentile of absolute error, linearly interpolated at position <code>(n - 1) x 0.90</code>.</td></tr>
              <tr><td><code>p95_absolute_error</code></td><td>number | null</td><td>95th percentile of absolute error, same interpolation.</td></tr>
              <tr><td><code>p90_shortfall</code></td><td>number | null</td><td>90th percentile of <code>max(actual - forecast, 0)</code> across every matched hour, including hours with no shortfall.</td></tr>
              <tr><td><code>underforecast_share_pct</code></td><td>number | null</td><td>Percentage of matched hours where actual generation exceeded the forecast.</td></tr>
              <tr><td><code>lead_time_buckets</code></td><td>array</td><td><a href="#obj-bucket">LeadTimeBucket</a> objects for the four fixed ranges.</td></tr>
              <tr><td><code>method</code></td><td>string</td><td>Plain-language statement of the percentile and shortfall definitions.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="example-note">With no matched hours every value is null and the bucket array is empty.</p>
      </article>

      <article class="object" id="obj-bucket">
        <h3><code>LeadTimeBucket</code></h3>
        <p class="desc">Error statistics grouped by delivery start minus the selected publication time: under 18 h, 18-24 h, 24-30 h and 30 h or more. Buckets are lower-inclusive and upper-exclusive.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="LeadTimeBucket fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>label</code></td><td>string</td><td>Human-readable range, for example <code>"18-24 h"</code>.</td></tr>
              <tr><td><code>lower_hours</code></td><td>number | null</td><td>Inclusive lower bound; null means unbounded below.</td></tr>
              <tr><td><code>upper_hours</code></td><td>number | null</td><td>Exclusive upper bound; null means unbounded above.</td></tr>
              <tr><td><code>matched_count</code></td><td>integer</td><td>Matched hours in this bucket.</td></tr>
              <tr><td><code>mae</code></td><td>number | null</td><td>Mean absolute error in MW for the bucket.</td></tr>
              <tr><td><code>mean_signed_error</code></td><td>number | null</td><td>Mean of <code>forecast - actual</code> in MW for the bucket.</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="object" id="obj-interval">
        <h3><code>IntervalResult</code></h3>
        <p class="desc">One hourly delivery interval. The same object appears in accuracy and forecasts responses.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="IntervalResult fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>start_time</code></td><td>datetime</td><td>Delivery hour start, UTC.</td></tr>
              <tr><td><code>end_time</code></td><td>datetime</td><td>Delivery hour end, one hour later.</td></tr>
              <tr><td><code>decision_cutoff</code></td><td>datetime</td><td>Cutoff applied to this hour.</td></tr>
              <tr><td><code>selected_publish_time</code></td><td>datetime | null</td><td>Publication time of the selected forecast; null when none was eligible.</td></tr>
              <tr><td><code>forecast_generation</code></td><td>number | null</td><td>Selected forecast in MW; null when none was eligible.</td></tr>
              <tr><td><code>actual_generation</code></td><td>number | null</td><td>Mean of the two actual halves in MW; null unless both halves exist.</td></tr>
              <tr><td><code>signed_error</code></td><td>number | null</td><td><code>forecast_generation - actual_generation</code>.</td></tr>
              <tr><td><code>absolute_error</code></td><td>number | null</td><td>Absolute value of <code>signed_error</code>.</td></tr>
              <tr><td><code>status</code></td><td>enum</td><td><a href="#obj-status">IntervalStatus</a>.</td></tr>
              <tr><td><code>detail</code></td><td>string | null</td><td>Why an interval did not match; null for a clean match.</td></tr>
              <tr><td><code>actual_periods_used</code></td><td>integer</td><td>Actual halves used: 2 for a match, 1 or 0 otherwise.</td></tr>
              <tr><td><code>eligible_forecast_count</code></td><td>integer</td><td>Published versions at or before the cutoff for this hour.</td></tr>
              <tr><td><code>lead_time_hours</code></td><td>number | null</td><td>Delivery start minus selected publication time in hours; null without an eligible forecast.</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="object" id="obj-freshness">
        <h3><code>DataFreshness</code></h3>
        <p class="desc">Provenance for the data behind the response. It is returned by every analysis endpoint and is never omitted.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="DataFreshness fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>retrieved_at</code></td><td>datetime | null</td><td>When the dataset was retrieved or restored; null if unknown.</td></tr>
              <tr><td><code>data_state</code></td><td>enum</td><td><code>live</code>, <code>cache</code>, <code>snapshot</code> or <code>snapshot_fallback</code>. See the table below.</td></tr>
              <tr><td><code>source</code></td><td>string</td><td>Upstream datasets used for actuals and forecasts.</td></tr>
              <tr><td><code>cache_age_seconds</code></td><td>integer | null</td><td>Age of the disk-cached dataset; null when not served from cache.</td></tr>
              <tr><td><code>is_fallback</code></td><td>boolean</td><td>True only when <code>data_state</code> is <code>snapshot_fallback</code>.</td></tr>
              <tr><td><code>note</code></td><td>string | null</td><td>Plain-language provenance statement.</td></tr>
              <tr><td><code>warnings</code></td><td>array of strings</td><td>Non-empty when the response is degraded or a live fetch failed.</td></tr>
            </tbody>
          </table>
        </div>
        <h4>Data states</h4>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Data states">
          <table>
            <thead><tr><th scope="col">State</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>live</code></td><td>Fetched from Elexon during this process and still fresh.</td></tr>
              <tr><td><code>cache</code></td><td>Loaded from a local cache of a previous live fetch; <code>cache_age_seconds</code> is set.</td></tr>
              <tr><td><code>snapshot</code></td><td>Loaded from the bundled dataset of real Elexon observations.</td></tr>
              <tr><td><code>snapshot_fallback</code></td><td>A live fetch failed and the snapshot was served instead. The response is still 200 and carries warnings.</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="object" id="obj-actual-record">
        <h3><code>ActualRecord</code></h3>
        <p class="desc">One raw half-hourly FUELHH WIND observation.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="ActualRecord fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>start_time</code></td><td>datetime</td><td>Start of the half-hour settlement period, UTC.</td></tr>
              <tr><td><code>publish_time</code></td><td>datetime</td><td>When Elexon published the observation, UTC.</td></tr>
              <tr><td><code>generation</code></td><td>number</td><td>Wind generation in MW. Never negative.</td></tr>
              <tr><td><code>fuel_type</code></td><td>string</td><td>Always <code>"WIND"</code>.</td></tr>
              <tr><td><code>settlement_date</code></td><td>date | null</td><td>UK settlement date when present upstream.</td></tr>
              <tr><td><code>settlement_period</code></td><td>integer | null</td><td>Settlement period 1-50; clock-change days can exceed 48.</td></tr>
              <tr><td><code>source</code></td><td>string</td><td><code>"Elexon FUELHH"</code>.</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="object" id="obj-hourly">
        <h3><code>HourlyActual</code></h3>
        <p class="desc">The hourly actual used for matching.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="HourlyActual fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>start_time</code></td><td>datetime</td><td>Start of the delivery hour, UTC.</td></tr>
              <tr><td><code>generation</code></td><td>number</td><td>Mean of the two half-hourly actuals in MW.</td></tr>
              <tr><td><code>periods_used</code></td><td>integer</td><td>Number of actual halves used. Only hours with both halves are listed.</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="object" id="obj-revision">
        <h3><code>ForecastRevision</code></h3>
        <p class="desc">One published WINDFOR version for a delivery hour.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="ForecastRevision fields">
          <table>
            <thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>publish_time</code></td><td>datetime</td><td>Publication time, UTC.</td></tr>
              <tr><td><code>generation</code></td><td>number</td><td>Forecast generation in MW.</td></tr>
              <tr><td><code>eligible</code></td><td>boolean</td><td>True when the publication is at or before the cutoff.</td></tr>
              <tr><td><code>selected</code></td><td>boolean</td><td>True for the chosen version. At most one revision per hour is selected.</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="object" id="obj-status">
        <h3><code>IntervalStatus</code></h3>
        <p class="desc">The outcome of matching one delivery hour.</p>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Interval statuses">
          <table>
            <thead><tr><th scope="col">Value</th><th scope="col">Meaning</th></tr></thead>
            <tbody>
              <tr><td><code>matched</code></td><td>An eligible forecast and both half-hourly actuals are present.</td></tr>
              <tr><td><code>missing_forecast</code></td><td>No forecast was published on or before the cutoff.</td></tr>
              <tr><td><code>missing_actual</code></td><td>One or both actual halves are missing or invalid.</td></tr>
              <tr><td><code>invalid_record</code></td><td>Malformed or contradictory duplicate source records.</td></tr>
              <tr><td><code>upstream_unavailable</code></td><td>Reserved for upstream unavailability markers; not emitted by the current pipeline.</td></tr>
            </tbody>
          </table>
        </div>
        <p class="example-note">Only matched rows contribute to metrics, counts of error, decision support and coverage percentage.</p>
      </article>
    </section>

    <section id="errors" aria-labelledby="errors-title">
      <div class="section-head">
        <h2 id="errors-title">Errors</h2>
        <p>One envelope for every failure, with an HTTP status and a stable code.</p>
      </div>
      <p class="purpose">Validation failures, scope failures, upstream failures and unexpected exceptions all return the same shape. The <code>request_id</code> matches the <code>X-Request-ID</code> response header so a visible failure can be traced to one server log line.</p>
      <details class="example" open>
        <summary>Example error response</summary>
        <pre class="code" tabindex="0" role="region" aria-label="Error example response"><code>{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Date range must not exceed [[MAX_RANGE]] days",
    "request_id": "8f14e45fceea167a5a36dedd4bea2543"
  }
}</code></pre>
      </details>
      <div class="table-wrap" tabindex="0" role="region" aria-label="Error codes">
        <table>
          <thead><tr><th scope="col">HTTP</th><th scope="col">Code</th><th scope="col">When</th></tr></thead>
          <tbody>
            <tr><td>400</td><td><code>INVALID_REQUEST</code></td><td>Malformed or missing parameter, inverted range, range longer than [[MAX_RANGE]] days, non-hour <code>start_time</code>, or a missing timezone.</td></tr>
            <tr><td>400</td><td><code>OUT_OF_ANALYSIS_PERIOD</code></td><td>A date or delivery hour outside <code>[[DATES]]</code>.</td></tr>
            <tr><td>404</td><td><code>NOT_FOUND</code></td><td>Unknown path.</td></tr>
            <tr><td>405</td><td><code>METHOD_NOT_ALLOWED</code></td><td>Any method other than GET or OPTIONS.</td></tr>
            <tr><td>502</td><td><code>UPSTREAM_UNAVAILABLE</code></td><td>Elexon failed and no stored snapshot exists.</td></tr>
            <tr><td>503</td><td><code>DATA_UNAVAILABLE</code></td><td>No dataset is available.</td></tr>
            <tr><td>504</td><td><code>UPSTREAM_TIMEOUT</code></td><td>An upstream request timed out and no snapshot exists.</td></tr>
            <tr><td>500</td><td><code>INTERNAL_ERROR</code></td><td>Unexpected server error. Details are logged, not returned.</td></tr>
          </tbody>
        </table>
      </div>
      <h4>Additional rules</h4>
      <ul class="notes">
        <li class="note">
          <span class="n" aria-hidden="true">01</span>
          <div>
            <h3>Validation details</h3>
            <p>A validation failure may include an optional <code>details</code> array inside <code>error</code> with the offending location and message.</p>
          </div>
        </li>
        <li class="note">
          <span class="n" aria-hidden="true">02</span>
          <div>
            <h3>Fallback is not an error</h3>
            <p>When a live fetch fails but the stored snapshot is usable, the API returns 200 with <code>freshness.data_state = "snapshot_fallback"</code>, <code>is_fallback: true</code> and a warning. Missing data is never hidden behind zeros.</p>
          </div>
        </li>
        <li class="note">
          <span class="n" aria-hidden="true">03</span>
          <div>
            <h3>Missing data is not a failure</h3>
            <p>A gap in the source data yields interval rows with <code>status</code> set, null measurements and matching counts. The request itself still succeeds.</p>
          </div>
        </li>
      </ul>
    </section>

    <section id="quickstart" aria-labelledby="quickstart-title">
      <div class="section-head">
        <h2 id="quickstart-title">Quickstart</h2>
        <p>No key, no account. Replace the host with this page's origin.</p>
      </div>
      <div class="quickstart">
        <pre class="code" tabindex="0" role="region" aria-label="Example curl requests"><code><span class="c"># Set the API host (this page's origin)</span>
BASE=<span class="p">"http://localhost:8000"</span>

<span class="c"># 1. Liveness and process mode</span>
curl -s <span class="p">"$BASE/health"</span>

<span class="c"># 2. Effective configuration and cutoff</span>
curl -s <span class="p">"$BASE/api/meta"</span>

<span class="c"># 3. Accuracy for an inclusive date range</span>
curl -s <span class="p">"$BASE/api/accuracy?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]"</span> \\
  | python3 -m json.tool

<span class="c"># 4. Selected forecasts without metrics</span>
curl -s <span class="p">"$BASE/api/forecasts?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]"</span>

<span class="c"># 5. Raw half-hourly actuals and hourly means</span>
curl -s <span class="p">"$BASE/api/actuals?start_date=[[SAMPLE_START]]&amp;end_date=[[SAMPLE_END]]"</span>

<span class="c"># 6. Every revision for one delivery hour</span>
curl -s <span class="p">"$BASE/api/forecast-revisions?start_time=[[SAMPLE_HOUR]]"</span>

<span class="c"># Correlation header on any response</span>
curl -s -D - -o /dev/null <span class="p">"$BASE/api/meta"</span> | grep -i x-request-id

<span class="c"># Error envelope: outside the analysis period</span>
curl -s <span class="p">"$BASE/api/accuracy?start_date=2025-01-01"</span></code></pre>
        <ul class="notes">
          <li class="note">
            <span class="n" aria-hidden="true">01</span>
            <div>
              <h3>No authentication</h3>
              <p>The API is read-only and public. Send no key, cookie or credential. Only GET and OPTIONS are accepted.</p>
            </div>
          </li>
          <li class="note">
            <span class="n" aria-hidden="true">02</span>
            <div>
              <h3>Dates are delivery dates</h3>
              <p>Inclusive and interpreted in Europe/London. Omitted dates default to six days from the analysis start, capped at the analysis end and [[MAX_RANGE]] days.</p>
            </div>
          </li>
          <li class="note">
            <span class="n" aria-hidden="true">03</span>
            <div>
              <h3>No substituted values</h3>
              <p>Missing forecasts or actual halves are excluded and counted, never filled with zero. Unmatched hours keep null measurements.</p>
            </div>
          </li>
          <li class="note">
            <span class="n" aria-hidden="true">04</span>
            <div>
              <h3>Provenance in every payload</h3>
              <p><code>freshness</code> reports live, cache, snapshot or fallback data, with a retrieval timestamp, note and warnings.</p>
            </div>
          </li>
          <li class="note">
            <span class="n" aria-hidden="true">05</span>
            <div>
              <h3>Audit every decision</h3>
              <p><code>/api/forecast-revisions</code> returns post-cutoff versions with <code>eligible: false</code>, so a selection can be checked against every publication.</p>
            </div>
          </li>
          <li class="note">
            <span class="n" aria-hidden="true">06</span>
            <div>
              <h3>Structured failures</h3>
              <p>Every failure returns an <code>error</code> envelope with an HTTP status, a stable code, a message and the same <code>request_id</code> as the header.</p>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section id="method" aria-labelledby="method-title">
      <div class="section-head">
        <h2 id="method-title">Method</h2>
        <p>Four rules that decide every number in a response.</p>
      </div>
      <div class="method-grid">
        <div class="note">
          <span class="n" aria-hidden="true">01</span>
          <div>
            <h3>Only what was known at the cutoff</h3>
            <p>For each delivery hour the API takes the latest WINDFOR publication [[CUTOFF_WORD]] [[CUTOFF_TIME]] [[CUTOFF_TZ]] on the previous day. Later revisions are returned for audit and marked ineligible.</p>
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
            <p><code>freshness.data_state</code> distinguishes a live fetch, a disk cache, the stored snapshot and a snapshot fallback, with a retrieval timestamp and warnings.</p>
          </div>
        </div>
      </div>
      <div class="callout">
        <p>
          This page is the API reference and the API host root. The React
          interface runs on its own origin and consumes the same endpoints
          same-origin when both are deployed together.
        </p>
        <a href="#objects">Every field, defined &rarr;</a>
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
    sample_end = min(start + timedelta(days=6), end)
    sample_hour = (
        datetime.combine(start, time.min, tzinfo=UTC)
        .isoformat()
        .replace("+00:00", "Z")
    )
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
        .replace(
            "[[CUTOFF_TIME]]", escape(settings.decision_cutoff_time.strftime("%H:%M"))
        )
        .replace("[[CUTOFF_TZ]]", escape(settings.decision_cutoff_tz))
        .replace(
            "[[CUTOFF_WORD]]",
            "at or before" if settings.decision_cutoff_inclusive else "before",
        )
        .replace(
            "[[CUTOFF_FLAG]]",
            "inclusive" if settings.decision_cutoff_inclusive else "exclusive",
        )
        .replace("[[MAX_RANGE]]", escape(str(settings.max_range_days)))
        .replace("[[SAMPLE_START]]", escape(start.isoformat()))
        .replace("[[SAMPLE_END]]", escape(sample_end.isoformat()))
        .replace("[[SAMPLE_HOUR]]", escape(sample_hour))
    )
