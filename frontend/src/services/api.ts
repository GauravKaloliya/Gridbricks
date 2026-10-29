import type {
  AccuracyResponse,
  ActualsResponse,
  ApiErrorPayload,
  MetaResponse,
  RevisionsResponse,
} from "../types/api";

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();
// Production deployments serve the API from the same origin; local Vite runs
// keep talking to the standalone backend.
const DEFAULT_BASE_URL = import.meta.env.DEV ? "http://localhost:8000" : "";
export const API_BASE_URL = (RAW_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export function buildApiUrl(
  base: string,
  path: string,
  params?: Record<string, string>,
): string {
  const trimmed = base.replace(/\/$/, "");
  const isAbsolute = /^https?:\/\//i.test(trimmed);
  const isSameOrigin = trimmed === "" || trimmed.startsWith("/");
  if (!isAbsolute && !isSameOrigin) {
    throw new ApiError(
      `The analytics API base URL is invalid: "${base}". Set VITE_API_BASE_URL to an absolute http(s) URL or leave it unset for same-origin requests.`,
      "CONFIG_ERROR",
      0,
    );
  }
  let url: URL;
  try {
    const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
    url = new URL(`${trimmed}${path}`, origin);
  } catch {
    throw new ApiError(
      `The analytics API base URL could not be parsed: "${base}".`,
      "CONFIG_ERROR",
      0,
    );
  }
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function apiGet<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = buildApiUrl(API_BASE_URL, path, params);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "The API request timed out."
        : `Could not reach the analytics API at ${API_BASE_URL || "the same origin"}.`;
    throw new ApiError(message, "NETWORK_ERROR", 0);
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = null;
    }
    const requestId =
      payload?.error?.request_id ??
      response.headers?.get?.("x-request-id") ??
      null;
    const message =
      payload?.error?.message ?? `The API returned HTTP ${response.status}.`;
    throw new ApiError(
      requestId ? `${message} Reference: ${requestId}.` : message,
      payload?.error?.code ?? "API_ERROR",
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function fetchAccuracy(
  startDate: string,
  endDate: string,
): Promise<AccuracyResponse> {
  return apiGet<AccuracyResponse>("/api/accuracy", {
    start_date: startDate,
    end_date: endDate,
  });
}

export function fetchMeta(): Promise<MetaResponse> {
  return apiGet<MetaResponse>("/api/meta");
}

export function fetchActuals(
  startDate: string,
  endDate: string,
): Promise<ActualsResponse> {
  return apiGet<ActualsResponse>("/api/actuals", {
    start_date: startDate,
    end_date: endDate,
  });
}

export function fetchRevisions(startTime: string): Promise<RevisionsResponse> {
  return apiGet<RevisionsResponse>("/api/forecast-revisions", {
    start_time: startTime,
  });
}
