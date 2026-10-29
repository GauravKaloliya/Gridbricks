from __future__ import annotations

import math

from app.schemas.models import (
    AccuracyMetrics,
    AnalysisCounts,
    DecisionSupport,
    IntervalResult,
    IntervalStatus,
    LeadTimeBucket,
)

PERCENTILE_METHOD = (
    "Percentiles use linear interpolation between order statistics "
    "(position = (n - 1) x q). Shortfall is max(actual - forecast, 0) over "
    "every matched hour, so hours with no shortfall are included."
)

LEAD_TIME_BUCKETS: tuple[tuple[str, float | None, float | None], ...] = (
    ("Under 18 h", None, 18.0),
    ("18–24 h", 18.0, 24.0),
    ("24–30 h", 24.0, 30.0),
    ("30 h and over", 30.0, None),
)


def percentile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    if not 0.0 <= q <= 1.0:
        raise ValueError("q must be between 0 and 1")
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * q
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    fraction = position - lower
    return ordered[lower] + (ordered[upper] - ordered[lower]) * fraction


def _matched(intervals: list[IntervalResult]) -> list[IntervalResult]:
    return [
        interval
        for interval in intervals
        if interval.status == IntervalStatus.MATCHED
        and interval.signed_error is not None
        and math.isfinite(interval.signed_error)
    ]


def _in_bucket(
    lead_hours: float, lower: float | None, upper: float | None
) -> bool:
    if lower is not None and lead_hours < lower:
        return False
    if upper is not None and lead_hours >= upper:
        return False
    return True


def compute_decision_support(intervals: list[IntervalResult]) -> DecisionSupport:
    matched = _matched(intervals)
    if not matched:
        return DecisionSupport(method=PERCENTILE_METHOD)

    errors = [interval.signed_error for interval in matched]
    absolute = [abs(error) for error in errors]
    shortfalls = [
        max(interval.actual_generation - interval.forecast_generation, 0.0)
        for interval in matched
    ]
    underforecast_count = sum(1 for error in errors if error < 0)

    buckets: list[LeadTimeBucket] = []
    for label, lower, upper in LEAD_TIME_BUCKETS:
        members = [
            interval
            for interval in matched
            if interval.lead_time_hours is not None
            and _in_bucket(interval.lead_time_hours, lower, upper)
        ]
        bucket_errors = [interval.signed_error for interval in members]
        buckets.append(
            LeadTimeBucket(
                label=label,
                lower_hours=lower,
                upper_hours=upper,
                matched_count=len(members),
                mae=(
                    math.fsum(abs(error) for error in bucket_errors)
                    / len(bucket_errors)
                    if bucket_errors
                    else None
                ),
                mean_signed_error=(
                    math.fsum(bucket_errors) / len(bucket_errors)
                    if bucket_errors
                    else None
                ),
            )
        )

    return DecisionSupport(
        p90_absolute_error=percentile(absolute, 0.90),
        p95_absolute_error=percentile(absolute, 0.95),
        p90_shortfall=percentile(shortfalls, 0.90),
        underforecast_share_pct=underforecast_count / len(matched) * 100.0,
        lead_time_buckets=buckets,
        method=PERCENTILE_METHOD,
    )


def compute_metrics(intervals: list[IntervalResult]) -> AccuracyMetrics:
    matched = _matched(intervals)
    if not matched:
        return AccuracyMetrics(status="no_data", matched_count=0)

    errors = [interval.signed_error for interval in matched]
    absolute = [abs(error) for error in errors]
    mae = math.fsum(absolute) / len(absolute)
    rmse = math.sqrt(math.fsum(error * error for error in errors) / len(errors))
    mbe = math.fsum(errors) / len(errors)
    return AccuracyMetrics(
        status="ok",
        mae=mae,
        rmse=rmse,
        mbe=mbe,
        matched_count=len(matched),
    )


def count_intervals(intervals: list[IntervalResult]) -> AnalysisCounts:
    candidate_count = len(intervals)
    matched_count = sum(
        1 for interval in intervals if interval.status == IntervalStatus.MATCHED
    )
    missing_forecast_count = sum(
        1 for interval in intervals if interval.status == IntervalStatus.MISSING_FORECAST
    )
    missing_actual_count = sum(
        1 for interval in intervals if interval.status == IntervalStatus.MISSING_ACTUAL
    )
    invalid_record_count = sum(
        1 for interval in intervals if interval.status == IntervalStatus.INVALID_RECORD
    )
    coverage_pct = (
        (matched_count / candidate_count * 100.0) if candidate_count else 0.0
    )
    return AnalysisCounts(
        candidate_count=candidate_count,
        matched_count=matched_count,
        missing_forecast_count=missing_forecast_count,
        missing_actual_count=missing_actual_count,
        invalid_record_count=invalid_record_count,
        coverage_pct=coverage_pct,
    )
