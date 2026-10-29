import { describe, expect, it } from "vitest";

import { intervalsToCsv } from "./csv";
import type { IntervalResult } from "../types/api";

const matched: IntervalResult = {
  start_time: "2026-01-01T00:00:00Z",
  end_time: "2026-01-01T01:00:00Z",
  decision_cutoff: "2025-12-31T09:30:00Z",
  selected_publish_time: "2025-12-31T09:30:00Z",
  forecast_generation: 7200,
  actual_generation: 6800,
  signed_error: 400,
  absolute_error: 400,
  status: "matched",
  detail: null,
  actual_periods_used: 2,
  eligible_forecast_count: 8,
  lead_time_hours: 14.5,
};

const missing: IntervalResult = {
  ...matched,
  start_time: "2026-01-01T01:00:00Z",
  end_time: "2026-01-01T02:00:00Z",
  selected_publish_time: null,
  forecast_generation: null,
  actual_generation: null,
  signed_error: null,
  absolute_error: null,
  status: "missing_forecast",
  detail: "No forecast published, conflicting duplicates.",
  actual_periods_used: 0,
  eligible_forecast_count: 0,
  lead_time_hours: null,
};

describe("intervalsToCsv", () => {
  it("writes a header and one row per interval", () => {
    const csv = intervalsToCsv([matched]);
    const [header, row] = csv.split("\r\n");
    expect(header).toBe(
      "Delivery interval start,Delivery interval end,Forecast published,Decision cutoff,Lead time (h),Forecast (MW),Actual (MW),Signed error (MW),Absolute error (MW),Status,Detail",
    );
    expect(row).toBe(
      "2026-01-01T00:00:00Z,2026-01-01T01:00:00Z,2025-12-31T09:30:00Z,2025-12-31T09:30:00Z,14.5,7200,6800,400,400,matched,",
    );
  });

  it("quotes detail text containing commas", () => {
    const csv = intervalsToCsv([missing]);
    expect(csv).toContain(
      '"No forecast published, conflicting duplicates."',
    );
  });

  it("leaves unavailable values empty rather than zero", () => {
    const csv = intervalsToCsv([missing]);
    const row = csv.split("\r\n")[1];
    expect(row).toBe(
      '2026-01-01T01:00:00Z,2026-01-01T02:00:00Z,,2025-12-31T09:30:00Z,,,,,,missing_forecast,"No forecast published, conflicting duplicates."',
    );
  });

  it("keeps row order unchanged", () => {
    const csv = intervalsToCsv([matched, missing]);
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain("2026-01-01T00:00:00Z");
    expect(rows[2]).toContain("2026-01-01T01:00:00Z");
  });
});
