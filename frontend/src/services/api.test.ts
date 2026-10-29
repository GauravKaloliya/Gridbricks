import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  buildApiUrl,
  fetchAccuracy,
  fetchActuals,
  fetchMeta,
  fetchRevisions,
} from "./api";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api service", () => {
  it("calls the accuracy endpoint with date parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ metrics: {} }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchAccuracy("2026-01-01", "2026-01-07");

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/accuracy");
    expect(url.searchParams.get("start_date")).toBe("2026-01-01");
    expect(url.searchParams.get("end_date")).toBe("2026-01-07");
  });

  it("passes the interval to the revisions endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ revisions: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchRevisions("2026-01-01T00:00:00Z");

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/forecast-revisions");
    expect(url.searchParams.get("start_time")).toBe("2026-01-01T00:00:00Z");
  });

  it("calls the actuals endpoint with date parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ records: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchActuals("2026-01-01", "2026-01-02");

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/actuals");
    expect(url.searchParams.get("start_date")).toBe("2026-01-01");
    expect(url.searchParams.get("end_date")).toBe("2026-01-02");
  });

  it("resolves an unset base URL against the current origin", () => {
    expect(buildApiUrl("", "/api/meta")).toBe(
      `${window.location.origin}/api/meta`,
    );
    expect(buildApiUrl("/", "/api/meta", { start_date: "2026-01-01" })).toBe(
      `${window.location.origin}/api/meta?start_date=2026-01-01`,
    );
  });

  it("rejects a scheme-less API base URL with a clear error", () => {
    expect(() => buildApiUrl("localhost:8000", "/api/meta")).toThrowError(
      ApiError,
    );
    try {
      buildApiUrl("localhost:8000", "/api/meta");
    } catch (error) {
      expect(error).toMatchObject({
        code: "CONFIG_ERROR",
        status: 0,
      });
      expect((error as Error).message).toContain("VITE_API_BASE_URL");
    }
  });

  it("normalises a trailing slash in the API base URL", () => {
    expect(buildApiUrl("https://api.example.test/", "/api/meta")).toBe(
      "https://api.example.test/api/meta",
    );
  });

  it("requests service metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ app_name: "x" }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchMeta();

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/meta");
  });

  it("surfaces structured API errors without hiding the status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "INVALID_RANGE",
              message: "start_date must be before or equal to end_date",
            },
          },
          400,
        ),
      ),
    );

    await expect(fetchAccuracy("2026-01-07", "2026-01-01")).rejects.toMatchObject({
      name: "ApiError",
      code: "INVALID_RANGE",
      status: 400,
      message: "start_date must be before or equal to end_date",
    });
  });

  it("appends the server request id to structured errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        headers: new Headers({ "x-request-id": "trace-123" }),
        json: async () => ({
          error: {
            code: "DATA_UNAVAILABLE",
            message: "The stored snapshot could not be read",
          },
        }),
      } as Response),
    );

    await expect(fetchAccuracy("2026-01-01", "2026-01-01")).rejects.toMatchObject({
      code: "DATA_UNAVAILABLE",
      status: 503,
      message:
        "The stored snapshot could not be read Reference: trace-123.",
    });
  });

  it("reports network failures as an ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await expect(fetchMeta()).rejects.toBeInstanceOf(ApiError);
    await expect(fetchMeta()).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: "Could not reach the analytics API at http://localhost:8000.",
    });
  });
});
