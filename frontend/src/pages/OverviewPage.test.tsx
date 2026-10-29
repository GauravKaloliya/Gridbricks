import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DateRangeProvider } from "../components/DateRangeContext";
import { ThemeProvider } from "../components/ThemeContext";
import { useAccuracy } from "../hooks/useAnalytics";
import { OverviewPage } from "./OverviewPage";
import type { AccuracyResponse, IntervalResult } from "../types/api";

vi.mock("../hooks/useAnalytics", () => ({
  useAccuracy: vi.fn(),
  useMeta: vi.fn(),
  useRevisions: vi.fn(),
}));

const matchedInterval: IntervalResult = {
  start_time: "2026-01-01T00:00:00Z",
  end_time: "2026-01-01T01:00:00Z",
  decision_cutoff: "2025-12-31T09:30:00Z",
  selected_publish_time: "2025-12-31T09:30:00Z",
  forecast_generation: 7200,
  actual_generation: 6800,
  signed_error: -400,
  absolute_error: 400,
  status: "matched",
  detail: null,
  actual_periods_used: 2,
  eligible_forecast_count: 8,
  lead_time_hours: 14.5,
};

const missingInterval: IntervalResult = {
  ...matchedInterval,
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
};

const payload: AccuracyResponse = {
  start_date: "2026-01-01",
  end_date: "2026-01-02",
  timezone: "Europe/London",
  unit: "MW",
  forecast_resolution_minutes: 60,
  actual_resolution_minutes: 30,
  matching_rule:
    "Each hourly WINDFOR forecast is paired with the mean of its two half-hourly FUELHH actuals.",
  cutoff: {
    local_time: "09:30",
    timezone: "Europe/London",
    inclusive: true,
    rule: "Latest forecast published at or before the cutoff.",
    assumption: "The cutoff is an explicit pilot assumption, not a client-specified time.",
  },
  counts: {
    candidate_count: 2,
    matched_count: 1,
    missing_forecast_count: 1,
    missing_actual_count: 0,
    invalid_record_count: 0,
    coverage_pct: 50,
  },
  metrics: {
    status: "ok",
    mae: 123.4,
    rmse: 156.7,
    mbe: -45.2,
    matched_count: 1,
    unit: "MW",
    sign_convention: "Signed error = forecast − actual.",
  },
  intervals: [matchedInterval, missingInterval],
  freshness: {
    retrieved_at: "2026-02-01T10:00:00Z",
    data_state: "snapshot",
    source: "Elexon BMRS",
    cache_age_seconds: null,
    is_fallback: false,
    note: null,
    warnings: [],
  },
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={["/?start=2026-01-01&end=2026-01-02"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <ThemeProvider>
          <DateRangeProvider>
            <OverviewPage />
          </DateRangeProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mockQuery(overrides: Record<string, unknown>) {
  vi.mocked(useAccuracy).mockReturnValue(
    {
      isPending: false,
      isError: false,
      isSuccess: true,
      error: null,
      data: payload,
      refetch: vi.fn(),
      ...overrides,
    } as unknown as ReturnType<typeof useAccuracy>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OverviewPage", () => {
  it("shows a loading state while the analysis is pending", () => {
    mockQuery({ isPending: true, isSuccess: false, data: undefined });
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading analysis");
  });

  it("renders backend metrics, coverage and partial-data messaging", () => {
    mockQuery({});
    renderPage();

    expect(
      screen.getByRole("heading", {
        name: "January 2026 wind forecast performance",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
    expect(screen.getByText("157")).toBeInTheDocument();
    expect(screen.getAllByText("-45").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/Partial data/)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Selected forecast versus actual" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Stored Elexon snapshot")).toBeInTheDocument();
  });

  it("shows an error state with retry instead of substituting values", async () => {
    const refetch = vi.fn();
    mockQuery({
      isError: true,
      isSuccess: false,
      error: new Error("Analytics API unavailable"),
      data: undefined,
      refetch,
    });
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load the analysis",
    );
    expect(screen.getByText("Analytics API unavailable")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry request" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
