from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.routes import get_service
from app.core.config import Settings
from app.core.errors import DataUnavailableError, InvalidRequestError, UpstreamError
from app.data.repository import DatasetRepository
from app.data.store import Dataset, write_dataset_file
from app.main import app
from app.schemas.models import ActualRecord, ForecastRecord
from app.services.analysis import AnalysisService

from tests.conftest import FakeRepository


def make_dataset(retrieved_at: datetime) -> Dataset:
    return Dataset(
        actuals=[
            ActualRecord(
                start_time="2026-01-01T00:00:00Z",
                publish_time="2026-01-01T00:30:00Z",
                generation=100.0,
            )
        ],
        forecasts=[
            ForecastRecord(
                start_time="2026-01-01T00:00:00Z",
                publish_time="2025-12-31T09:30:00Z",
                generation=110.0,
            )
        ],
        retrieved_at=retrieved_at,
        data_state="cache",
    )


@pytest.fixture
def api_client(sample_dataset):
    service = AnalysisService(Settings(), FakeRepository(sample_dataset))
    app.dependency_overrides[get_service] = lambda: service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_numeric_string_generation_is_coerced():
    record = ActualRecord(
        start_time="2026-01-01T00:00:00Z",
        publish_time="2026-01-01T00:30:00Z",
        generation="123.5",
    )
    assert record.generation == 123.5


@pytest.mark.parametrize(
    "bad_value",
    [None, "", "not-a-number", float("nan"), float("inf"), float("-inf"), -1.0],
)
def test_invalid_generation_is_rejected(bad_value):
    with pytest.raises(ValidationError):
        ForecastRecord(
            start_time="2026-01-01T00:00:00Z",
            publish_time="2025-12-31T09:30:00Z",
            generation=bad_value,
        )


def test_cache_path_is_scoped_to_the_analysis_period(tmp_path):
    settings = Settings(cache_dir=tmp_path / "cache")
    repository = DatasetRepository(settings)
    assert repository.cache_path.name == "dataset_2026-01-01_2026-01-31.json"


def test_stale_cache_is_not_served(tmp_path):
    settings = Settings(cache_dir=tmp_path / "cache")
    repository = DatasetRepository(settings)
    stale_time = datetime.now(timezone.utc) - timedelta(
        seconds=settings.cache_ttl_seconds + 60
    )
    write_dataset_file(
        repository.cache_path,
        make_dataset(stale_time),
        settings.analysis_start,
        settings.analysis_end,
    )
    assert repository._load_fresh_cache() is None


async def test_upstream_failure_falls_back_to_labelled_snapshot(tmp_path):
    settings = Settings(
        cache_dir=tmp_path / "cache",
        snapshot_path=tmp_path / "snapshot.json",
    )
    repository = DatasetRepository(settings)
    write_dataset_file(
        settings.snapshot_path,
        make_dataset(datetime.now(timezone.utc)),
        settings.analysis_start,
        settings.analysis_end,
    )

    async def fail_fetch() -> Dataset:
        raise UpstreamError("simulated outage")

    repository._fetch_live = fail_fetch  # type: ignore[method-assign]
    dataset = await repository.get_dataset()

    assert dataset.data_state == "snapshot_fallback"
    assert "simulated outage" in dataset.note


async def test_missing_snapshot_is_reported_as_unavailable(tmp_path):
    settings = Settings(
        data_mode="snapshot",
        snapshot_path=tmp_path / "missing.json",
    )
    repository = DatasetRepository(settings)
    with pytest.raises(DataUnavailableError):
        await repository.get_dataset()


async def test_corrupt_snapshot_is_reported_as_unavailable(tmp_path):
    settings = Settings(
        data_mode="snapshot",
        snapshot_path=tmp_path / "broken.json",
    )
    settings.snapshot_path.write_text("{not json", encoding="utf-8")
    repository = DatasetRepository(settings)
    with pytest.raises(DataUnavailableError):
        await repository.get_dataset()


def test_range_longer_than_configured_maximum_is_rejected(sample_dataset):
    service = AnalysisService(
        Settings(max_range_days=5), FakeRepository(sample_dataset)
    )
    with pytest.raises(InvalidRequestError):
        service.resolve_range(date(2026, 1, 1), date(2026, 1, 7))


def test_unknown_route_returns_error_envelope(api_client):
    response = api_client.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_wrong_method_returns_error_envelope(api_client):
    response = api_client.post("/api/accuracy")
    assert response.status_code == 405
    assert response.json()["error"]["code"] == "METHOD_NOT_ALLOWED"


def test_cors_does_not_allow_unknown_origin(api_client):
    response = api_client.options(
        "/api/accuracy",
        headers={
            "Origin": "https://not-allowed.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") is None


def test_unavailable_data_maps_to_503():
    service = AnalysisService(
        Settings(), FakeRepository(DataUnavailableError("no snapshot"))
    )
    app.dependency_overrides[get_service] = lambda: service
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/accuracy",
                params={"start_date": "2026-01-01", "end_date": "2026-01-01"},
            )
        assert response.status_code == 503
        assert response.json()["error"]["code"] == "DATA_UNAVAILABLE"
    finally:
        app.dependency_overrides.clear()
