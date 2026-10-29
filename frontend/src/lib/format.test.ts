import { describe, expect, it } from "vitest";

import {
  addDays,
  datesInRange,
  formatAxisDateTime,
  formatDateTime,
  formatMW,
  formatPercent,
  formatShortDate,
  formatSignedMW,
} from "./format";

describe("format helpers", () => {
  it("renders timestamps in Europe/London with DST applied", () => {
    expect(formatDateTime("2026-01-01T00:00:00Z")).toContain("01 Jan 2026");
    expect(formatDateTime("2026-01-01T00:00:00Z")).toContain("00:00");
    expect(formatDateTime("2026-07-01T11:00:00Z")).toContain("12:00");
  });

  it("labels chart axes with both the delivery date and time", () => {
    const label = formatAxisDateTime("2026-01-05T13:00:00Z");
    expect(label).toContain("5 Jan");
    expect(label).toContain("13:00");
  });

  it("shows an em dash for unavailable values instead of zero", () => {
    expect(formatMW(null)).toBe("—");
    expect(formatSignedMW(null)).toBe("—");
    expect(formatDateTime(null)).toBe("—");
  });

  it("rounds MW values with thousands separators", () => {
    expect(formatMW(1234.6)).toBe("1,235");
    expect(formatSignedMW(12.4)).toBe("+12");
    expect(formatSignedMW(-5.6)).toBe("-6");
    expect(formatSignedMW(0)).toBe("0");
  });

  it("formats percentage coverage to one decimal place", () => {
    expect(formatPercent(97.25)).toBe("97.3%");
    expect(formatPercent(100)).toBe("100%");
  });

  it("formats short delivery dates", () => {
    expect(formatShortDate("2026-01-05")).toBe("5 Jan");
  });

  it("adds days and enumerates ranges", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(datesInRange("2026-01-01", "2026-01-03")).toEqual([
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
    ]);
  });
});
