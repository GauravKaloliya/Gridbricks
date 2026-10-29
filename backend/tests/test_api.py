from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.api.routes import get_service
from app.core.config import Settings
from app.core.errors import UpstreamError
from app.main import app
from app.services.analysis import AnalysisService

from tests.conftest import FakeRepository


@pytest.fixture
def client(sample_dataset):
    service = AnalysisService(Settings(), FakeRepository(sample_dataset))
    app.dependency_overrides[get_service] = lambda: service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "0.1.0"


def test_meta_documents_cutoff_and_scope(client):
    response = client.get("/api/meta")
    assert response.status_code == 200
    body = response.json()
    assert body["cutoff"]["local_time"] == "09:30"
    assert body["cutoff"]["timezone"] == "Europe/London"
    assert body["cutoff"]["inclusive"] is True
    assert "not" in body["disclaimer"].lower()


def test_accuracy_response_shape_and_metrics(client):
    response = client.get(
        "/api/accuracy",
        params={"start_date": "2026-01-01", "end_date": "2026-01-01"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["counts"]["candidate_count"] == 24
    assert body["counts"]["matched_count"] == 2
    assert body["counts"]["missing_forecast_count"] == 22
    assert body["counts"]["missing_actual_count"] == 0
    assert body["metrics"]["status"] == "ok"
    assert body["metrics"]["matched_count"] == 2
    assert body["metrics"]["mae"] == pytest.approx(10.0)
    assert body["metrics"]["mbe"] == pytest.approx(-1.0)
    assert body["forecast_resolution_minutes"] == 60
    assert body["actual_resolution_minutes"] == 30

    decision = body["decision_support"]
    assert decision["p90_absolute_error"] == pytest.approx(10.8)
    assert decision["p95_absolute_error"] == pytest.approx(10.9)
    assert decision["p90_shortfall"] == pytest.approx(9.9)
    assert decision["underforecast_share_pct"] == pytest.approx(50.0)
    assert decision["lead_time_buckets"][0]["label"] == "Under 18 h"
    assert decision["lead_time_buckets"][0]["matched_count"] == 2
    assert decision["lead_time_buckets"][0]["mae"] == pytest.approx(10.0)
    assert decision["lead_time_buckets"][0]["mean_signed_error"] == pytest.approx(-1.0)
    assert "linear interpolation" in decision["method"]

    first = body["intervals"][0]
    assert first["status"] == "matched"
    assert first["decision_cutoff"].startswith("2025-12-31T09:30")
    assert first["selected_publish_time"].startswith("2025-12-31T09:30")
    assert first["lead_time_hours"] == pytest.approx(14.5)
    assert first["forecast_generation"] == 110.0
    assert first["actual_generation"] == 101.0
    assert first["signed_error"] == 9.0


def test_post_cutoff_forecast_is_not_selected(client):
    response = client.get(
        "/api/forecast-revisions",
        params={"start_time": "2026-01-01T00:00:00Z"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "matched"
    assert body["selected_publish_time"].startswith("2025-12-31T09:30")
    eligible = [item for item in body["revisions"] if item["eligible"]]
    ineligible = [item for item in body["revisions"] if not item["eligible"]]
    assert len(eligible) == 1
    assert eligible[0]["selected"] is True
    assert len(ineligible) == 1
    assert ineligible[0]["publish_time"].startswith("2025-12-31T11:30")


def test_actuals_returns_raw_and_hourly(client):
    response = client.get(
        "/api/actuals",
        params={"start_date": "2026-01-01", "end_date": "2026-01-01"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["records"]) == 4
    assert len(body["hourly"]) == 2
    assert body["hourly"][0]["generation"] == 101.0
    assert body["hourly"][0]["periods_used"] == 2


def test_forecasts_endpoint_returns_intervals(client):
    response = client.get(
        "/api/forecasts",
        params={"start_date": "2026-01-01", "end_date": "2026-01-01"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["intervals"]) == 24
    assert body["cutoff"]["rule"]


def test_invalid_and_reversed_dates(client):
    reversed_response = client.get(
        "/api/accuracy",
        params={"start_date": "2026-01-02", "end_date": "2026-01-01"},
    )
    assert reversed_response.status_code == 400
    assert reversed_response.json()["error"]["code"] == "INVALID_REQUEST"

    outside = client.get(
        "/api/accuracy",
        params={"start_date": "2026-02-01", "end_date": "2026-02-02"},
    )
    assert outside.status_code == 400
    assert outside.json()["error"]["code"] == "OUT_OF_ANALYSIS_PERIOD"

    malformed = client.get(
        "/api/accuracy", params={"start_date": "not-a-date"}
    )
    assert malformed.status_code == 400
    assert malformed.json()["error"]["code"] == "INVALID_REQUEST"


def test_naive_revision_timestamp_is_rejected(client):
    response = client.get(
        "/api/forecast-revisions",
        params={"start_time": "2026-01-01T00:00:00"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_upstream_failure_is_visible_not_empty(sample_dataset):
    service = AnalysisService(
        Settings(), FakeRepository(UpstreamError("Elexon request timed out"))
    )
    app.dependency_overrides[get_service] = lambda: service
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/accuracy",
                params={"start_date": "2026-01-01", "end_date": "2026-01-01"},
            )
        assert response.status_code == 502
        body = response.json()
        assert body["error"]["code"] == "UPSTREAM_UNAVAILABLE"
        assert "traceback" not in response.text.lower()
    finally:
        app.dependency_overrides.clear()


def test_cors_allows_local_frontend(client):
    response = client.options(
        "/api/accuracy",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
