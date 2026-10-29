import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatAxisDateTime,
  formatDateTime,
  formatMW,
  timezoneLabel,
} from "../lib/format";
import type { IntervalResult } from "../types/api";
import { DateAxisTick } from "./DateAxisTick";
import { EmptyState } from "./States";

interface ChartPoint {
  start: string;
  forecast: number | null;
  actual: number | null;
  status: IntervalResult["status"];
}

const AXIS_TICK = {
  fontFamily: "IBM Plex Mono, ui-monospace, monospace",
  fontSize: 9,
  fill: "#6b665a",
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="min-w-[205px] max-w-[260px] border border-ink bg-paper-raised p-3 text-[11px] sm:min-w-[240px] sm:p-3.5">
      <p className="font-serif text-[16px] leading-tight tracking-[-0.01em] text-ink">
        {formatDateTime(point.start)}
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute">
        Delivery hour start · {timezoneLabel(point.start)}
      </p>
      <dl className="mt-3 space-y-1.5 border-t border-rule pt-2.5">
        <div className="flex items-center justify-between gap-6">
          <dt className="flex items-center gap-2 text-ink-soft">
            <span aria-hidden="true" className="h-[2px] w-4 bg-signal" />
            Selected forecast
          </dt>
          <dd className="font-mono tabular-nums text-ink">{formatMW(point.forecast)} MW</dd>
        </div>
        <div className="flex items-center justify-between gap-6">
          <dt className="flex items-center gap-2 text-ink-soft">
            <span aria-hidden="true" className="h-[2px] w-4 bg-actual" />
            Actual (hourly mean)
          </dt>
          <dd className="font-mono tabular-nums text-ink">{formatMW(point.actual)} MW</dd>
        </div>
        <div className="flex items-center justify-between gap-6 border-t border-rule-soft pt-1.5">
          <dt className="text-ink-mute">Status</dt>
          <dd className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-soft">
            {point.status.replace(/_/g, " ")}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function ForecastActualChart({ intervals }: { intervals: IntervalResult[] }) {
  const data: ChartPoint[] = intervals.map((interval) => ({
    start: interval.start_time,
    forecast: interval.forecast_generation,
    actual: interval.actual_generation,
    status: interval.status,
  }));

  if (data.length === 0) {
    return (
      <EmptyState
        title="No intervals in this range"
        description="Choose a delivery date range within January 2026 to see the forecast and actual series."
      />
    );
  }

  return (
    <div className="figure">
      <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule-soft pb-2.5">
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
          <span aria-hidden="true" className="h-[2px] w-6 bg-actual" />
          Actual · hourly mean
        </span>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
          <span aria-hidden="true" className="w-6 border-t-[1.5px] border-dashed border-signal" />
          Selected eligible forecast
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute">
          MW
        </span>
      </div>

      <div
        role="img"
        className="h-[280px] w-full sm:h-[340px]"
        aria-label="Forecast versus actual wind generation chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 14, right: 28, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="actualArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1b5e57" stopOpacity={0.16} />
                <stop offset="70%" stopColor="#1b5e57" stopOpacity={0.04} />
                <stop offset="100%" stopColor="#1b5e57" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(23,21,15,0.14)"
              strokeDasharray="1 4"
              vertical={false}
            />
            <XAxis
              dataKey="start"
              tickFormatter={formatAxisDateTime}
              minTickGap={56}
              tick={<DateAxisTick />}
              axisLine={{ stroke: "rgba(23,21,15,0.25)" }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              tickFormatter={(value: number) => formatMW(value)}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={52}
              tickMargin={6}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "rgba(23,21,15,0.3)", strokeDasharray: "3 3" }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="none"
              fill="url(#actualArea)"
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#1b5e57"
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 3, fill: "#fbf9f3", stroke: "#1b5e57", strokeWidth: 1.5 }}
              connectNulls={false}
              isAnimationActive={false}
              name="actual"
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#c6431e"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3, fill: "#fbf9f3", stroke: "#c6431e", strokeWidth: 1.5 }}
              connectNulls={false}
              isAnimationActive={false}
              name="forecast"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="figure-caption mt-3 border-t border-rule-soft pt-2.5">
        Solid line: actual wind generation, calculated as the mean of the two
        half-hourly FUELHH settlement periods in each hour. Dashed line: latest
        forecast published on or before the decision cutoff. Missing values are
        left as gaps, never filled with zero.
      </p>
    </div>
  );
}
