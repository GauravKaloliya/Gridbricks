import { useEffect, useState } from "react";

import {
  formatDateTime,
  formatMW,
  formatSignedMW,
  formatTime,
} from "../lib/format";
import type { IntervalResult } from "../types/api";
import { StatusBadge } from "./StatusBadge";
import { EmptyState } from "./States";

const PAGE_SIZE = 25;

export function DataTable({ intervals }: { intervals: IntervalResult[] }) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [intervals]);

  if (intervals.length === 0) {
    return (
      <EmptyState
        title="No interval rows"
        description="There are no delivery intervals in the selected range."
      />
    );
  }

  const pageCount = Math.max(1, Math.ceil(intervals.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const startIndex = currentPage * PAGE_SIZE;
  const rows = intervals.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div>
      <div className="table-shell">
        <table className="data-table" role="table">
          <caption className="sr-only">
            Forecast and actual generation by delivery interval, including
            publication time, error and data status
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" className="w-[18%]">
                Delivery interval start
              </th>
              <th scope="col" className="w-[20%]">
                Forecast published
              </th>
              <th scope="col" className="w-[11%] text-right">
                Forecast (MW)
              </th>
              <th scope="col" className="w-[11%] text-right">
                Actual (MW)
              </th>
              <th scope="col" className="w-[12%] text-right">
                Signed error (MW)
              </th>
              <th scope="col" className="w-[12%] text-right">
                Absolute error (MW)
              </th>
              <th scope="col" className="w-[16%] text-right lg:text-left">
                Status
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows.map((interval) => (
              <tr key={interval.start_time} role="row">
                <td className="cell-lead whitespace-nowrap">
                  <span className="font-mono text-[14px] text-ink sm:text-[11px]">
                    {formatDateTime(interval.start_time)}
                  </span>
                  <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.04em] text-ink-mute">
                    to {formatTime(interval.end_time)}
                  </span>
                </td>
                <td className="whitespace-nowrap" data-label="Forecast published">
                  <span className="block">
                    <span className="font-mono text-[11px] text-ink-soft">
                      {interval.selected_publish_time
                        ? formatDateTime(interval.selected_publish_time)
                        : "Not available"}
                    </span>
                    <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.04em] text-ink-mute">
                      cutoff {formatDateTime(interval.decision_cutoff)}
                    </span>
                  </span>
                </td>
                <td
                  className="text-right font-mono text-[12px] tabular-nums text-ink"
                  data-label="Forecast (MW)"
                >
                  {formatMW(interval.forecast_generation)}
                </td>
                <td
                  className="text-right font-mono text-[12px] tabular-nums text-ink"
                  data-label="Actual (MW)"
                >
                  {formatMW(interval.actual_generation)}
                </td>
                <td
                  data-label="Signed error (MW)"
                  className={`text-right font-mono text-[12px] font-medium tabular-nums ${
                    interval.signed_error === null
                      ? "text-ink-mute"
                      : interval.signed_error >= 0
                        ? "text-signal"
                        : "text-actual"
                  }`}
                >
                  {formatSignedMW(interval.signed_error)}
                </td>
                <td
                  className="text-right font-mono text-[12px] tabular-nums text-ink-soft"
                  data-label="Absolute error (MW)"
                >
                  {formatMW(interval.absolute_error)}
                </td>
                <td
                  className="cell-stack whitespace-nowrap text-right lg:text-left"
                  data-label="Status"
                >
                  <StatusBadge status={interval.status} detail={interval.detail} />
                  {interval.detail ? (
                    <p className="ml-auto mt-1.5 max-w-xs text-left text-[10px] leading-4 text-ink-mute lg:ml-0">
                      {interval.detail}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-rule-soft pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">
          Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, intervals.length)} of{" "}
          {intervals.length} hourly intervals
        </p>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            className="btn-ghost flex-1 px-4 sm:flex-none"
            onClick={() => setPage((value) => Math.max(0, value - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </button>
          <span className="min-w-[86px] shrink-0 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-ink-soft">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            className="btn-ghost flex-1 px-4 sm:flex-none"
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            disabled={currentPage >= pageCount - 1}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
