import { downloadCsv, intervalsToCsv } from "../lib/csv";
import type { IntervalResult } from "../types/api";

export function CsvExportButton({
  intervals,
  start,
  end,
}: {
  intervals: IntervalResult[];
  start: string;
  end: string;
}) {
  return (
    <button
      type="button"
      className="btn-ghost shrink-0"
      disabled={intervals.length === 0}
      onClick={() =>
        downloadCsv(
          `gridbricks-intervals-${start}_${end}.csv`,
          intervalsToCsv(intervals),
        )
      }
    >
      Export CSV
    </button>
  );
}
