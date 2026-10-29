import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";

import {
  ANALYSIS_END,
  ANALYSIS_START,
  DEFAULT_END,
  DEFAULT_START,
  addDays,
} from "../lib/format";

export interface DateRange {
  start: string;
  end: string;
}

interface DateRangeContextValue {
  range: DateRange;
  setRange: (range: DateRange) => void;
  reset: () => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

function isIsoDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function normaliseRange(rawStart: string, rawEnd: string): DateRange {
  const start = clampToAnalysis(rawStart);
  let end = clampToAnalysis(rawEnd);
  if (end < start) {
    end = start;
  }
  const maxEnd = addDays(start, 30);
  if (end > maxEnd) end = maxEnd;
  return { start, end };
}

function clampToAnalysis(value: string): string {
  if (value < ANALYSIS_START) return ANALYSIS_START;
  if (value > ANALYSIS_END) return ANALYSIS_END;
  return value;
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const range = useMemo(() => {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    return normaliseRange(
      isIsoDate(start) ? start : DEFAULT_START,
      isIsoDate(end) ? end : DEFAULT_END,
    );
  }, [searchParams]);

  const setRange = useCallback(
    (next: DateRange) => {
      const normalised = normaliseRange(next.start, next.end);
      setSearchParams(
        { start: normalised.start, end: normalised.end },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const reset = useCallback(() => {
    setSearchParams({ start: DEFAULT_START, end: DEFAULT_END }, { replace: true });
  }, [setSearchParams]);

  const value = useMemo(
    () => ({ range, setRange, reset }),
    [range, setRange, reset],
  );

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeContextValue {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error("useDateRange must be used inside DateRangeProvider");
  }
  return context;
}
