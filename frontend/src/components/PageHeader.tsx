import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 animate-fade-up sm:mb-10">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rule pb-2.5">
        {eyebrow ? (
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="h-2 w-2 bg-signal" />
            <span className="kicker text-ink">{eyebrow}</span>
          </p>
        ) : (
          <span />
        )}
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-mute">
          Research note · No. 01
        </p>
      </div>

      <div className="mt-5 grid gap-6 sm:mt-7 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
        <div className="min-w-0">
          <h1 className="display text-balance text-[34px] leading-[1.04] sm:text-[52px] sm:leading-[1.015] lg:text-[58px]">
            {title}
          </h1>
          <div
            aria-hidden="true"
            className="mt-5 h-px w-16 origin-left animate-rule-in bg-ink/35 sm:mt-6"
          />
          <p className="lede mt-4 sm:mt-5">{description}</p>
        </div>
        {children ? (
          <div className="w-full lg:justify-self-end">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
