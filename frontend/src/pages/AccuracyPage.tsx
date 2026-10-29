import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { DateRangeControl } from "../components/DateRangeControl";
import { useDateRange } from "../components/DateRangeContext";
import { DecisionSupportPanel } from "../components/DecisionSupportPanel";
import { ErrorChart } from "../components/ErrorChart";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import {
  EmptyState,
  ErrorState,
  FreshnessBadge,
  LoadingState,
  PartialDataBanner,
} from "../components/States";
import { useAccuracy } from "../hooks/useAnalytics";
import {
  formatLongDate,
  formatMW,
  formatPercent,
  formatSignedMW,
} from "../lib/format";

function CountRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule-soft py-2.5 last:border-0">
      <dt className="text-[11px] text-ink">
        {label}
        {hint ? (
          <span className="mt-0.5 block text-[10px] leading-4 text-ink-mute">
            {hint}
          </span>
        ) : null}
      </dt>
      <dd className="font-mono text-[14px] tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="border-b border-rule-soft pb-3 last:border-0 last:pb-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink">
        {term}
      </dt>
      <dd className="mt-1 text-[11px] leading-5 text-ink-soft">{children}</dd>
    </div>
  );
}

export function AccuracyPage() {
  const { range } = useDateRange();
  const query = useAccuracy(range.start, range.end);

  return (
    <>
      <PageHeader
        eyebrow="Accuracy analysis"
        title="How close were the eligible forecasts?"
        description="Every metric is computed only from hourly intervals that have both an eligible forecast and both half-hourly actuals. Missing data is excluded, never filled."
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

          {query.data.metrics.status === "no_data" ? (
            <EmptyState
              title="No matched intervals to score"
              description="This range has no hourly interval with both an eligible forecast and complete actuals. Widen the date range or inspect the data table for the reason on each interval."
            />
          ) : (
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <p className="kicker">Error metrics</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
                  {query.data.metrics.matched_count} matched hours
                </p>
              </div>
              <div className="mt-2 grid divide-y divide-rule-soft border-y border-ink/25 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:divide-rule">
                <KpiCard
                  label="MAE"
                  value={formatMW(query.data.metrics.mae)}
                  unit="MW"
                  hint={`Mean absolute error over ${query.data.metrics.matched_count} matched hours.`}
                  index={0}
                />
                <KpiCard
                  label="RMSE"
                  value={formatMW(query.data.metrics.rmse)}
                  unit="MW"
                  hint="Root mean squared error. Penalises large misses more than MAE."
                  index={1}
                />
                <KpiCard
                  label="Mean signed error"
                  value={formatSignedMW(query.data.metrics.mbe)}
                  unit="MW"
                  hint="Forecast minus actual. Positive means overforecasting on average."
                  tone={
                    query.data.metrics.mbe !== null && query.data.metrics.mbe > 0
                      ? "warning"
                      : "default"
                  }
                  index={2}
                />
              </div>
            </div>
          )}

          <SectionCard
            title="Signed error by delivery interval"
            subtitle={`${formatLongDate(range.start)} – ${formatLongDate(range.end)} · forecast − actual in MW`}
            tourId="accuracy-chart"
          >
            <ErrorChart intervals={query.data.intervals} />
          </SectionCard>

          {query.data.metrics.status === "ok" &&
          query.data.decision_support ? (
            <SectionCard
              title="Decision support"
              subtitle="What the measured error implies for reserve cover, and how accuracy changes with forecast lead time."
              tourId="decision-support"
            >
              <DecisionSupportPanel
                decision={query.data.decision_support}
                intervals={query.data.intervals}
              />
            </SectionCard>
          ) : null}

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
            <SectionCard
              title="Coverage and data quality"
              subtitle="How the candidate hours resolve into the scored set."
              tourId="accuracy-coverage"
            >
              <dl>
                <CountRow
                  label="Candidate hours"
                  value={String(query.data.counts.candidate_count)}
                  hint="Hourly delivery intervals in the selected date range."
                />
                <CountRow
                  label="Matched hours used in metrics"
                  value={String(query.data.counts.matched_count)}
                  hint="Eligible forecast plus both half-hourly actuals."
                />
                <CountRow
                  label="Missing eligible forecast"
                  value={String(query.data.counts.missing_forecast_count)}
                  hint="No forecast published at or before the cutoff."
                />
                <CountRow
                  label="Missing actual"
                  value={String(query.data.counts.missing_actual_count)}
                  hint="One or both half-hourly FUELHH records unavailable."
                />
                <CountRow
                  label="Invalid records"
                  value={String(query.data.counts.invalid_record_count)}
                  hint="Malformed or conflicting duplicate values, rejected explicitly."
                />
                <CountRow
                  label="Matched coverage"
                  value={formatPercent(query.data.counts.coverage_pct)}
                />
              </dl>
              <p className="mt-3 border-t border-rule-soft pt-3 text-[10px] leading-5 text-ink-mute">
                Interval status is resolved in this order: invalid record,
                missing eligible forecast, missing actual, matched. See the{" "}
                <Link to="/data" className="link">
                  data table
                </Link>{" "}
                for the reason recorded on each row.
              </p>
            </SectionCard>

            <div className="space-y-10">
              <SectionCard
                title="Metric definitions"
                subtitle="How each figure is calculated from matched intervals."
              >
                <dl className="space-y-3">
                  <Definition term="Signed error (bias)">
                    forecast<sub>t</sub> − actual<sub>t</sub>. Positive values
                    mean the forecast was above what was delivered
                    (overforecast); negative values mean underforecast.
                  </Definition>
                  <Definition term="MAE — mean absolute error">
                    Mean of |forecast<sub>t</sub> − actual<sub>t</sub>| across
                    matched hours. Same units as generation (MW).
                  </Definition>
                  <Definition term="RMSE — root mean squared error">
                    Square root of the mean squared error. Same units as
                    generation (MW), but large errors weigh more than in MAE.
                  </Definition>
                  <Definition term="MBE — mean signed error">
                    Mean of the signed error. A systematic positive MBE points
                    to persistent overforecasting.
                  </Definition>
                </dl>
                <p className="mt-4 border-t border-rule pt-3 text-[10px] leading-5 text-ink-mute">
                  {query.data.metrics.sign_convention} Units:{" "}
                  {query.data.metrics.unit}. A percentage error metric is
                  intentionally omitted because actual wind generation can be
                  zero or near zero, which would make relative error unstable.
                </p>
              </SectionCard>

              <SectionCard title="Data provenance">
                <FreshnessBadge freshness={query.data.freshness} />
              </SectionCard>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
