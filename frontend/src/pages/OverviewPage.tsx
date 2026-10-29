import { CutoffExplainer } from "../components/CutoffExplainer";
import { DateRangeControl } from "../components/DateRangeControl";
import { useDateRange } from "../components/DateRangeContext";
import { ForecastActualChart } from "../components/ForecastActualChart";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import {
  ErrorState,
  FreshnessBadge,
  LoadingState,
  PartialDataBanner,
} from "../components/States";
import { useAccuracy } from "../hooks/useAnalytics";
import {
  formatDecimal,
  formatLongDate,
  formatMW,
  formatPercent,
  formatSignedMW,
} from "../lib/format";

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function SummaryRow({
  label,
  value,
  unit,
  accent = "text-ink",
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule-soft py-2.5 last:border-0">
      <dt className="text-[11px] text-ink-soft">{label}</dt>
      <dd className={`font-mono text-[13px] tabular-nums ${accent}`}>
        {value}
        {unit ? (
          <span className="ml-1.5 text-[9px] uppercase tracking-[0.1em] text-ink-mute">
            {unit}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

export function OverviewPage() {
  const { range } = useDateRange();
  const query = useAccuracy(range.start, range.end);

  return (
    <>
      <PageHeader
        eyebrow="Pilot · Day-ahead wind analytics"
        title="January 2026 wind forecast performance"
        description="See which wind forecast was actually available at the decision cutoff, and how close eligible forecasts were to delivered generation."
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

          <div>
            <div className="flex items-baseline justify-between gap-4">
              <p className="kicker">Key figures</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">
                Forecast error · MW
              </p>
            </div>
            <div
              className="mt-2 grid divide-y divide-rule-soft border-y border-ink/25 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:divide-rule xl:grid-cols-4"
              data-tour="overview-kpis"
            >
              <KpiCard
                label="MAE"
                value={formatMW(query.data.metrics.mae)}
                unit="MW"
                hint={`Mean absolute error across ${query.data.metrics.matched_count} matched hours. Lower is better.`}
                index={0}
              />
              <KpiCard
                label="RMSE"
                value={formatMW(query.data.metrics.rmse)}
                unit="MW"
                hint="Root mean squared error. Large misses carry more weight than in MAE."
                index={1}
              />
              <KpiCard
                label="Mean signed error"
                value={formatSignedMW(query.data.metrics.mbe)}
                unit="MW"
                hint="Forecast minus actual. Positive means average overforecasting."
                tone={
                  query.data.metrics.mbe !== null && query.data.metrics.mbe > 0
                    ? "warning"
                    : "default"
                }
                index={2}
              />
              <KpiCard
                label="Matched coverage"
                value={formatPercent(query.data.counts.coverage_pct)}
                hint={`${query.data.counts.matched_count} of ${query.data.counts.candidate_count} hourly intervals have an eligible forecast and both actual halves.`}
                tone="positive"
                meter={query.data.counts.coverage_pct}
                index={3}
              />
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            <SectionCard
              className="lg:col-span-2"
              title="Selected forecast versus actual"
              subtitle={`${formatLongDate(range.start)} – ${formatLongDate(range.end)} · Europe/London`}
              tourId="overview-chart"
            >
              <ForecastActualChart intervals={query.data.intervals} />
            </SectionCard>

            <div className="space-y-10">
              <SectionCard
                title="Period summary"
                subtitle="Averages across every hourly interval in the window."
              >
                <dl>
                  <SummaryRow
                    label="Average selected forecast"
                    value={formatMW(
                      mean(
                        query.data.intervals
                          .map((interval) => interval.forecast_generation)
                          .filter((value): value is number => value !== null),
                      ),
                    )}
                    unit="MW"
                    accent="text-signal"
                  />
                  <SummaryRow
                    label="Average actual"
                    value={formatMW(
                      mean(
                        query.data.intervals
                          .map((interval) => interval.actual_generation)
                          .filter((value): value is number => value !== null),
                      ),
                    )}
                    unit="MW"
                    accent="text-actual"
                  />
                  <SummaryRow
                    label="Mean signed error"
                    value={formatSignedMW(query.data.metrics.mbe)}
                    unit="MW"
                  />
                  <SummaryRow
                    label="Matched hours"
                    value={`${query.data.metrics.matched_count} / ${query.data.counts.candidate_count}`}
                  />
                  <SummaryRow label="Forecast resolution" value="Hourly" />
                  <SummaryRow label="Actual resolution" value="30 minutes" />
                </dl>
                <p className="mt-4 border-t border-rule pt-3 text-[10px] leading-5 text-ink-mute">
                  Average overforecast of{" "}
                  <span className="font-mono text-ink-soft">
                    {formatDecimal(query.data.metrics.mbe)} MW
                  </span>{" "}
                  on an average actual of{" "}
                  <span className="font-mono text-ink-soft">
                    {formatMW(
                      mean(
                        query.data.intervals
                          .map((interval) => interval.actual_generation)
                          .filter((value): value is number => value !== null),
                      ),
                    )}{" "}
                    MW
                  </span>
                  . This is forecast accuracy, not a procurement recommendation.
                </p>
              </SectionCard>

              <SectionCard title="Data provenance" tourId="overview-provenance">
                <FreshnessBadge freshness={query.data.freshness} />
              </SectionCard>
            </div>
          </div>

          <CutoffExplainer
            cutoff={query.data.cutoff}
            matchingRule={query.data.matching_rule}
          />
        </div>
      ) : null}
    </>
  );
}
