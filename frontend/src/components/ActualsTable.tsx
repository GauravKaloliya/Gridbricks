import { useEffect, useState } from "react";

import { formatCount, formatDateTime, formatMW } from "../lib/format";
import type { ActualRecord } from "../types/api";
import { EmptyState } from "./States";

const PAGE_SIZE = 50;

export function ActualsTable({ records }: { records: ActualRecord[] }) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [records]);

  if (records.length === 0) {
    return (
      <EmptyState
        title="No half-hourly actuals"
        description="Elexon FUELHH returned no WIND settlement periods for this date range."
      />
    );
  }

  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const startIndex = currentPage * PAGE_SIZE;
  const rows = records.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div>
      <div className="table-shell">
        <table className="data-table" role="table">
          <caption className="sr-only">
            Half-hourly FUELHH wind actuals with delivery start, publication
            time and settlement period
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" className="w-[34%]">
                Settlement period start
              </th>
              <th scope="col" className="w-[26%]">
                Published
              </th>
              <th scope="col" className="w-[16%] text-right">
                Settlement period
              </th>
              <th scope="col" className="w-[24%] text-right">
                Wind generation (MW)
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {rows.map((record) => (
              <tr
                key={`${record.start_time}-${record.publish_time}-${record.generation}`}
                role="row"
              >
                <td className="cell-lead whitespace-nowrap font-mono text-[14px] text-ink sm:text-[11px]">
                  {formatDateTime(record.start_time)}
                </td>
                <td
                  className="whitespace-nowrap font-mono text-[11px] text-ink-soft"
                  data-label="Published"
                >
                  {formatDateTime(record.publish_time)}
                </td>
                <td className="text-right" data-label="Settlement period">
                  <span className="inline-flex min-w-8 justify-center border border-rule bg-paper-tint/40 px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">
                    {record.settlement_period ?? "—"}
                  </span>
                </td>
                <td
                  className="text-right font-mono text-[12px] font-medium tabular-nums text-actual"
                  data-label="Wind generation (MW)"
                >
                  {formatMW(record.generation)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-rule-soft pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">
          Showing {formatCount(startIndex + 1)}–{formatCount(Math.min(startIndex + PAGE_SIZE, records.length))} of{" "}
          {formatCount(records.length)} half-hour records
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

      <p className="mt-3 border-t border-rule-soft pt-2.5 text-[10px] leading-5 text-ink-mute">
        Raw FUELHH WIND settlement periods, 30 minutes each. The accuracy
        analysis pairs each complete half-hour pair with the WINDFOR forecast for
        the containing hour; no half-hourly forecast values are invented.
      </p>
    </div>
  );
}
