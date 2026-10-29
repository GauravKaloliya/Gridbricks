import type { IntervalResult } from "../types/api";

const HEADERS = [
  "Delivery interval start",
  "Delivery interval end",
  "Forecast published",
  "Decision cutoff",
  "Lead time (h)",
  "Forecast (MW)",
  "Actual (MW)",
  "Signed error (MW)",
  "Absolute error (MW)",
  "Status",
  "Detail",
] as const;

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function intervalsToCsv(intervals: IntervalResult[]): string {
  const rows = intervals.map((interval) => [
    interval.start_time,
    interval.end_time,
    interval.selected_publish_time,
    interval.decision_cutoff,
    interval.lead_time_hours,
    interval.forecast_generation,
    interval.actual_generation,
    interval.signed_error,
    interval.absolute_error,
    interval.status,
    interval.detail,
  ]);
  return [HEADERS, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`\ufeff${content}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
