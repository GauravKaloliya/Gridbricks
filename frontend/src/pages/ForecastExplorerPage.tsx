import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { DateRangeControl } from "../components/DateRangeControl";
import { useDateRange } from "../components/DateRangeContext";
import { PageHeader } from "../components/PageHeader";
import { RevisionsPanel } from "../components/RevisionsPanel";
import { SectionCard } from "../components/SectionCard";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { useAccuracy } from "../hooks/useAnalytics";
import {
  formatDateTime,
  formatMW,
  formatShortDate,
  formatSignedMW,
  formatTime,
  timezoneLabel,
} from "../lib/format";

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="kicker">{label}</dt>
      <dd className="mt-1.5 truncate font-mono text-[11px] text-ink">{value}</dd>
    </div>
  );
}

export function ForecastExplorerPage() {
  const { range } = useDateRange();
  const query = useAccuracy(range.start, range.end);
  const [searchParams, setSearchParams] = useSearchParams();

  const intervals = query.data?.intervals ?? [];
  const requested = searchParams.get("interval");
  const fallback = useMemo(
    () =>
      intervals.find((interval) => interval.status === "matched") ?? intervals[0],
    [intervals],
  );
  const selectedInterval =
    (requested
      ? intervals.find((interval) => interval.start_time === requested)
      : undefined) ?? fallback;

  function setSelected(startTime: string) {
    const params = new URLSearchParams(searchParams);
    params.set("interval", startTime);
    setSearchParams(params, { replace: true });
  }

  useEffect(() => {
    if (!requested || intervals.length === 0) return;
    if (intervals.some((interval) => interval.start_time === requested)) return;
    const params = new URLSearchParams(searchParams);
    params.delete("interval");
    setSearchParams(params, { replace: true });
  }, [requested, intervals, searchParams, setSearchParams]);

  const days = useMemo(
    () => Array.from(new Set(intervals.map((interval) => interval.start_time.slice(0, 10)))),
    [intervals],
  );
  const selectedDay = selectedInterval?.start_time.slice(0, 10) ?? days[0] ?? "";
  const dayIntervals = intervals.filter(
    (interval) => interval.start_time.slice(0, 10) === selectedDay,
  );

  function chooseDay(day: string) {
    const first = intervals.find((interval) => interval.start_time.slice(0, 10) === day);
    if (first) setSelected(first.start_time);
  }

  return (
    <>
      <PageHeader
        eyebrow="Forecast audit"
        title="Forecast explorer"
        description="Inspect the forecast that was actually available at decision time, its publication timestamp, and every other revision that arrived later."
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

      {query.data && intervals.length === 0 ? (
        <EmptyState
          title="No intervals in this range"
          description="Select a date range within January 2026."
        />
      ) : null}

      {query.data && selectedInterval ? (
        <div className="space-y-10">
          <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
            <SectionCard
              className="lg:col-span-2"
              title="Selected delivery interval"
              subtitle={`Times shown in ${timezoneLabel(selectedInterval.start_time)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="kicker">Delivery interval</p>
                  <p className="mt-2 font-serif text-[28px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-[38px]">
                    {formatDateTime(selectedInterval.start_time)}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-mute">
                    Ends {formatTime(selectedInterval.end_time)} · one-hour
                    WINDFOR interval
                  </p>
                </div>
                <StatusBadge
                  status={selectedInterval.status}
                  detail={selectedInterval.detail}
                />
              </div>

              <dl className="mt-7 grid border-y border-rule sm:grid-cols-3 sm:divide-x sm:divide-rule">
                <div className="py-4 sm:pr-5">
                  <dt className="kicker text-signal">Selected forecast</dt>
                  <dd className="mt-2 font-serif text-[30px] leading-none tracking-[-0.03em] text-signal">
                    {formatMW(selectedInterval.forecast_generation)}
                    <span className="ml-1.5 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
                      MW
                    </span>
                  </dd>
                </div>
                <div className="border-t border-rule py-4 sm:border-t-0 sm:pl-5 sm:pr-5">
                  <dt className="kicker text-actual">Actual (hourly mean)</dt>
                  <dd className="mt-2 font-serif text-[30px] leading-none tracking-[-0.03em] text-actual">
                    {formatMW(selectedInterval.actual_generation)}
                    <span className="ml-1.5 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
                      MW
                    </span>
                  </dd>
                </div>
                <div className="border-t border-rule py-4 sm:border-t-0 sm:pl-5">
                  <dt className="kicker">Signed error</dt>
                  <dd className="mt-2 font-serif text-[30px] leading-none tracking-[-0.03em] text-ink">
                    {formatSignedMW(selectedInterval.signed_error)}
                    <span className="ml-1.5 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-mute">
                      MW
                    </span>
                  </dd>
                </div>
              </dl>

              <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                <MetaItem
                  label="Forecast published"
                  value={formatDateTime(selectedInterval.selected_publish_time)}
                />
                <MetaItem
                  label="Decision cutoff"
                  value={formatDateTime(selectedInterval.decision_cutoff)}
                />
                <MetaItem
                  label="Eligible versions"
                  value={String(selectedInterval.eligible_forecast_count)}
                />
              </dl>

              <div className="mt-6 border-l-2 border-signal bg-signal-soft/50 px-4 py-3.5 text-[11px] leading-5 text-ink-soft">
                <span className="font-semibold text-ink">Why this version?</span>{" "}
                {selectedInterval.selected_publish_time ? (
                  <>
                    It was the latest forecast published at or before the cutoff
                    ({formatDateTime(selectedInterval.decision_cutoff)}). Later
                    revisions exist in the audit table below but were not
                    eligible at decision time.
                  </>
                ) : (
                  <>
                    No forecast for this interval was published on or before the
                    cutoff, so the interval is marked unavailable. No value was
                    invented.
                  </>
                )}
              </div>
              {selectedInterval.detail ? (
                <p className="mt-3 text-[10px] leading-5 text-ochre">
                  {selectedInterval.detail}
                </p>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Intervals"
              subtitle="Pick a day and hour to audit"
            >
              <label className="block">
                <span className="kicker mb-1 block">Delivery day</span>
                <select
                  className="field"
                  value={selectedDay}
                  onChange={(event) => chooseDay(event.target.value)}
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {formatShortDate(day)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {dayIntervals.map((interval) => {
                  const isSelected = interval.start_time === selectedInterval.start_time;
                  return (
                    <button
                      key={interval.start_time}
                      type="button"
                      onClick={() => setSelected(interval.start_time)}
                      aria-pressed={isSelected}
                      title={`${formatDateTime(interval.start_time)} — ${interval.status.replace(/_/g, " ")}`}
                      className={`min-h-[48px] border px-1 py-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${
                        isSelected
                          ? "border-ink bg-ink text-paper"
                          : interval.status === "matched"
                            ? "border-rule bg-paper-raised text-ink-soft hover:border-ink hover:text-ink"
                            : "border-ochre/30 bg-ochre-soft/60 text-ochre hover:border-ochre"
                      }`}
                    >
                      <span className="block font-mono text-[10px] font-medium tabular-nums">
                        {formatTime(interval.start_time)}
                      </span>
                      <span
                        className={`mt-0.5 block font-mono text-[9px] tabular-nums ${
                          isSelected ? "text-paper/65" : "text-ink-mute"
                        }`}
                      >
                        {formatMW(interval.forecast_generation)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 border-t border-rule-soft pt-2.5 text-[10px] leading-5 text-ink-mute">
                Cell numbers show the selected forecast in MW. Ochre cells mean
                no matched actual or a missing eligible forecast; open the cell
                for the exact reason.
              </p>
            </SectionCard>
          </div>

          <SectionCard
            className="lg:max-w-[1080px]"
            title="Forecast revision audit"
            subtitle="Every WINDFOR version for the selected delivery hour"
          >
            <RevisionsPanel startTime={selectedInterval.start_time} />
          </SectionCard>
        </div>
      ) : null}
    </>
  );
}
