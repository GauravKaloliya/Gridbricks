import type { IntervalStatus } from "../types/api";

const STATUS_META: Record<
  IntervalStatus,
  { label: string; className: string; dot: string }
> = {
  matched: {
    label: "Matched",
    className: "border-actual/35 bg-actual-soft/60 text-actual",
    dot: "bg-actual",
  },
  missing_forecast: {
    label: "No eligible forecast",
    className: "border-ochre/35 bg-ochre-soft/60 text-ochre",
    dot: "bg-ochre",
  },
  missing_actual: {
    label: "Missing actual",
    className: "border-ochre/35 bg-paper-raised text-ochre",
    dot: "bg-ochre",
  },
  invalid_record: {
    label: "Invalid record",
    className: "border-oxblood/35 bg-oxblood-soft/60 text-oxblood",
    dot: "bg-oxblood",
  },
  upstream_unavailable: {
    label: "Upstream unavailable",
    className: "border-ink/25 bg-paper-tint/60 text-ink-mute",
    dot: "bg-ink-mute",
  },
};

export function StatusBadge({
  status,
  detail,
}: {
  status: IntervalStatus;
  detail?: string | null;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-[3px] text-[9px] font-semibold uppercase tracking-[0.1em] ${meta.className}`}
      title={detail ?? meta.label}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

export function statusLabel(status: IntervalStatus): string {
  return STATUS_META[status].label;
}
