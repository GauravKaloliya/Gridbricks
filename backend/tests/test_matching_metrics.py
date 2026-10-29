from __future__ import annotations

import math
from datetime import datetime, timezone

import pytest

from app.domain.cutoff import CutoffRule
from app.domain.matching import build_intervals
from app.domain.metrics import compute_metrics, count_intervals
from app.schemas.models import IntervalStatus

from tests.conftest import make_actual, make_forecast

UTC = timezone.utc
START = datetime(2026, 1, 1, 0, 0, tzinfo=UTC)
END = datetime(2026, 1, 1, 2, 0, tzinfo=UTC)


@pytest.fixture
def rule() -> CutoffRule:
    from datetime import time

    return CutoffRule(time(9, 30), "Europe/London", True)


def base_actuals():
    return [
        make_actual("2026-01-01T00:00:00Z", 100.0),
        make_actual("2026-01-01T00:30:00Z", 102.0),
        make_actual("2026-01-01T01:00:00Z", 210.0),
        make_actual("2026-01-01T01:30:00Z", 212.0),
    ]


def base_forecasts():
    return [
        make_forecast("2026-01-01T00:00:00Z", "2025-12-31T09:30:00Z", 110.0),
        make_forecast("2026-01-01T01:00:00Z", "2025-12-31T09:30:00Z", 200.0),
    ]


def test_matches_hourly_forecast_to_mean_of_half_hourly_actuals(rule):
    intervals = build_intervals(
        start=START,
        end_exclusive=END,
        forecasts=base_forecasts(),
        actuals=base_actuals(),
        rule=rule,
    )
    assert len(intervals) == 2
    first, second = intervals
    assert first.status == IntervalStatus.MATCHED
    assert first.actual_generation == 101.0
    assert first.forecast_generation == 110.0
    assert first.signed_error == 9.0
    assert first.absolute_error == 9.0
    assert first.actual_periods_used == 2
    assert first.decision_cutoff == datetime(2025, 12, 31, 9, 30, tzinfo=UTC)
    assert second.signed_error == -11.0


def test_missing_half_hour_actual_is_not_averaged(rule):
    actuals = [record for record in base_actuals() if record.start_time.minute != 30]
    intervals = build_intervals(
        start=START,
        end_exclusive=END,
        forecasts=base_forecasts(),
        actuals=actuals,
        rule=rule,
    )
    assert intervals[0].status == IntervalStatus.MISSING_ACTUAL
    assert intervals[0].actual_generation is None
    assert intervals[0].signed_error is None
    assert intervals[0].detail == "Only one of the two half-hourly actuals is available"


def test_conflicting_duplicate_actuals_mark_interval_invalid(rule):
    actuals = base_actuals() + [make_actual("2026-01-01T00:00:00Z", 500.0)]
    intervals = build_intervals(
        start=START,
        end_exclusive=END,
        forecasts=base_forecasts(),
        actuals=actuals,
        rule=rule,
    )
    assert intervals[0].status == IntervalStatus.INVALID_RECORD
    assert "conflicting duplicates" in (intervals[0].detail or "").lower()


def test_no_eligible_forecast_is_missing_not_zero(rule):
    forecasts = [
        make_forecast("2026-01-01T00:00:00Z", "2025-12-31T11:30:00Z", 999.0),
        make_forecast("2026-01-01T01:00:00Z", "2025-12-31T11:30:00Z", 999.0),
    ]
    intervals = build_intervals(
        start=START,
        end_exclusive=END,
        forecasts=forecasts,
        actuals=base_actuals(),
        rule=rule,
    )
    assert all(interval.status == IntervalStatus.MISSING_FORECAST for interval in intervals)
    assert all(interval.forecast_generation is None for interval in intervals)
    assert all(interval.signed_error is None for interval in intervals)


def test_timezone_equivalent_timestamps_join_correctly(rule):
    actuals = [
        make_actual("2026-01-01T01:00:00+01:00", 100.0),  # 00:00Z
        make_actual("2026-01-01T00:30:00Z", 102.0),
        make_actual("2026-01-01T01:00:00Z", 210.0),
        make_actual("2026-01-01T01:30:00Z", 212.0),
    ]
    intervals = build_intervals(
        start=START,
        end_exclusive=END,
        forecasts=base_forecasts(),
        actuals=actuals,
        rule=rule,
    )
    assert intervals[0].actual_generation == 101.0


def test_metrics_known_values(rule):
    intervals = build_intervals(
        start=START,
        end_exclusive=END,
        forecasts=base_forecasts(),
        actuals=base_actuals(),
        rule=rule,
    )
    metrics = compute_metrics(intervals)
    assert metrics.status == "ok"
    assert metrics.matched_count == 2
    assert metrics.mae == pytest.approx(10.0)
    assert metrics.rmse == pytest.approx(math.sqrt(101.0))
    assert metrics.mbe == pytest.approx(-1.0)
    assert metrics.unit == "MW"


def test_metrics_no_data_returns_null_not_zero():
    metrics = compute_metrics([])
    assert metrics.status == "no_data"
    assert metrics.matched_count == 0
    assert metrics.mae is None
    assert metrics.rmse is None
    assert metrics.mbe is None


def test_counts_distinguish_missing_reasons(rule):
    actuals = [record for record in base_actuals() if record.start_time.hour == 0]
    forecasts = [base_forecasts()[0]]
    intervals = build_intervals(
        start=START,
        end_exclusive=END,
        forecasts=forecasts,
        actuals=actuals,
        rule=rule,
    )
    counts = count_intervals(intervals)
    assert counts.candidate_count == 2
    assert counts.matched_count == 1
    assert counts.missing_forecast_count == 1
    assert counts.missing_actual_count == 0
    assert counts.invalid_record_count == 0
    assert counts.coverage_pct == 50.0
