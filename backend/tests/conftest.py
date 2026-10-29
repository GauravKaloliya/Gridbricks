from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.data.store import Dataset
from app.domain.cutoff import CutoffRule
from app.schemas.models import ActualRecord, ForecastRecord


@pytest.fixture
def cutoff_rule() -> CutoffRule:
    from datetime import time

    return CutoffRule(local_time=time(9, 30), timezone_name="Europe/London", inclusive=True)


def make_actual(start: str, generation: float, publish: str | None = None) -> ActualRecord:
    return ActualRecord(
        start_time=start,
        publish_time=publish or start,
        generation=generation,
    )


def make_forecast(
    start: str, publish: str, generation: float
) -> ForecastRecord:
    return ForecastRecord(
        start_time=start,
        publish_time=publish,
        generation=generation,
    )


@pytest.fixture
def sample_dataset() -> Dataset:
    actuals = [
        make_actual("2026-01-01T00:00:00Z", 100.0),
        make_actual("2026-01-01T00:30:00Z", 102.0),
        make_actual("2026-01-01T01:00:00Z", 210.0),
        make_actual("2026-01-01T01:30:00Z", 212.0),
    ]
    forecasts = [
        make_forecast("2026-01-01T00:00:00Z", "2025-12-31T09:30:00Z", 110.0),
        make_forecast("2026-01-01T00:00:00Z", "2025-12-31T11:30:00Z", 999.0),
        make_forecast("2026-01-01T01:00:00Z", "2025-12-31T09:30:00Z", 200.0),
        make_forecast("2026-01-01T01:00:00Z", "2025-12-31T11:30:00Z", 888.0),
    ]
    return Dataset(
        actuals=actuals,
        forecasts=forecasts,
        retrieved_at=datetime(2026, 10, 29, 5, 44, tzinfo=timezone.utc),
        data_state="cache",
        warnings=[],
        note="Test fixture built from hand-calculated values, not production data",
    )


class FakeRepository:
    def __init__(self, dataset: Dataset | Exception) -> None:
        self.dataset = dataset

    async def get_dataset(self, *, force_refresh: bool = False) -> Dataset:
        if isinstance(self.dataset, Exception):
            raise self.dataset
        return self.dataset
