import {
  ANALYSIS_END,
  ANALYSIS_START,
  DEFAULT_END,
  DEFAULT_START,
  addDays,
  formatLongDate,
} from "../lib/format";
import { useDateRange } from "./DateRangeContext";

export function DateRangeControl() {
  const { range, setRange } = useDateRange();

  function updateStart(value: string) {
    if (!value) return;
    if (value > range.end) {
      const nextEnd = addDays(value, 6) <= ANALYSIS_END ? addDays(value, 6) : ANALYSIS_END;
      setRange({ start: value, end: nextEnd });
    } else {
      setRange({ start: value, end: range.end });
    }
  }

  function updateEnd(value: string) {
    if (!value) return;
    if (value < range.start) {
      setRange({ start: value, end: value });
    } else {
      setRange({ start: range.start, end: value });
    }
  }

  const isDefault = range.start === DEFAULT_START && range.end === DEFAULT_END;
  const isFullMonth = range.start === ANALYSIS_START && range.end === ANALYSIS_END;

  const quickClass = (active: boolean) =>
    [
      "flex min-h-[44px] flex-1 items-center justify-center border px-2.5 py-2 text-center text-[9px] font-semibold uppercase leading-4 tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:min-h-0 sm:py-2",
      active
        ? "border-ink bg-ink text-paper"
        : "border-ink/25 bg-transparent text-ink-soft hover:border-ink hover:text-ink",
    ].join(" ");

  return (
    <div className="border-t-2 border-ink pt-4" data-tour="date-range">
      <div className="flex items-center justify-between gap-3">
        <p className="kicker flex items-center gap-2 text-ink">
          <span aria-hidden="true" className="h-2 w-2 bg-signal" />
          Analysis window
        </p>
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">
          Jan 2026
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:mt-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <label>
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">
            From
          </span>
          <input
            type="date"
            className="field"
            value={range.start}
            min={ANALYSIS_START}
            max={range.end}
            onChange={(event) => updateStart(event.target.value)}
          />
        </label>
        <span
          aria-hidden="true"
          className="hidden pb-2 font-serif text-base text-ink-mute sm:inline"
        >
          →
        </span>
        <label>
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.16em] text-ink-mute">
            To
          </span>
          <input
            type="date"
            className="field"
            value={range.end}
            min={range.start}
            max={ANALYSIS_END}
            onChange={(event) => updateEnd(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-3 flex gap-2 sm:mt-4">
        <button
          type="button"
          aria-pressed={isDefault}
          className={quickClass(isDefault)}
          onClick={() => setRange({ start: DEFAULT_START, end: DEFAULT_END })}
        >
          First 7 days
        </button>
        <button
          type="button"
          aria-pressed={isFullMonth}
          className={quickClass(isFullMonth)}
          onClick={() => setRange({ start: ANALYSIS_START, end: ANALYSIS_END })}
        >
          Full January
        </button>
      </div>

      <p className="mt-3 border-t border-rule-soft pt-2.5 text-[10px] leading-4 text-ink-mute">
        Delivery dates · {formatLongDate(range.start)} to {formatLongDate(range.end)} ·
        times shown in Europe/London
      </p>
    </div>
  );
}
