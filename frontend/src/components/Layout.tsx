import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { GuideOverlay } from "./GuideOverlay";
import { useGuide } from "./GuideContext";
import { ThemeDialog } from "./ThemeDialog";
import {
  THEME_OPTIONS,
  useTheme,
  type ThemeName,
} from "./ThemeContext";

const navItems = [
  { to: "/", label: "Overview", end: true },
  { to: "/forecasts", label: "Forecast explorer" },
  { to: "/accuracy", label: "Accuracy analysis" },
  { to: "/data", label: "Data table" },
];

function GridMark({
  className = "",
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-6 w-6 shrink-0 grid-cols-2 gap-[3px] ${className}`}
    >
      <span className={inverted ? "bg-panel-ink" : "bg-ink"} />
      <span className="bg-signal" />
      <span className={inverted ? "bg-panel-ink/40" : "bg-ink/45"} />
      <span className={inverted ? "bg-panel-ink" : "bg-ink"} />
    </span>
  );
}

function GuideGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function ThemeGlyph({ theme }: { theme: ThemeName }) {
  if (theme === "light") {
    return (
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
      </svg>
    );
  }
  if (theme === "dark") {
    return (
      <svg
        aria-hidden="true"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M15 3v4h4M9 12h6M9 16h6" />
    </svg>
  );
}

function PageFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center"
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">
        Loading page…
      </p>
    </div>
  );
}

const UTILITY_CLASS =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 border border-ink/20 px-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:px-2.5";

export function Layout() {
  const { search } = useLocation();
  const { theme, openThemeDialog } = useTheme();
  const { startGuide } = useGuide();
  const themeLabel =
    THEME_OPTIONS.find((option) => option.id === theme)?.label ?? "Paper";

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-[11px] focus:uppercase focus:tracking-[0.14em] focus:text-paper"
      >
        Skip to content
      </a>

      <div className="border-b border-ink/20 bg-panel text-panel-ink/70">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-1.5 sm:px-8 lg:px-12">
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em]">
            <span aria-hidden="true" className="h-1.5 w-1.5 bg-signal" />
            Gridbricks — Wind forecast intelligence
          </p>
          <p className="hidden items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em] sm:flex">
            <span>Source · Elexon BMRS</span>
            <span aria-hidden="true" className="h-2.5 w-px bg-panel-ink/25" />
            <span>Cutoff · 09:30 Europe/London</span>
          </p>
        </div>
      </div>

      <header className="border-b-2 border-ink bg-paper lg:sticky lg:top-0 lg:z-40">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 pb-2 pt-3 sm:gap-3 sm:px-8 sm:pb-3 sm:pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-6 lg:px-12">
          <div className="flex items-center justify-between gap-3 lg:contents">
            <NavLink
              to={{ pathname: "/", search }}
              className="flex items-center gap-3 self-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal lg:col-start-1 lg:row-start-1 lg:justify-self-start"
            >
              <GridMark />
              <span className="flex items-baseline gap-3">
                <span className="display text-[26px] leading-none tracking-[-0.035em]">
                  Gridbricks
                </span>
                <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-mute sm:inline lg:hidden xl:inline">
                  Wind forecast intelligence
                </span>
              </span>
            </NavLink>

            <div className="flex shrink-0 items-center gap-1.5 lg:col-start-3 lg:row-start-1 lg:justify-self-end lg:self-center">
              <button
                type="button"
                className={UTILITY_CLASS}
                aria-label="Open the site guide"
                aria-haspopup="dialog"
                onClick={(event) => {
                  event.currentTarget.focus();
                  startGuide();
                }}
              >
                <GuideGlyph />
                <span className="hidden sm:inline">Guide</span>
              </button>
              <button
                type="button"
                className={UTILITY_CLASS}
                aria-label={`Change appearance. Current theme: ${themeLabel}`}
                aria-haspopup="dialog"
                data-tour="theme-trigger"
                onClick={(event) => {
                  event.currentTarget.focus();
                  openThemeDialog();
                }}
              >
                <ThemeGlyph theme={theme} />
                <span className="hidden sm:inline">{themeLabel}</span>
              </button>
            </div>
          </div>

          <nav
            aria-label="Primary"
            data-tour="primary-nav"
            className="relative grid grid-cols-2 gap-x-6 border-t border-rule-soft after:pointer-events-none after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-rule-soft after:content-[''] sm:flex sm:items-stretch sm:justify-center sm:gap-0 sm:overflow-x-auto sm:border-t sm:pt-2 sm:after:hidden lg:col-start-2 lg:row-start-1 lg:overflow-visible lg:border-t-0 lg:pt-0"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={{ pathname: item.to, search }}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "group relative flex min-h-[44px] items-center py-2.5 text-[11px] font-medium tracking-[0.01em] transition-colors sm:inline-flex sm:min-h-0 sm:shrink-0 sm:px-4 sm:py-1.5 sm:text-[12px] sm:first:pl-0 sm:last:pr-0",
                    isActive ? "text-ink" : "text-ink-mute hover:text-ink",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <span className="relative">
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={`absolute -bottom-1.5 left-0 right-0 h-[2px] origin-left bg-signal transition-transform duration-300 ${
                        isActive ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        className="type-area mx-auto w-full max-w-[1360px] flex-1 px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14"
      >
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="relative overflow-hidden border-t-2 border-ink bg-panel text-panel-ink/60">
        <div
          aria-hidden="true"
          className="panel-grid pointer-events-none absolute inset-0 opacity-70"
        />
        <div className="relative mx-auto grid max-w-[1360px] gap-7 px-4 py-8 sm:grid-cols-2 sm:gap-8 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-12">
          <div>
            <div className="flex items-center gap-3">
              <GridMark inverted className="opacity-90" />
              <p className="font-serif text-xl leading-none tracking-[-0.03em] text-panel-ink">
                Gridbricks
              </p>
            </div>
            <p className="prose-note mt-3 max-w-xs text-[11px] leading-5">
              Wind forecast analytics pilot for January 2026. A decision-support
              study, not a procurement optimiser.
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-panel-ink/40">
              Data
            </p>
            <p className="prose-note mt-2 text-[11px] leading-5">
              Elexon BMRS FUELHH (actual wind) and WINDFOR (forecasts). Public
              data, used under the Elexon BMRS terms.
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-panel-ink/40">
              Scope
            </p>
            <p className="prose-note mt-2 text-[11px] leading-5">
              Cutoff 09:30 Europe/London on the day before delivery. Forecast
              accuracy only — no prices, demand, or contract data.
            </p>
          </div>
        </div>
        <div className="relative border-t border-panel-ink/10">
          <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-panel-ink/35 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
            <span>No. 01 · January 2026</span>
            <span>Set in Newsreader &amp; IBM Plex</span>
          </div>
        </div>
      </footer>

      <ThemeDialog />
      <GuideOverlay />
    </div>
  );
}
