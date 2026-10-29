import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

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
      <span className={inverted ? "bg-paper" : "bg-ink"} />
      <span className="bg-signal" />
      <span className={inverted ? "bg-paper/40" : "bg-ink/45"} />
      <span className={inverted ? "bg-paper" : "bg-ink"} />
    </span>
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

export function Layout() {
  const { search } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-[11px] focus:uppercase focus:tracking-[0.14em] focus:text-paper"
      >
        Skip to content
      </a>

      <div className="border-b border-ink/20 bg-ink text-paper/70">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-4 py-1.5 sm:px-8 lg:px-12">
          <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em]">
            <span aria-hidden="true" className="h-1.5 w-1.5 bg-signal" />
            Gridbricks — Wind forecast intelligence
          </p>
          <p className="hidden items-center gap-4 font-mono text-[9px] uppercase tracking-[0.16em] sm:flex">
            <span>Source · Elexon BMRS</span>
            <span aria-hidden="true" className="h-2.5 w-px bg-paper/25" />
            <span>Cutoff · 09:30 Europe/London</span>
          </p>
        </div>
      </div>

      <header className="border-b-2 border-ink bg-paper lg:sticky lg:top-0 lg:z-40">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 pb-2 pt-3 sm:gap-3 sm:px-8 sm:pb-3 sm:pt-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:px-12">
          <NavLink
            to={{ pathname: "/", search }}
            className="flex items-center gap-3 self-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
          >
            <GridMark />
            <span className="flex items-baseline gap-3">
              <span className="display text-[26px] leading-none tracking-[-0.035em]">
                Gridbricks
              </span>
              <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-mute sm:inline">
                Wind forecast intelligence
              </span>
            </span>
          </NavLink>

          <nav
            aria-label="Primary"
            className="relative grid grid-cols-2 gap-x-6 border-t border-rule-soft after:pointer-events-none after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-rule-soft after:content-[''] sm:flex sm:items-stretch sm:gap-0 sm:overflow-x-auto sm:border-t sm:pt-2 sm:after:hidden lg:overflow-visible lg:border-t-0 lg:pt-0"
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

      <footer className="relative overflow-hidden border-t-2 border-ink bg-ink text-paper/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #f4f1e9 1px, transparent 1px), linear-gradient(to bottom, #f4f1e9 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative mx-auto grid max-w-[1360px] gap-7 px-4 py-8 sm:grid-cols-2 sm:gap-8 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_1fr_1fr] lg:px-12">
          <div>
            <div className="flex items-center gap-3">
              <GridMark inverted className="opacity-90" />
              <p className="font-serif text-xl leading-none tracking-[-0.03em] text-paper">
                Gridbricks
              </p>
            </div>
            <p className="prose-note mt-3 max-w-xs text-[11px] leading-5">
              Wind forecast analytics pilot for January 2026. A decision-support
              study, not a procurement optimiser.
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/40">
              Data
            </p>
            <p className="prose-note mt-2 text-[11px] leading-5">
              Elexon BMRS FUELHH (actual wind) and WINDFOR (forecasts). Public
              data, used under the Elexon BMRS terms.
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/40">
              Scope
            </p>
            <p className="prose-note mt-2 text-[11px] leading-5">
              Cutoff 09:30 Europe/London on the day before delivery. Forecast
              accuracy only — no prices, demand, or contract data.
            </p>
          </div>
        </div>
        <div className="relative border-t border-paper/10">
          <div className="mx-auto flex max-w-[1360px] flex-col gap-2 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-paper/35 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
            <span>No. 01 · January 2026</span>
            <span>Set in Newsreader &amp; IBM Plex</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
