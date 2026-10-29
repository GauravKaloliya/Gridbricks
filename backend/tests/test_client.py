from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest
import respx

from app.core.errors import UpstreamError, UpstreamTimeoutError
from app.data.elexon import ElexonClient, _chunk_windows

BASE = "https://example.test/api"
START = datetime(2026, 1, 1, tzinfo=timezone.utc)
END = datetime(2026, 1, 2, tzinfo=timezone.utc)


def make_client(**kwargs) -> ElexonClient:
    return ElexonClient(
        BASE,
        max_retries=kwargs.pop("max_retries", 3),
        retry_backoff_seconds=0.0,
        **kwargs,
    )


@respx.mock
async def test_actuals_use_publish_datetime_params_and_filter_wind():
    route = respx.get(url__regex=r"https://example\.test/api/datasets/FUELHH.*").mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "dataset": "FUELHH",
                    "publishTime": "2026-01-01T00:30:00Z",
                    "startTime": "2026-01-01T00:00:00Z",
                    "settlementDate": "2026-01-01",
                    "settlementPeriod": 1,
                    "fuelType": "WIND",
                    "generation": 12345,
                },
                {
                    "dataset": "FUELHH",
                    "publishTime": "2026-01-01T00:30:00Z",
                    "startTime": "2026-01-01T00:00:00Z",
                    "settlementDate": "2026-01-01",
                    "settlementPeriod": 1,
                    "fuelType": "CCGT",
                    "generation": 20000,
                },
            ],
        )
    )
    bundle = await make_client().fetch_actuals(START, END)
    assert len(bundle.records) == 1
    assert bundle.records[0].fuel_type == "WIND"
    params = route.calls[0].request.url.params
    assert params["publishDateTimeFrom"] == "2025-12-31T00:00:00Z"
    assert params["publishDateTimeTo"] == "2026-01-03T00:00:00Z"
    assert params["format"] == "json"
    assert "from" not in params


@respx.mock
async def test_forecasts_retain_all_revisions_for_target():
    respx.get(url__regex=r"https://example\.test/api/datasets/WINDFOR.*").mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "dataset": "WINDFOR",
                    "publishTime": "2025-12-31T09:30:00Z",
                    "startTime": "2026-01-01T12:00:00Z",
                    "generation": 19824,
                },
                {
                    "dataset": "WINDFOR",
                    "publishTime": "2025-12-31T11:30:00Z",
                    "startTime": "2026-01-01T12:00:00Z",
                    "generation": 19725,
                },
            ],
        )
    )
    bundle = await make_client().fetch_forecasts(START, END)
    assert len(bundle.records) == 2
    assert {record.publish_time.hour for record in bundle.records} == {9, 11}


async def test_chunk_windows_never_exceed_five_days():
    windows = _chunk_windows(START, datetime(2026, 1, 11, tzinfo=timezone.utc), 5)
    assert len(windows) == 2
    assert all((end - start).days <= 5 for start, end in windows)


@respx.mock
async def test_ten_day_fetch_is_split_into_multiple_requests():
    route = respx.get(url__regex=r"https://example\.test/api/datasets/FUELHH.*").mock(
        return_value=httpx.Response(200, json=[])
    )
    await make_client().fetch_actuals(
        START, datetime(2026, 1, 11, tzinfo=timezone.utc)
    )
    assert len(route.calls) >= 3


@respx.mock
async def test_retries_transient_server_error():
    route = respx.get(url__regex=r"https://example\.test/api/datasets/FUELHH.*")
    route.side_effect = [
        httpx.Response(500),
        httpx.Response(
            200,
            json=[
                {
                    "publishTime": "2026-01-01T00:30:00Z",
                    "startTime": "2026-01-01T00:00:00Z",
                    "fuelType": "WIND",
                    "generation": 1,
                }
            ],
        ),
    ]
    bundle = await make_client().fetch_actuals(START, END)
    assert len(bundle.records) == 1
    assert len(route.calls) == 2


@respx.mock
async def test_upstream_400_raises_without_retry():
    route = respx.get(url__regex=r"https://example\.test/api/datasets/FUELHH.*").mock(
        return_value=httpx.Response(400, json={"title": "bad"})
    )
    with pytest.raises(UpstreamError):
        await make_client().fetch_actuals(START, END)
    assert len(route.calls) == 1


@respx.mock
async def test_timeout_raises_after_bounded_retries():
    route = respx.get(url__regex=r"https://example\.test/api/datasets/FUELHH.*").mock(
        side_effect=httpx.TimeoutException("timeout")
    )
    with pytest.raises(UpstreamTimeoutError):
        await make_client(max_retries=2).fetch_actuals(START, END)
    assert len(route.calls) == 2


@respx.mock
async def test_unexpected_schema_raises():
    respx.get(url__regex=r"https://example\.test/api/datasets/FUELHH.*").mock(
        return_value=httpx.Response(200, json={"unexpected": []})
    )
    with pytest.raises(UpstreamError):
        await make_client().fetch_actuals(START, END)


@respx.mock
async def test_invalid_rows_are_skipped_with_warning():
    respx.get(url__regex=r"https://example\.test/api/datasets/FUELHH.*").mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "publishTime": "2026-01-01T00:30:00Z",
                    "startTime": "2026-01-01T00:00:00Z",
                    "fuelType": "WIND",
                    "generation": "NaN",
                },
                {
                    "publishTime": "2026-01-01T01:30:00Z",
                    "startTime": "2026-01-01T01:00:00Z",
                    "fuelType": "WIND",
                    "generation": 100,
                },
                {
                    "publishTime": "2026-01-01T02:30:00Z",
                    "startTime": "2026-01-01T02:00:00Z",
                    "fuelType": "WIND",
                },
            ],
        )
    )
    bundle = await make_client().fetch_actuals(START, END)
    assert len(bundle.records) == 1
    assert any("malformed" in warning for warning in bundle.warnings)
