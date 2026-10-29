import type { ReactNode } from "react";

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative pt-5 ${className}`}>
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 h-[2px] origin-left animate-rule-in bg-ink"
      />
      {title || action ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="display text-[22px] leading-[1.18] tracking-[-0.022em] sm:text-[24px]">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="prose-note mt-1.5 max-w-3xl text-[11px] leading-5 text-ink-mute">
                {subtitle}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
