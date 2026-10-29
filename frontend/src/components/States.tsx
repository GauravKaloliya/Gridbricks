import type { AnalysisCounts, DataFreshness } from "../types/api";
import { formatDateTime, formatPercent } from "../lib/format";

function AlertGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 4.5 20 19H4L12 4.5Z" />
      <path d="M12 10v4" />
      <path d="M12 16.6h.01" />
    </svg>
  );
}

export function LoadingState({ label = "Loading analysis…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-10">
      <div className="grid border-y border-ink/20 sm:grid-cols-2 sm:divide-x sm:divide-rule xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="animate-pulse px-0 py-6 sm:px-6 sm:first:pl-0">
            <div className="h-2 w-16 bg-ink/10" />
            <div className="mt-4 h-9 w-32 bg-ink/10" />
            <div className="mt-4 h-2 w-full max-w-[220px] bg-ink/[0.07]" />
            <div className="mt-2 h-2 w-2/3 max-w-[160px] bg-ink/[0.07]" />
          </div>
        ))}
      </div>
      <div className="animate-pulse border-t-2 border-ink pt-5">
        <div className="h-3 w-52 bg-ink/10" />
        <div className="mt-5 h-[280px] border border-rule bg-paper-tint/40 sm:h-[340px]" />
      </div>
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-mute">
        <span aria-hidden="true" className="h-2 w-2 animate-pulse bg-signal" />
        {label}
      </p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="border border-ink/20 border-l-4 border-l-oxblood bg-oxblood-soft/40 p-5 sm:p-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-9 w-9 shrink-0 place-items-center border border-oxblood/30 text-oxblood">
          <AlertGlyph />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-[24px] leading-tight tracking-[-0.02em] text-ink">
            Could not load the analysis
          </h2>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ink-soft">{message}</p>
          <p className="mt-1.5 text-[11px] leading-5 text-ink-mute">
            No values have been substituted. Check that the backend is running
            and the API base URL is correct.
          </p>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="btn-primary mt-5 w-full sm:w-auto">
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 11a8 8 0 0 0-14.9-3M4 4v5h5" />
                <path d="M4 13a8 8 0 0 0 14.9 3M20 20v-5h-5" />
              </svg>
              Retry request
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-y border-rule px-2 py-10 text-center sm:py-14">
      <p aria-hidden="true" className="font-serif text-4xl leading-none text-ink-mute/50">
        —
      </p>
      <h3 className="mt-3 font-serif text-[20px] leading-tight tracking-[-0.02em] text-ink">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-xl text-[11px] leading-5 text-ink-mute">
        {description}
      </p>
    </div>
  );
}

export function PartialDataBanner({ counts }: { counts: AnalysisCounts }) {
  const unavailable =
    counts.missing_forecast_count +
    counts.missing_actual_count +
    counts.invalid_record_count;
  if (unavailable === 0) return null;
  return (
    <div className="flex items-start gap-3 border-l-2 border-ochre bg-ochre-soft/60 px-3.5 py-3.5 text-[11px] leading-5 text-ink-soft sm:px-4">
      <span className="mt-0.5 shrink-0 text-ochre">
        <AlertGlyph />
      </span>
      <div>
        <span className="font-semibold text-ink">Partial data.</span>{" "}
        {counts.matched_count} of {counts.candidate_count} intervals are usable
        ({formatPercent(counts.coverage_pct)} coverage).{" "}
        {counts.missing_forecast_count} missing an eligible forecast,{" "}
        {counts.missing_actual_count} missing actuals,{" "}
        {counts.invalid_record_count} invalid. Missing values are excluded from
        metrics, not treated as zero.
      </div>
    </div>
  );
}

const STATE_LABELS: Record<DataFreshness["data_state"], string> = {
  live: "Live Elexon fetch",
  cache: "Cached Elexon data",
  snapshot: "Stored Elexon snapshot",
  snapshot_fallback: "Snapshot fallback",
};

export function FreshnessBadge({ freshness }: { freshness: DataFreshness }) {
  const isFallback = freshness.is_fallback;
  return (
    <div className="text-[11px] leading-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span
          aria-hidden="true"
          className={`h-2 w-2 ${isFallback ? "bg-ochre" : "bg-actual"}`}
        />
        <span className="font-semibold text-ink">
          {STATE_LABELS[freshness.data_state]}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-mute">
          Retrieved {formatDateTime(freshness.retrieved_at)}
        </span>
      </div>
      {freshness.note ? (
        <p className={`mt-2 ${isFallback ? "text-ochre" : "text-ink-mute"}`}>
          {freshness.note}
        </p>
      ) : null}
      {freshness.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 border-t border-rule-soft pt-2 text-ink-mute">
          {freshness.warnings.map((warning) => (
            <li key={warning} className="flex gap-2">
              <span aria-hidden="true" className="text-signal">
                —
              </span>
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
