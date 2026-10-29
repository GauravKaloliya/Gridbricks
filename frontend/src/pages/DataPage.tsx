import { useState } from "react";

import { ActualsTable } from "../components/ActualsTable";
import { CsvExportButton } from "../components/CsvExportButton";
import { DataTable } from "../components/DataTable";
import { DateRangeControl } from "../components/DateRangeControl";
import { useDateRange } from "../components/DateRangeContext";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import {
  ErrorState,
  FreshnessBadge,
  LoadingState,
  PartialDataBanner,
} from "../components/States";
import { useAccuracy, useActuals, useMeta } from "../hooks/useAnalytics";
import { formatPercent, formatCount } from "../lib/format";

type DataView = "intervals" | "actuals";

export function DataPage() {
  const { range } = useDateRange();
  const [view, setView] = useState<DataView>("intervals");
  const query = useAccuracy(range.start, range.end);
  const actuals = useActuals(range.start, range.end, view === "actuals");
  const meta = useMeta();
  const showingActuals = view === "actuals";

  const tabClass = (active: boolean) =>
    [
      "relative -mb-px flex min-h-[44px] items-center gap-1.5 border-b-2 px-0 py-2.5 text-left text-[9px] font-semibold uppercase leading-4 tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:inline-flex sm:min-h-0 sm:gap-2 sm:text-[10px]",
      active
        ? "border-signal text-ink"
        : "border-transparent text-ink-mute hover:text-ink",
    ].join(" ");

  return (
    <>
      <PageHeader
        eyebrow="Interval data"
        title="Forecast and actual data table"
        description="Audit each hourly delivery interval: which forecast was eligible, when it was published, what was delivered, and why a row may be unavailable."
      >
        <DateRangeControl />
      </PageHeader>

      {query.isPending ? <LoadingState /> : null}

      {query.isError ? (
        <ErrorState
          message={query.error.message}
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {query.data ? (
        <div className="space-y-10">
          <PartialDataBanner counts={query.data.counts} />

          <div className="grid divide-y divide-rule-soft border-y border-ink/25 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:divide-rule">
            {showingActuals ? (
              <>
                <KpiCard
                  label="Half-hour records"
                  value={actuals.data ? formatCount(actuals.data.records.length) : "—"}
                  hint="FUELHH WIND settlement periods."
                  index={0}
                />
                <KpiCard
                  label="Complete hours"
                  value={actuals.data ? String(actuals.data.hourly.length) : "—"}
                  hint="Pairs used in the accuracy comparison."
                  tone="positive"
                  index={1}
                />
                <KpiCard
                  label="Units"
                  value={query.data.unit}
                  hint="30-minute actuals, as published by Elexon."
                  index={2}
                />
              </>
            ) : (
              <>
                <KpiCard
                  label="Rows"
                  value={String(query.data.intervals.length)}
                  hint="Hourly delivery intervals."
                  index={0}
                />
                <KpiCard
                  label="Matched"
                  value={formatPercent(query.data.counts.coverage_pct)}
                  hint={`${query.data.counts.matched_count} usable of ${query.data.counts.candidate_count}`}
                  tone="positive"
                  meter={query.data.counts.coverage_pct}
                  index={1}
                />
                <KpiCard
                  label="Units"
                  value={query.data.unit}
                  hint="Generation, as published by Elexon."
                  index={2}
                />
              </>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Data table view"
            className="grid grid-cols-2 gap-x-4 border-b border-rule sm:flex sm:gap-8"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "intervals"}
              className={tabClass(view === "intervals")}
              onClick={() => setView("intervals")}
            >
              <span
                aria-hidden="true"
                className="hidden font-mono text-[9px] opacity-60 sm:inline"
              >
                A
              </span>
              Hourly analysis intervals
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "actuals"}
              className={tabClass(view === "actuals")}
              onClick={() => setView("actuals")}
            >
              <span
                aria-hidden="true"
                className="hidden font-mono text-[9px] opacity-60 sm:inline"
              >
                B
              </span>
              Half-hourly actuals
            </button>
          </div>

          {showingActuals ? (
            <SectionCard
              className="lg:max-w-[1080px]"
              title="Half-hourly FUELHH actuals"
              subtitle="Raw WIND settlement periods at 30-minute resolution"
            >
              {actuals.isPending ? (
                <LoadingState label="Loading half-hourly actuals…" />
              ) : null}
              {actuals.isError ? (
                <ErrorState
                  message={actuals.error.message}
                  onRetry={() => void actuals.refetch()}
                />
              ) : null}
              {actuals.data ? (
                <ActualsTable records={actuals.data.records} />
              ) : null}
            </SectionCard>
          ) : (
            <SectionCard
              title="Interval detail"
              subtitle={query.data.matching_rule}
              action={
                <CsvExportButton
                  intervals={query.data.intervals}
                  start={query.data.start_date}
                  end={query.data.end_date}
                />
              }
            >
              <DataTable intervals={query.data.intervals} />
            </SectionCard>
          )}

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <SectionCard title="Data provenance">
              <FreshnessBadge freshness={query.data.freshness} />
            </SectionCard>

            <SectionCard title="Source and scope">
              {meta.isPending ? (
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-mute">
                  Loading source notes…
                </p>
              ) : null}
              {meta.isError ? (
                <p className="text-[11px] leading-5 text-oxblood">
                  Source notes are unavailable: {meta.error.message}
                </p>
              ) : null}
              {meta.data ? (
                <dl className="space-y-4 text-[11px] leading-5 text-ink-soft">
                  <div>
                    <dt className="kicker mb-1">Attribution</dt>
                    <dd>{meta.data.source_attribution}</dd>
                  </div>
                  <div className="border-t border-rule-soft pt-3">
                    <dt className="kicker mb-1">Resolution</dt>
                    <dd>
                      WINDFOR forecasts are hourly; FUELHH actuals are
                      half-hourly. Each forecast hour is compared with the mean
                      of its two actual settlement periods.
                    </dd>
                  </div>
                  <div className="border-t border-rule-soft pt-3">
                    <dt className="kicker mb-1">Disclaimer</dt>
                    <dd>{meta.data.disclaimer}</dd>
                  </div>
                </dl>
              ) : null}
            </SectionCard>
          </div>
        </div>
      ) : null}
    </>
  );
}
