from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from app.core.timeutils import ensure_utc, iter_hours
from app.domain.cutoff import CutoffRule, cutoff_for_delivery
from app.domain.selection import select_forecast
from app.schemas.models import (
    ActualRecord,
    ForecastRecord,
    IntervalResult,
    IntervalStatus,
)

HALF_HOUR = timedelta(minutes=30)


@dataclass(frozen=True)
class ActualAggregate:
    status: IntervalStatus
    generation: float | None
    periods_used: int
    detail: str | None = None


def aggregate_actuals(
    actuals: list[ActualRecord],
) -> dict[datetime, ActualAggregate]:
    """Index half-hourly actuals, rejecting conflicting duplicates."""
    grouped: dict[datetime, list[ActualRecord]] = {}
    for record in actuals:
        grouped.setdefault(record.start_time, []).append(record)

    result: dict[datetime, ActualAggregate] = {}
    for start_time, records in grouped.items():
        values = {record.generation for record in records}
        if len(values) > 1:
            result[start_time] = ActualAggregate(
                status=IntervalStatus.INVALID_RECORD,
                generation=None,
                periods_used=0,
                detail=(
                    "Conflicting duplicate actual records for "
                    f"{start_time.isoformat()}"
                ),
            )
        else:
            result[start_time] = ActualAggregate(
                status=IntervalStatus.MATCHED,
                generation=next(iter(values)),
                periods_used=1,
            )
    return result


def hourly_actual(
    hour_start: datetime, indexed: dict[datetime, ActualAggregate]
) -> ActualAggregate:
    """Aggregate two half-hourly actuals into the forecast's hourly interval.

    Both halves are required. A single half is reported as missing rather than
    averaged in, because a one-sided mean would silently bias the comparison.
    """
    hour_start = ensure_utc(hour_start)
    halves = [indexed.get(hour_start), indexed.get(hour_start + HALF_HOUR)]
    if any(item is not None and item.status == IntervalStatus.INVALID_RECORD for item in halves):
        return ActualAggregate(
            status=IntervalStatus.INVALID_RECORD,
            generation=None,
            periods_used=0,
            detail="A half-hourly actual for this hour has conflicting duplicates",
        )
    present = [item for item in halves if item is not None]
    if len(present) == 2:
        return ActualAggregate(
            status=IntervalStatus.MATCHED,
            generation=(present[0].generation + present[1].generation) / 2.0,
            periods_used=2,
        )
    if len(present) == 1:
        return ActualAggregate(
            status=IntervalStatus.MISSING_ACTUAL,
            generation=None,
            periods_used=1,
            detail="Only one of the two half-hourly actuals is available",
        )
    return ActualAggregate(
        status=IntervalStatus.MISSING_ACTUAL,
        generation=None,
        periods_used=0,
        detail="Neither half-hourly actual is available",
    )


def build_intervals(
    *,
    start: datetime,
    end_exclusive: datetime,
    forecasts: list[ForecastRecord],
    actuals: list[ActualRecord],
    rule: CutoffRule,
) -> list[IntervalResult]:
    indexed_actuals = aggregate_actuals(actuals)
    intervals: list[IntervalResult] = []

    for hour_start in iter_hours(start, end_exclusive):
        cutoff = cutoff_for_delivery(hour_start, rule)
        selection = select_forecast(
            forecasts,
            hour_start,
            cutoff,
            inclusive=rule.inclusive,
        )
        actual = hourly_actual(hour_start, indexed_actuals)

        forecast_value = selection.selected.generation if selection.selected else None
        actual_value = actual.generation
        signed_error = None
        absolute_error = None
        detail = None

        if selection.status == IntervalStatus.INVALID_RECORD:
            status = IntervalStatus.INVALID_RECORD
            detail = selection.detail
        elif selection.status == IntervalStatus.MISSING_FORECAST:
            status = IntervalStatus.MISSING_FORECAST
            detail = selection.detail
        elif actual.status == IntervalStatus.INVALID_RECORD:
            status = IntervalStatus.INVALID_RECORD
            detail = actual.detail
        elif actual.status == IntervalStatus.MISSING_ACTUAL:
            status = IntervalStatus.MISSING_ACTUAL
            detail = actual.detail
        else:
            status = IntervalStatus.MATCHED
            signed_error = forecast_value - actual_value
            absolute_error = abs(signed_error)

        intervals.append(
            IntervalResult(
                start_time=hour_start,
                end_time=hour_start + timedelta(hours=1),
                decision_cutoff=cutoff,
                selected_publish_time=(
                    selection.selected.publish_time if selection.selected else None
                ),
                forecast_generation=forecast_value,
                actual_generation=actual_value,
                signed_error=signed_error,
                absolute_error=absolute_error,
                status=status,
                detail=detail,
                actual_periods_used=actual.periods_used,
                eligible_forecast_count=selection.eligible_count,
                lead_time_hours=(
                    (hour_start - selection.selected.publish_time).total_seconds()
                    / 3600.0
                    if selection.selected is not None
                    else None
                ),
            )
        )

    return intervals
