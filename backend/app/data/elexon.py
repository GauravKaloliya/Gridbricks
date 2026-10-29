from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import httpx

from app.core.errors import UpstreamError, UpstreamTimeoutError
from app.core.logging import get_logger
from app.core.timeutils import ensure_utc
from app.schemas.models import ActualRecord, ForecastRecord

logger = get_logger(__name__)

CHUNK_DAYS = 5
RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}


@dataclass
class FetchBundle:
    records: list
    warnings: list[str] = field(default_factory=list)


class ElexonClient:
    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = 30.0,
        max_retries: int = 3,
        retry_backoff_seconds: float = 0.5,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.max_retries = max(1, max_retries)
        self.retry_backoff_seconds = retry_backoff_seconds

    async def fetch_actuals(
        self, start: datetime, end_exclusive: datetime
    ) -> FetchBundle:
        """Fetch FUELHH WIND actuals whose target interval is in the range.

        The upstream filter is by publication time, so the request window is
        padded on both sides and records are filtered by ``startTime`` locally.
        """
        start = ensure_utc(start)
        end_exclusive = ensure_utc(end_exclusive)
        publish_from = start - timedelta(days=1)
        publish_to = end_exclusive + timedelta(days=1)

        rows, warnings = await self._fetch_rows("FUELHH", publish_from, publish_to)
        records: list[ActualRecord] = []
        seen: set[tuple] = set()
        skipped = 0

        for row in rows:
            if str(row.get("fuelType", "")).upper() != "WIND":
                continue
            try:
                record = ActualRecord(
                    start_time=row["startTime"],
                    publish_time=row["publishTime"],
                    generation=row["generation"],
                    settlement_date=row.get("settlementDate"),
                    settlement_period=row.get("settlementPeriod"),
                )
            except (KeyError, ValueError, TypeError):
                skipped += 1
                continue
            if not (start <= record.start_time < end_exclusive):
                continue
            key = (record.start_time, record.publish_time, record.generation)
            if key in seen:
                continue
            seen.add(key)
            records.append(record)

        if skipped:
            warnings.append(f"Skipped {skipped} malformed FUELHH WIND record(s)")
        records.sort(key=lambda record: record.start_time)
        logger.info("FUELHH WIND records=%s range=%s..%s", len(records), start, end_exclusive)
        return FetchBundle(records=records, warnings=warnings)

    async def fetch_forecasts(
        self, start: datetime, end_exclusive: datetime
    ) -> FetchBundle:
        """Fetch WINDFOR revisions for target intervals in the range.

        Publications are filtered upstream by publication time. The window
        starts two days before the first delivery so earlier eligible revisions
        are retained, and runs one day past the end so post-cutoff revisions are
        available for the explorer without ever being selected.
        """
        start = ensure_utc(start)
        end_exclusive = ensure_utc(end_exclusive)
        publish_from = start - timedelta(days=2)
        publish_to = end_exclusive + timedelta(days=1)

        rows, warnings = await self._fetch_rows("WINDFOR", publish_from, publish_to)
        records: list[ForecastRecord] = []
        seen: set[tuple] = set()
        skipped = 0

        for row in rows:
            try:
                record = ForecastRecord(
                    start_time=row["startTime"],
                    publish_time=row["publishTime"],
                    generation=row["generation"],
                )
            except (KeyError, ValueError, TypeError):
                skipped += 1
                continue
            if not (start <= record.start_time < end_exclusive):
                continue
            key = (record.start_time, record.publish_time, record.generation)
            if key in seen:
                continue
            seen.add(key)
            records.append(record)

        if skipped:
            warnings.append(f"Skipped {skipped} malformed WINDFOR record(s)")
        records.sort(key=lambda record: (record.start_time, record.publish_time))
        logger.info(
            "WINDFOR records=%s range=%s..%s", len(records), start, end_exclusive
        )
        return FetchBundle(records=records, warnings=warnings)

    async def _fetch_rows(
        self, dataset: str, publish_from: datetime, publish_to: datetime
    ) -> tuple[list[dict], list[str]]:
        warnings: list[str] = []
        rows: list[dict] = []
        headers = {"Accept": "application/json"}

        async with httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout_seconds,
            headers=headers,
        ) as client:
            for chunk_start, chunk_end in _chunk_windows(
                publish_from, publish_to, CHUNK_DAYS
            ):
                payload = await self._get_with_retry(
                    client,
                    f"/datasets/{dataset}",
                    {
                        "publishDateTimeFrom": _format_api_datetime(chunk_start),
                        "publishDateTimeTo": _format_api_datetime(chunk_end),
                        "format": "json",
                    },
                )
                chunk_rows = _extract_rows(payload)
                rows.extend(chunk_rows)

        if not rows:
            warnings.append(f"{dataset} returned no rows for the requested window")
        return rows, warnings

    async def _get_with_retry(
        self, client: httpx.AsyncClient, path: str, params: dict
    ) -> object:
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = await client.get(path, params=params)
                if response.status_code in RETRYABLE_STATUS and attempt < self.max_retries:
                    logger.warning(
                        "Elexon %s HTTP %s, retrying (%s/%s)",
                        path,
                        response.status_code,
                        attempt,
                        self.max_retries,
                    )
                    await asyncio.sleep(self.retry_backoff_seconds * attempt)
                    continue
                if response.status_code >= 400:
                    logger.warning("Elexon %s HTTP %s", path, response.status_code)
                    raise UpstreamError(
                        f"Elexon rejected the request (HTTP {response.status_code})"
                    )
                try:
                    return response.json()
                except ValueError as exc:
                    raise UpstreamError(
                        "Elexon returned a response that was not valid JSON"
                    ) from exc
            except httpx.TimeoutException as exc:
                last_error = exc
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_backoff_seconds * attempt)
                    continue
                raise UpstreamTimeoutError("Elexon request timed out") from exc
            except httpx.HTTPError as exc:
                last_error = exc
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_backoff_seconds * attempt)
                    continue
                raise UpstreamError("Could not reach the Elexon API") from exc

        raise UpstreamError("Elexon request failed") from last_error


def _extract_rows(payload: object) -> list[dict]:
    if isinstance(payload, list):
        rows = payload
    elif isinstance(payload, dict) and isinstance(payload.get("data"), list):
        rows = payload["data"]
    else:
        raise UpstreamError("Elexon returned an unexpected response schema")
    if not all(isinstance(row, dict) for row in rows):
        raise UpstreamError("Elexon response rows were not JSON objects")
    return rows


def _chunk_windows(
    start: datetime, end: datetime, chunk_days: int
) -> list[tuple[datetime, datetime]]:
    windows: list[tuple[datetime, datetime]] = []
    cursor = start
    step = timedelta(days=chunk_days)
    while cursor < end:
        chunk_end = min(cursor + step, end)
        windows.append((cursor, chunk_end))
        cursor = chunk_end
    return windows


def _format_api_datetime(value: datetime) -> str:
    return ensure_utc(value).strftime("%Y-%m-%dT%H:%M:%SZ")
