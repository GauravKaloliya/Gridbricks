import { useRevisions } from "../hooks/useAnalytics";
import { formatDateTime, formatMW } from "../lib/format";
import { StatusBadge } from "./StatusBadge";
import { EmptyState, ErrorState, LoadingState } from "./States";

export function RevisionsPanel({ startTime }: { startTime: string | null }) {
  const query = useRevisions(startTime);

  if (!startTime) {
    return (
      <EmptyState
        title="Select an interval"
        description="Choose a delivery interval to inspect every forecast revision and see which one was eligible."
      />
    );
  }

  if (query.isPending) {
    return <LoadingState label="Loading forecast revisions…" />;
  }

  if (query.isError) {
    return (
      <ErrorState
        message={query.error instanceof Error ? query.error.message : "Unknown error"}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const data = query.data;
  if (!data || data.revisions.length === 0) {
    return (
      <EmptyState
        title="No forecast revisions"
        description="Elexon returned no forecast versions for this delivery interval."
      />
    );
  }

  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-rule py-3.5 sm:grid-cols-4">
        <div>
          <dt className="kicker">Interval</dt>
          <dd className="mt-1 font-mono text-[11px] text-ink">
            {formatDateTime(data.start_time)}
          </dd>
        </div>
        <div>
          <dt className="kicker">Cutoff</dt>
          <dd className="mt-1 font-mono text-[11px] text-ink">
            {formatDateTime(data.decision_cutoff)}
          </dd>
        </div>
        <div>
          <dt className="kicker">Selected</dt>
          <dd className="mt-1 font-mono text-[11px] text-ink">
            {data.selected_publish_time
              ? formatDateTime(data.selected_publish_time)
              : "None eligible"}
          </dd>
        </div>
        <div>
          <dt className="kicker">Status</dt>
          <dd className="mt-1.5">
            <StatusBadge status={data.status} />
          </dd>
        </div>
      </dl>

      <div className="table-shell mt-5">
        <table className="data-table" role="table">
          <caption className="sr-only">
            Forecast revisions for the selected delivery interval
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" className="w-[26%]">
                Published
              </th>
              <th scope="col" className="w-[18%] text-right">
                Forecast (MW)
              </th>
              <th scope="col" className="w-[30%]">
                Eligibility
              </th>
              <th scope="col" className="w-[26%] text-right">
                Selected
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {data.revisions.map((revision) => (
              <tr
                key={`${revision.publish_time}-${revision.generation}`}
                role="row"
                className={
                  revision.selected
                    ? "bg-signal-soft/40"
                    : revision.eligible
                      ? ""
                      : "text-ink-mute opacity-70"
                }
              >
                <td className="cell-lead whitespace-nowrap font-mono text-[14px] text-ink sm:text-[11px]">
                  {formatDateTime(revision.publish_time)}
                </td>
                <td
                  className="whitespace-nowrap text-right font-mono text-[12px] tabular-nums text-ink"
                  data-label="Forecast (MW)"
                >
                  {formatMW(revision.generation)}
                </td>
                <td data-label="Eligibility">
                  <span
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.1em] ${
                      revision.eligible
                        ? "border-actual/35 bg-actual-soft/60 text-actual"
                        : "border-ink/20 bg-paper-tint/40 text-ink-mute"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 ${
                        revision.eligible ? "bg-actual" : "bg-ink-mute"
                      }`}
                      aria-hidden="true"
                    />
                    {revision.eligible ? "On or before cutoff" : "After cutoff — excluded"}
                  </span>
                </td>
                <td className="whitespace-nowrap text-right" data-label="Selected">
                  {revision.selected ? (
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-signal">
                      <span aria-hidden="true" className="h-1.5 w-1.5 bg-signal" />
                      Selected
                    </span>
                  ) : (
                    <span className="text-ink-mute">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 border-t border-rule-soft pt-2.5 text-[10px] leading-5 text-ink-mute">
        Post-cutoff revisions are displayed for audit only. The selected row is
        the latest revision published on or before the cutoff, never a later
        version.
      </p>
    </div>
  );
}
