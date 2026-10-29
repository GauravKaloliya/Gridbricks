export const ANALYSIS_START = "2026-01-01";
export const ANALYSIS_END = "2026-01-31";
export const DEFAULT_START = "2026-01-01";
export const DEFAULT_END = "2026-01-07";
export const DISPLAY_TIMEZONE = "Europe/London";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  day: "numeric",
  month: "short",
});

const longDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const axisDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: DISPLAY_TIMEZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const numberFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 1,
});

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return dateTimeFormatter.format(new Date(value));
}

export function formatTime(value: string): string {
  return timeFormatter.format(new Date(value));
}

export function formatAxisDateTime(value: string): string {
  return axisDateTimeFormatter.format(new Date(value));
}

export function formatShortDate(value: string): string {
  return shortDateFormatter.format(new Date(`${value}T12:00:00Z`));
}

export function formatLongDate(value: string): string {
  return longDateFormatter.format(new Date(`${value}T12:00:00Z`));
}

export function formatMW(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return numberFormatter.format(Math.round(value));
}

export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

export function formatDecimal(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return decimalFormatter.format(value);
}

export function formatSignedMW(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${numberFormatter.format(rounded)}`;
}

export function formatPercent(value: number): string {
  return `${decimalFormatter.format(value)}%`;
}

export function timezoneLabel(reference?: string): string {
  const date = reference ? new Date(reference) : new Date("2026-01-15T12:00:00Z");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DISPLAY_TIMEZONE,
    timeZoneName: "short",
  }).formatToParts(date);
  const zone = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  return `${DISPLAY_TIMEZONE} (${zone})`;
}

export function parseIso(value: string): Date {
  return new Date(value);
}

export function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function datesInRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const limit = new Date(`${end}T00:00:00Z`);
  while (cursor <= limit) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
