from __future__ import annotations

import re

import pytest
from fastapi.testclient import TestClient

from app.api.routes import get_service
from app.core.config import Settings
from app.main import app
from app.services.analysis import AnalysisService

from tests.conftest import FakeRepository

GENERATED_ID = re.compile(r"^[0-9a-f]{32}$")


@pytest.fixture
def client(sample_dataset):
    service = AnalysisService(Settings(), FakeRepository(sample_dataset))
    app.dependency_overrides[get_service] = lambda: service
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_request_id_is_generated_when_absent(client):
    response = client.get("/health")
    request_id = response.headers.get("x-request-id")
    assert request_id is not None
    assert GENERATED_ID.fullmatch(request_id)


def test_valid_request_id_is_preserved(client):
    response = client.get("/health", headers={"X-Request-ID": "edge-proxy.42:abc"})
    assert response.headers["x-request-id"] == "edge-proxy.42:abc"


@pytest.mark.parametrize(
    "supplied",
    ["", "has spaces", "semi;colon", "x" * 129, "<script>alert(1)</script>"],
)
def test_invalid_request_id_is_replaced(client, supplied):
    response = client.get("/health", headers={"X-Request-ID": supplied})
    assert GENERATED_ID.fullmatch(response.headers["x-request-id"])


def test_error_envelope_repeats_the_request_id(client):
    response = client.get(
        "/api/accuracy",
        params={"start_date": "2026-02-01", "end_date": "2026-02-02"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "OUT_OF_ANALYSIS_PERIOD"
    assert body["error"]["request_id"] == response.headers["x-request-id"]


def test_cors_exposes_the_request_id_header(client):
    response = client.get("/health", headers={"Origin": "http://localhost:5173"})
    exposed = response.headers["access-control-expose-headers"]
    assert "X-Request-ID" in exposed


def test_unexpected_error_returns_traceable_envelope_without_details(sample_dataset):
    service = AnalysisService(Settings(), FakeRepository(RuntimeError("boom")))
    app.dependency_overrides[get_service] = lambda: service
    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/accuracy",
                params={"start_date": "2026-01-01", "end_date": "2026-01-01"},
                headers={"X-Request-ID": "trace-500"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 500
    assert response.headers["x-request-id"] == "trace-500"
    body = response.json()
    assert body["error"]["code"] == "INTERNAL_ERROR"
    assert body["error"]["request_id"] == "trace-500"
    assert "boom" not in response.text
    assert "traceback" not in response.text.lower()
