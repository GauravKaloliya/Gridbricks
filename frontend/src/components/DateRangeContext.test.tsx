import { describe, expect, it } from "vitest";

import { normaliseRange } from "./DateRangeContext";

describe("normaliseRange", () => {
  it("keeps a valid range", () => {
    expect(normaliseRange("2026-01-05", "2026-01-09")).toEqual({
      start: "2026-01-05",
      end: "2026-01-09",
    });
  });

  it("collapses an inverted range to a single day", () => {
    expect(normaliseRange("2026-01-10", "2026-01-05")).toEqual({
      start: "2026-01-10",
      end: "2026-01-10",
    });
  });

  it("replaces out-of-scope dates with the default start", () => {
    expect(normaliseRange("2025-12-01", "2026-01-04")).toEqual({
      start: "2026-01-01",
      end: "2026-01-04",
    });
  });

  it("clamps the end date to 30 days and to the analysis period", () => {
    expect(normaliseRange("2026-01-01", "2026-03-01").end).toBe("2026-01-31");
    expect(normaliseRange("2026-01-20", "2026-02-20").end).toBe("2026-01-31");
  });
});
