import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActualsTable } from "./ActualsTable";
import type { ActualRecord } from "../types/api";

const records: ActualRecord[] = [
  {
    start_time: "2026-01-01T00:00:00Z",
    publish_time: "2026-01-01T00:30:00Z",
    generation: 1234,
    fuel_type: "WIND",
    settlement_date: "2026-01-01",
    settlement_period: 1,
    source: "Elexon FUELHH",
  },
  {
    start_time: "2026-01-01T00:30:00Z",
    publish_time: "2026-01-01T01:00:00Z",
    generation: 1500,
    fuel_type: "WIND",
    settlement_date: "2026-01-01",
    settlement_period: 2,
    source: "Elexon FUELHH",
  },
];

describe("ActualsTable", () => {
  it("shows half-hourly delivery, publication and generation", () => {
    render(<ActualsTable records={records} />);

    expect(
      screen.getByRole("columnheader", { name: "Settlement period start" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Published" })).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("Showing 1–2 of 2 half-hour records")).toBeInTheDocument();
  });

  it("renders an empty state when Elexon returned no actuals", () => {
    render(<ActualsTable records={[]} />);
    expect(screen.getByText("No half-hourly actuals")).toBeInTheDocument();
  });
});
