type Tone = "default" | "warning" | "positive";

export function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "default",
  meter,
  index = 0,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  tone?: Tone;
  meter?: number;
  index?: number;
}) {
  const numberColor =
    tone === "warning"
      ? "text-signal"
      : tone === "positive"
        ? "text-actual"
        : "text-ink";

  return (
    <div
      className="group animate-fade-up py-5 first:pt-0 sm:px-6 sm:py-6 sm:first:pt-6 sm:first:pl-0 sm:last:pr-0"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-baseline gap-2">
        <span
          aria-hidden="true"
          className="font-mono text-[9px] leading-none text-ink-mute"
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
          {label}
        </p>
      </div>

      <p
        className={`display mt-3 text-[38px] leading-[0.92] tracking-[-0.04em] sm:text-[46px] ${numberColor}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
        {unit ? (
          <span className="ml-2 font-sans text-[10px] font-medium uppercase tracking-[0.12em] text-ink-mute">
            {unit}
          </span>
        ) : null}
      </p>

      <div
        aria-hidden="true"
        className="mt-3.5 h-px w-8 bg-ink/25 transition-all duration-500 group-hover:w-16 group-hover:bg-signal"
      />

      <p className="prose-note mt-3 max-w-[36ch] text-[11px] leading-5 text-ink-mute">
        {hint}
      </p>

      {meter !== undefined ? (
        <div aria-hidden="true" className="mt-4 h-[3px] w-full bg-ink/10">
          <div
            className="h-full bg-actual"
            style={{ width: `${Math.min(100, Math.max(0, meter))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
