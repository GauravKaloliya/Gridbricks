import type { CutoffInfo } from "../types/api";

export function CutoffExplainer({
  cutoff,
  matchingRule,
}: {
  cutoff: CutoffInfo;
  matchingRule?: string;
}) {
  return (
    <section className="border-t-2 border-ink pt-5" data-tour="cutoff-method">
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <div>
          <p className="kicker flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 bg-signal" />
            Method note
          </p>
          <h2 className="mt-3 font-serif text-[24px] leading-[1.1] tracking-[-0.025em] text-ink sm:text-[26px]">
            How the eligible forecast is chosen
          </h2>
          <p className="mt-3 font-mono text-[10px] uppercase leading-4 tracking-[0.12em] text-ink-mute">
            Cutoff {cutoff.local_time} {cutoff.timezone}
          </p>
        </div>

        <div className="min-w-0">
          <p className="max-w-3xl font-serif text-[16px] leading-7 text-ink-soft">
            For every delivery interval, only forecasts published at or before
            the decision cutoff can be used. The latest eligible version is
            selected. Later revisions are retained for audit but can never enter
            the analysis.
          </p>

          <dl className="mt-6 grid border-y border-rule sm:grid-cols-2 sm:divide-x sm:divide-rule">
            <div className="py-4 sm:pr-6">
              <dt className="kicker">Cutoff</dt>
              <dd className="mt-1.5 text-[12px] font-medium leading-5 text-ink">
                {cutoff.local_time} {cutoff.timezone}, previous day
                {cutoff.inclusive ? " (inclusive)" : " (exclusive)"}
              </dd>
            </div>
            <div className="border-t border-rule py-4 sm:border-t-0 sm:pl-6">
              <dt className="kicker">Selection rule</dt>
              <dd className="mt-1.5 text-[12px] leading-5 text-ink-soft">
                {cutoff.rule}
              </dd>
            </div>
          </dl>

          <p className="mt-3 text-[11px] leading-5 text-ink-mute">
            {cutoff.assumption}
          </p>
          {matchingRule ? (
            <p className="mt-3 border-t border-rule-soft pt-3 text-[11px] leading-5 text-ink-mute">
              {matchingRule}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
