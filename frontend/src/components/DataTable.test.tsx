import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./DataTable";
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

const unavailable: IntervalResult = {
  ...matched,
  start_time: "2026-01-01T01:00:00Z",
  end_time: "2026-01-01T02:00:00Z",
  selected_publish_time: null,
  forecast_generation: null,
  actual_generation: null,
  signed_error: null,
  absolute_error: null,
  status: "missing_forecast",
  detail: "No forecast published on or before the cutoff.",
  actual_periods_used: 0,
  eligible_forecast_count: 0,
  lead_time_hours: null,
};

describe("DataTable", () => {
  it("shows publication time, values and status for each interval", () => {
    render(<DataTable intervals={[matched, unavailable]} />);

    expect(
      screen.getByRole("columnheader", { name: "Delivery interval start" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Matched")).toBeInTheDocument();
    expect(screen.getByText("No eligible forecast")).toBeInTheDocument();
    expect(screen.getByText("+400")).toBeInTheDocument();
  });

  it("shows an em dash and the reason for unavailable rows", () => {
    render(<DataTable intervals={[unavailable]} />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(
      screen.getByText("No forecast published on or before the cutoff."),
    ).toBeInTheDocument();
  });

  it("renders an empty state when there are no intervals", () => {
    render(<DataTable intervals={[]} />);
    expect(screen.getByText("No interval rows")).toBeInTheDocument();
  });
});
