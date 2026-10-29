from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.domain.metrics import compute_decision_support, percentile
from app.schemas.models import IntervalResult, IntervalStatus

UTC = timezone.utc


def make_interval(
    hour: int, lead_hours: float, signed_error: float
) -> IntervalResult:
    start = datetime(2026, 1, 1, hour, 0, tzinfo=UTC)
    actual = 1000.0
    forecast = actual + signed_error
    return IntervalResult(
        start_time=start,
        end_time=start + timedelta(hours=1),
        decision_cutoff=datetime(2025, 12, 31, 9, 30, tzinfo=UTC),
        selected_publish_time=start - timedelta(hours=lead_hours),
        forecast_generation=forecast,
        actual_generation=actual,
        signed_error=signed_error,
        absolute_error=abs(signed_error),
        status=IntervalStatus.MATCHED,
        actual_periods_used=2,
        eligible_forecast_count=1,
        lead_time_hours=lead_hours,
    )


def sample_intervals() -> list[IntervalResult]:
    errors = [-100, -50, 0, 50, 100, 150, 200, 250, 300, 400]
    leads = [10, 12, 20, 20, 25, 25, 32, 32, 36, 36]
    return [
        make_interval(hour, lead, error)
        for hour, (lead, error) in enumerate(zip(leads, errors))
    ]


def test_percentile_uses_linear_interpolation():
    assert percentile([], 0.9) is None
    assert percentile([5.0], 0.9) == 5.0
    assert percentile([10, 20, 30, 40], 0.5) == pytest.approx(25.0)
    assert percentile([1, 2, 3, 4, 5], 0.9) == pytest.approx(4.6)
    assert percentile([1, 2, 3, 4, 5], 0.0) == 1.0
    assert percentile([1, 2, 3, 4, 5], 1.0) == 5.0


def test_percentile_rejects_invalid_quantile():
    with pytest.raises(ValueError):
        percentile([1.0], 1.5)


def test_decision_support_known_values():
    decision = compute_decision_support(sample_intervals())
    assert decision.p90_absolute_error == pytest.approx(310.0)
    assert decision.p95_absolute_error == pytest.approx(355.0)
    assert decision.p90_shortfall == pytest.approx(55.0)
    assert decision.underforecast_share_pct == pytest.approx(20.0)
    assert len(decision.lead_time_buckets) == 4

    buckets = {bucket.label: bucket for bucket in decision.lead_time_buckets}
    assert buckets["Under 18 h"].matched_count == 2
    assert buckets["Under 18 h"].mae == pytest.approx(75.0)
    assert buckets["Under 18 h"].mean_signed_error == pytest.approx(-75.0)
    assert buckets["18–24 h"].matched_count == 2
    assert buckets["24–30 h"].matched_count == 2
    assert buckets["30 h and over"].matched_count == 4
    assert buckets["30 h and over"].mae == pytest.approx(287.5)
    assert sum(bucket.matched_count for bucket in decision.lead_time_buckets) == 10


def test_decision_support_is_null_without_matched_hours():
    decision = compute_decision_support([])
    assert decision.p90_absolute_error is None
    assert decision.p95_absolute_error is None
    assert decision.p90_shortfall is None
    assert decision.underforecast_share_pct is None
    assert decision.lead_time_buckets == []
    assert "linear interpolation" in decision.method


def test_decision_support_ignores_unmatched_intervals():
    missing = IntervalResult(
        start_time=datetime(2026, 1, 1, 5, 0, tzinfo=UTC),
        end_time=datetime(2026, 1, 1, 6, 0, tzinfo=UTC),
        decision_cutoff=datetime(2025, 12, 31, 9, 30, tzinfo=UTC),
        status=IntervalStatus.MISSING_ACTUAL,
        forecast_generation=900.0,
        actual_generation=None,
        signed_error=None,
        absolute_error=None,
        lead_time_hours=19.5,
    )
    decision = compute_decision_support([make_interval(0, 10, 100.0), missing])
    assert decision.p90_absolute_error == pytest.approx(100.0)
    assert decision.underforecast_share_pct == pytest.approx(0.0)
    assert sum(bucket.matched_count for bucket in decision.lead_time_buckets) == 1
