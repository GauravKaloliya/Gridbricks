import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatAxisDateTime,
  formatDateTime,
  formatMW,
  formatSignedMW,
} from "../lib/format";
import type { IntervalResult } from "../types/api";
import { DateAxisTick } from "./DateAxisTick";
import { EmptyState } from "./States";

interface ErrorPoint {
  start: string;
  signed_error: number;
}

const AXIS_TICK = {
  fontFamily: "IBM Plex Mono, ui-monospace, monospace",
  fontSize: 9,
  fill: "#6b665a",
};

function ErrorTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ErrorPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const isOver = point.signed_error > 0;
  return (
    <div className="min-w-[190px] max-w-[250px] border border-ink bg-paper-raised p-3 text-[11px] sm:min-w-[220px] sm:p-3.5">
      <p className="font-serif text-[16px] leading-tight tracking-[-0.01em] text-ink">
        {formatDateTime(point.start)}
      </p>
      <p className="mt-2 flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-ink-soft">
          <span
            aria-hidden="true"
            className={`h-2 w-2 ${isOver ? "bg-signal" : "bg-actual"}`}
          />
          {isOver ? "Overforecast" : "Underforecast"}
        </span>
        <span className="font-mono tabular-nums font-medium text-ink">
          {formatSignedMW(point.signed_error)} MW
        </span>
      </p>
    </div>
  );
}

export function ErrorChart({ intervals }: { intervals: IntervalResult[] }) {
  const data: ErrorPoint[] = intervals
    .filter(
      (interval) =>
        interval.status === "matched" && interval.signed_error !== null,
    )
    .map((interval) => ({
      start: interval.start_time,
      signed_error: interval.signed_error as number,
    }));

  if (data.length === 0) {
    return (
      <EmptyState
        title="No matched intervals"
        description="Signed error can only be charted when an eligible forecast and both half-hourly actuals exist."
      />
    );
  }

  return (
    <div className="figure">
      <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-rule-soft pb-2.5">
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
          <span aria-hidden="true" className="h-2 w-2 bg-signal" />
          Overforecast (above zero)
        </span>
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
          <span aria-hidden="true" className="h-2 w-2 bg-actual" />
          Underforecast (below zero)
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute">
          MW
        </span>
      </div>

      <div
        role="img"
        className="h-[260px] w-full sm:h-[300px]"
        aria-label="Signed forecast error chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 28, bottom: 4, left: 0 }}>
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
              width={54}
              tickMargin={6}
            />
            <Tooltip
              content={<ErrorTooltip />}
              cursor={{ fill: "rgba(23,21,15,0.05)" }}
              isAnimationActive={false}
            />
            <ReferenceLine y={0} stroke="rgba(23,21,15,0.55)" strokeWidth={1} />
            <Bar dataKey="signed_error" name="Signed error" isAnimationActive={false} maxBarSize={14}>
              {data.map((point) => (
                <Cell
                  key={point.start}
                  fill={point.signed_error >= 0 ? "#c6431e" : "#1b5e57"}
                  fillOpacity={0.82}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="figure-caption mt-3 border-t border-rule-soft pt-2.5">
        Signed error = forecast − actual. Vermilion bars above zero indicate
        overforecasting; teal bars below zero indicate underforecasting. Only
        matched, valid intervals are shown.
      </p>
    </div>
  );
}
