from __future__ import annotations

import asyncio
from datetime import date

import pytest

from app.core.config import Settings
from app.data.repository import DatasetRepository
from app.services.analysis import AnalysisService


@pytest.fixture(scope="module")
def full_month():
    settings = Settings(data_mode="snapshot")
    service = AnalysisService(settings, DatasetRepository(settings))
    return asyncio.run(service.analyze(date(2026, 1, 1), date(2026, 1, 31)))


def test_full_month_snapshot_is_complete_and_fully_matched(full_month):
    counts = full_month.counts
    assert counts.candidate_count == 744
    assert counts.matched_count == 744
    assert counts.missing_forecast_count == 0
    assert counts.missing_actual_count == 0
    assert counts.invalid_record_count == 0
    assert counts.coverage_pct == pytest.approx(100.0)

    assert all(interval.status == "matched" for interval in full_month.intervals)
    assert all(interval.actual_periods_used == 2 for interval in full_month.intervals)
    assert all(
        interval.forecast_generation is not None
        and interval.actual_generation is not None
        for interval in full_month.intervals
    )
    assert all(
        interval.selected_publish_time <= interval.decision_cutoff
        for interval in full_month.intervals
    )


def test_full_month_metrics_match_the_documented_values(full_month):
    metrics = full_month.metrics
    assert metrics.status == "ok"
    assert metrics.matched_count == 744
    assert metrics.mae == pytest.approx(2122.8111559139784)
    assert metrics.rmse == pytest.approx(2616.6886648748277)
    assert metrics.mbe == pytest.approx(1840.296370967742)

    decision = full_month.decision_support
    assert decision.p90_absolute_error == pytest.approx(4312.4)
    assert decision.p95_absolute_error == pytest.approx(5418.525)
    assert decision.p90_shortfall == pytest.approx(488.85)
    assert decision.underforecast_share_pct == pytest.approx(15.591397849462366)


def test_decision_buckets_partition_every_matched_hour(full_month):
    buckets = full_month.decision_support.lead_time_buckets
    assert [bucket.label for bucket in buckets] == [
        "Under 18 h",
        "18–24 h",
        "24–30 h",
        "30 h and over",
    ]
    assert [bucket.matched_count for bucket in buckets] == [124, 186, 186, 248]
    assert sum(bucket.matched_count for bucket in buckets) == 744
    assert [round(bucket.mae or 0, 2) for bucket in buckets] == [
        2321.24,
        2300.59,
        1981.28,
        1996.41,
    ]
