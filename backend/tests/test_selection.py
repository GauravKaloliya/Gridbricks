from __future__ import annotations

from datetime import datetime, timezone

from app.domain.selection import select_forecast
from app.schemas.models import IntervalStatus

from tests.conftest import make_forecast

UTC = timezone.utc
TARGET = datetime(2026, 1, 1, 12, 0, tzinfo=UTC)
CUTOFF = datetime(2025, 12, 31, 9, 30, tzinfo=UTC)


def test_selects_latest_forecast_before_cutoff():
    forecasts = [
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T07:30:00Z", 100.0),
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T09:30:00Z", 120.0),
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T09:30:00Z", 120.0),
    ]
    outcome = select_forecast(forecasts, TARGET, CUTOFF)
    assert outcome.status == IntervalStatus.MATCHED
    assert outcome.selected is not None
    assert outcome.selected.publish_time == datetime(2025, 12, 31, 9, 30, tzinfo=UTC)
    assert outcome.selected.generation == 120.0
    assert outcome.eligible_count == 3


def test_forecast_exactly_at_cutoff_is_eligible():
    forecasts = [
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T09:30:00Z", 140.0),
    ]
    outcome = select_forecast(forecasts, TARGET, CUTOFF, inclusive=True)
    assert outcome.status == IntervalStatus.MATCHED
    assert outcome.selected.generation == 140.0


def test_forecast_after_cutoff_is_rejected():
    forecasts = [
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T09:30:00Z", 140.0),
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T11:30:00Z", 999.0),
    ]
    outcome = select_forecast(forecasts, TARGET, CUTOFF)
    assert outcome.status == IntervalStatus.MATCHED
    assert outcome.selected.generation == 140.0


def test_only_post_cutoff_forecasts_means_missing():
    forecasts = [
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T11:30:00Z", 999.0),
    ]
    outcome = select_forecast(forecasts, TARGET, CUTOFF)
    assert outcome.status == IntervalStatus.MISSING_FORECAST
    assert outcome.selected is None
    assert outcome.eligible_count == 0
    assert "No forecast" in (outcome.detail or "")


def test_conflicting_duplicate_publications_are_invalid():
    forecasts = [
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T09:30:00Z", 140.0),
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T09:30:00Z", 150.0),
    ]
    outcome = select_forecast(forecasts, TARGET, CUTOFF)
    assert outcome.status == IntervalStatus.INVALID_RECORD
    assert outcome.selected is None
    assert "Conflicting duplicate" in (outcome.detail or "")


def test_identical_duplicate_publications_are_deduped():
    forecasts = [
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T09:30:00Z", 140.0),
        make_forecast("2026-01-01T12:00:00Z", "2025-12-31T09:30:00Z", 140.0),
    ]
    outcome = select_forecast(forecasts, TARGET, CUTOFF)
    assert outcome.status == IntervalStatus.MATCHED
    assert outcome.selected.generation == 140.0


def test_different_target_intervals_are_never_joined():
    forecasts = [
        make_forecast("2026-01-01T13:00:00Z", "2025-12-31T07:30:00Z", 777.0),
    ]
    outcome = select_forecast(forecasts, TARGET, CUTOFF)
    assert outcome.status == IntervalStatus.MISSING_FORECAST
