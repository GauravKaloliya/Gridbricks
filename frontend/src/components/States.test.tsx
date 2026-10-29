import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  EmptyState,
  ErrorState,
  FreshnessBadge,
  LoadingState,
  PartialDataBanner,
} from "./States";
import type { AnalysisCounts, DataFreshness } from "../types/api";

const noGaps: AnalysisCounts = {
  candidate_count: 24,
  matched_count: 24,
  missing_forecast_count: 0,
  missing_actual_count: 0,
  invalid_record_count: 0,
  coverage_pct: 100,
};

const freshness: DataFreshness = {
  retrieved_at: "2026-02-01T10:00:00Z",
  data_state: "snapshot_fallback",
  source: "Elexon BMRS",
  cache_age_seconds: 3600,
  is_fallback: true,
  note: "Live fetch failed; using a stored real-data snapshot.",
  warnings: ["Upstream timeout after retries."],
};

describe("state components", () => {
  it("announces loading status to assistive technology", () => {
    render(<LoadingState label="Loading test analysis" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Loading test analysis")).toBeInTheDocument();
  });

  it("shows an error with a working retry action", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Analytics API unavailable" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load the analysis",
    );
    expect(screen.getByText("Analytics API unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/No values have been substituted/),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Retry request" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders an actionable empty state", () => {
    render(
      <EmptyState
        title="No matched intervals to score"
        description="Widen the date range."
      />,
    );
    expect(screen.getByText("No matched intervals to score")).toBeInTheDocument();
    expect(screen.getByText("Widen the date range.")).toBeInTheDocument();
  });

  it("hides the partial-data banner when every interval is usable", () => {
    const { container } = render(<PartialDataBanner counts={noGaps} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("describes coverage gaps without treating them as zero", () => {
    render(
      <PartialDataBanner
        counts={{
          ...noGaps,
          matched_count: 20,
          missing_forecast_count: 2,
          missing_actual_count: 1,
          invalid_record_count: 1,
          coverage_pct: 83.3,
        }}
      />,
    );
    const banner = screen.getByText(/Partial data/);
    expect(banner.parentElement).toHaveTextContent("83.3% coverage");
    expect(banner.parentElement).toHaveTextContent(
      "Missing values are excluded from metrics, not treated as zero.",
    );
  });

  it("labels fallback provenance and lists warnings", () => {
    render(<FreshnessBadge freshness={freshness} />);
    expect(screen.getByText("Snapshot fallback")).toBeInTheDocument();
    expect(
      screen.getByText("Live fetch failed; using a stored real-data snapshot."),
    ).toBeInTheDocument();
    expect(screen.getByText("Upstream timeout after retries.")).toBeInTheDocument();
  });
});
