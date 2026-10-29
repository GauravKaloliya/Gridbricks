from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.core.timeutils import ensure_utc
from app.domain.cutoff import is_eligible
from app.schemas.models import ForecastRecord, IntervalStatus


@dataclass(frozen=True)
class SelectionOutcome:
    status: IntervalStatus
    selected: ForecastRecord | None
    cutoff: datetime
    eligible_count: int
    detail: str | None = None


def select_forecast(
    forecasts: list[ForecastRecord],
    target_start: datetime,
    cutoff: datetime,
    *,
    inclusive: bool = True,
) -> SelectionOutcome:
    """Select the latest forecast published at or before the cutoff.

    A forecast published after the cutoff is never eligible. Duplicate records
    at the winning publication time are accepted only when they agree; a
    conflict is surfaced as ``invalid_record`` rather than resolved arbitrarily.
    """
    target_start = ensure_utc(target_start)
    cutoff = ensure_utc(cutoff)

    for_target = [record for record in forecasts if record.start_time == target_start]
    eligible = [
        record
        for record in for_target
        if is_eligible(record.publish_time, cutoff, inclusive)
    ]

    if not eligible:
        return SelectionOutcome(
            status=IntervalStatus.MISSING_FORECAST,
            selected=None,
            cutoff=cutoff,
            eligible_count=0,
            detail="No forecast published on or before the decision cutoff",
        )

    latest_publish = max(record.publish_time for record in eligible)
    latest = [record for record in eligible if record.publish_time == latest_publish]
    values = {record.generation for record in latest}

    if len(values) > 1:
        return SelectionOutcome(
            status=IntervalStatus.INVALID_RECORD,
            selected=None,
            cutoff=cutoff,
            eligible_count=len(eligible),
            detail=(
                "Conflicting duplicate forecasts share the latest eligible "
                f"publication time {latest_publish.isoformat()}"
            ),
        )

    selected = sorted(latest, key=lambda record: record.generation)[0]
    return SelectionOutcome(
        status=IntervalStatus.MATCHED,
        selected=selected,
        cutoff=cutoff,
        eligible_count=len(eligible),
        detail=None,
    )
