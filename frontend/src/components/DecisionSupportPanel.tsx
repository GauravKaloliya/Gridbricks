import { Link, useLocation } from "react-router-dom";

import type { DecisionSupport, IntervalResult } from "../types/api";
import {
  formatCount,
  formatDateTime,
  formatMW,
  formatPercent,
  formatSignedMW,
} from "../lib/format";

function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0 sm:px-6 sm:py-5 sm:first:pl-0 sm:last:pr-0">
      <p className="kicker">{label}</p>
      <p className="display mt-2 text-[32px] leading-[0.95] tracking-[-0.035em] text-ink sm:text-[34px]">
        {value}
        {unit ? (
          <span className="ml-1.5 font-sans text-[9px] font-medium uppercase tracking-[0.12em] text-ink-mute">
            {unit}
          </span>
        ) : null}
      </p>
      <p className="prose-note mt-2 max-w-[32ch] text-[10px] leading-5 text-ink-mute">
        {hint}
      </p>
    </div>
  );
}

export function DecisionSupportPanel({
  decision,
  intervals,
}: {
  decision: DecisionSupport;
  intervals: IntervalResult[];
}) {
  const { search } = useLocation();
  const auditHref = (startTime: string) => {
    const params = new URLSearchParams(search);
    params.set("interval", startTime);
    return { pathname: "/forecasts", search: `?${params.toString()}` };
  };

  const buckets = decision.lead_time_buckets.filter(
    (bucket) => bucket.matched_count > 0,
  );
  const misses = intervals
    .filter(
      (interval) =>
        interval.status === "matched" && interval.absolute_error !== null,
    )
    .sort(
      (left, right) => (right.absolute_error ?? 0) - (left.absolute_error ?? 0),
    )
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="grid divide-y divide-rule-soft border-y border-rule-soft sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:divide-rule">
        <Stat
          label="P90 absolute error"
          value={formatMW(decision.p90_absolute_error)}
          unit="MW"
          hint={`Nine in ten matched hours missed by no more than this. P95: ${formatMW(
            decision.p95_absolute_error,
          )} MW.`}
        />
        <Stat
          label="P90 shortfall"
          value={formatMW(decision.p90_shortfall)}
          unit="MW"
          hint="Actual generation exceeded the selected forecast by at most this in nine in ten hours."
        />
        <Stat
          label="Underforecast share"
          value={
            decision.underforecast_share_pct === null
              ? "—"
              : formatPercent(decision.underforecast_share_pct)
          }
          hint="Share of matched hours where delivered wind generation beat the forecast."
        />
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="display text-[17px] leading-tight tracking-[-0.02em] text-ink">
            Accuracy by forecast lead time
          </h3>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">
            Delivery start − publication time
          </p>
        </div>

        {buckets.length > 0 ? (
          <div className="table-shell mt-3">
            <table className="data-table" role="table">
              <caption className="sr-only">
                Mean absolute error and mean bias by forecast lead-time bucket
              </caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" className="w-[34%]">
                    Lead time
                  </th>
                  <th scope="col" className="w-[22%] text-right">
                    Matched hours
                  </th>
                  <th scope="col" className="w-[22%] text-right">
                    MAE (MW)
                  </th>
                  <th scope="col" className="w-[22%] text-right">
                    Mean bias (MW)
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {buckets.map((bucket) => (
                  <tr key={bucket.label} role="row">
                    <td className="cell-lead whitespace-nowrap font-mono text-[14px] text-ink sm:text-[11px]">
                      {bucket.label}
                    </td>
                    <td
                      className="text-right font-mono text-[12px] tabular-nums text-ink-soft"
                      data-label="Matched hours"
                    >
                      {formatCount(bucket.matched_count)}
                    </td>
                    <td
                      className="text-right font-mono text-[12px] tabular-nums text-ink"
                      data-label="MAE (MW)"
                    >
                      {formatMW(bucket.mae)}
                    </td>
                    <td
                      className="text-right font-mono text-[12px] tabular-nums text-ink-soft"
                      data-label="Mean bias (MW)"
                    >
                      {formatSignedMW(bucket.mean_signed_error)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-[11px] leading-5 text-ink-mute">
            No matched hours are available by lead time in this range.
          </p>
        )}

        <p className="mt-3 border-t border-rule-soft pt-2.5 text-[10px] leading-5 text-ink-mute">
          Lead time is the time between forecast publication and delivery
          start. Negative bias means actual generation was above the forecast
          on average. Bucket MAE uses the same matched hours as the headline
          metrics.
        </p>
      </div>

      {misses.length > 0 ? (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="display text-[17px] leading-tight tracking-[-0.02em] text-ink">
              Largest misses
            </h3>
            <p className="text-right font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">
              Top {misses.length}
              <span className="hidden sm:inline"> · select to audit</span>
            </p>
          </div>
          <ol className="mt-3 border-t border-rule-soft">
            {misses.map((interval, index) => (
              <li key={interval.start_time} className="border-b border-rule-soft">
                <Link
                  to={auditHref(interval.start_time)}
                  className="group grid grid-cols-[1.75rem_minmax(0,1fr)_auto_auto] items-baseline gap-x-3 py-2.5 transition-colors hover:bg-paper-tint/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                >
                  <span
                    aria-hidden="true"
                    className="font-mono text-[9px] leading-none text-ink-mute"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] text-ink">
                      {formatDateTime(interval.start_time)}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-4 text-ink-mute">
                      Forecast {formatMW(interval.forecast_generation)} MW ·
                      actual {formatMW(interval.actual_generation)} MW
                    </span>
                  </span>
                  <span
                    className={`text-right font-mono text-[12px] font-medium tabular-nums ${
                      interval.signed_error !== null && interval.signed_error >= 0
                        ? "text-signal"
                        : "text-actual"
                    }`}
                  >
                    {formatSignedMW(interval.signed_error)} MW
                  </span>
                  <span
                    aria-hidden="true"
                    className="self-center text-ink-mute transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-2.5 text-[10px] leading-5 text-ink-mute">
            Select a row to open the eligible forecast and its later revisions
            in the forecast explorer.
          </p>
        </div>
      ) : null}

      <p className="border-t border-rule-soft pt-2.5 text-[10px] leading-5 text-ink-mute">
        {decision.method}
      </p>
    </div>
  );
}
