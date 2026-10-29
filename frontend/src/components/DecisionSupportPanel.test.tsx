import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { DecisionSupportPanel } from "./DecisionSupportPanel";
import type { DecisionSupport, IntervalResult } from "../types/api";

function interval(
  start: string,
  forecast: number,
  actual: number,
): IntervalResult {
  return {
    start_time: start,
    end_time: start,
    decision_cutoff: "2025-12-31T09:30:00Z",
    selected_publish_time: "2025-12-31T09:30:00Z",
    forecast_generation: forecast,
    actual_generation: actual,
    signed_error: forecast - actual,
    absolute_error: Math.abs(forecast - actual),
    status: "matched",
    detail: null,
    actual_periods_used: 2,
    eligible_forecast_count: 1,
    lead_time_hours: 14.5,
  };
}

const decision: DecisionSupport = {
  p90_absolute_error: 310,
  p95_absolute_error: 355,
  p90_shortfall: 55,
  underforecast_share_pct: 20,
  lead_time_buckets: [
    {
      label: "Under 18 h",
      lower_hours: null,
      upper_hours: 18,
      matched_count: 2,
      mae: 75,
      mean_signed_error: -75,
    },
    {
      label: "18–24 h",
      lower_hours: 18,
      upper_hours: 24,
      matched_count: 2,
      mae: 25,
      mean_signed_error: 25,
    },
  ],
  method: "Percentiles use linear interpolation between order statistics.",
};

describe("DecisionSupportPanel", () => {
  it("renders reserve percentiles and the lead-time table", () => {
    render(
      <MemoryRouter initialEntries={["/accuracy?start=2026-01-01&end=2026-01-07"]}>
        <DecisionSupportPanel
          decision={decision}
          intervals={[interval("2026-01-01T00:00:00Z", 1400, 1000)]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("P90 absolute error")).toBeInTheDocument();
    expect(screen.getByText("310")).toBeInTheDocument();
    expect(screen.getByText(/P95: 355 MW/)).toBeInTheDocument();
    expect(screen.getByText("P90 shortfall")).toBeInTheDocument();
    expect(screen.getByText("55")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();

    expect(screen.getByText("Under 18 h")).toBeInTheDocument();
    expect(screen.getByText("18–24 h")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Mean bias (MW)" }),
    ).toBeInTheDocument();
  });

  it("orders the largest misses by absolute error", () => {
    render(
      <MemoryRouter initialEntries={["/accuracy?start=2026-01-01&end=2026-01-07"]}>
        <DecisionSupportPanel
          decision={decision}
          intervals={[
            interval("2026-01-01T00:00:00Z", 1400, 1000),
            interval("2026-01-01T01:00:00Z", 1150, 1000),
            interval("2026-01-01T02:00:00Z", 1050, 1000),
          ]}
        />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", {
      name: "Largest misses",
      level: 3,
    });
    expect(heading).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("+400 MW");
    expect(items[1]).toHaveTextContent("+150 MW");
    expect(items[2]).toHaveTextContent("+50 MW");

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute("href")).toContain(
      "/forecasts?start=2026-01-01&end=2026-01-07&interval=2026-01-01T00",
    );
  });

  it("shows an explicit empty bucket state", () => {
    render(
      <MemoryRouter>
        <DecisionSupportPanel
          decision={{
            ...decision,
            p90_absolute_error: null,
            p95_absolute_error: null,
            p90_shortfall: null,
            underforecast_share_pct: null,
            lead_time_buckets: [],
          }}
          intervals={[]}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "No matched hours are available by lead time in this range.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Largest misses" }),
    ).not.toBeInTheDocument();
  });
});
