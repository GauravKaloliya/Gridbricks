from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone

from app.core.config import Settings
from app.core.errors import DataUnavailableError, UpstreamError
from app.core.logging import get_logger
from app.data.elexon import ElexonClient
from app.data.store import Dataset, read_dataset_file, write_dataset_file

logger = get_logger(__name__)

class DatasetRepository:
    def __init__(self, settings: Settings, client: ElexonClient | None = None) -> None:
        self.settings = settings
        self.client = client or ElexonClient(
            settings.elexon_base_url,
            timeout_seconds=settings.upstream_timeout_seconds,
            max_retries=settings.upstream_max_retries,
        )
        self._dataset: Dataset | None = None
        self._lock = asyncio.Lock()
        self._last_attempt_error: str | None = None

    @property
    def cache_path(self):
        name = (
            f"dataset_{self.settings.analysis_start.isoformat()}_"
            f"{self.settings.analysis_end.isoformat()}.json"
        )
        return self.settings.cache_dir / name

    async def get_dataset(self, *, force_refresh: bool = False) -> Dataset:
        async with self._lock:
            if self._dataset is not None and not force_refresh:
                return self._dataset

            if self.settings.data_mode == "snapshot":
                dataset = self._load_snapshot(
                    state="snapshot",
                    note="Serving the stored real Elexon historical snapshot",
                )
                self._dataset = dataset
                return dataset

            if not force_refresh:
                cached = self._load_fresh_cache()
                if cached is not None:
                    self._dataset = cached
                    return cached

            try:
                dataset = await self._fetch_live()
            except Exception as exc:  # noqa: BLE001 - fall back to real snapshot
                message = exc.message if hasattr(exc, "message") else str(exc)
                self._last_attempt_error = message
                logger.warning("Live Elexon retrieval failed: %s", message)
                dataset = self._load_snapshot(
                    state="snapshot_fallback",
                    note=(
                        "Live Elexon retrieval failed; serving the stored real "
                        f"historical snapshot. Upstream error: {message}"
                    ),
                )

            self._dataset = dataset
            return dataset

    async def _fetch_live(self) -> Dataset:
        start = self.settings.analysis_start_utc
        end = self.settings.analysis_end_utc
        logger.info("Fetching live Elexon data for %s..%s", start, end)
        actuals_bundle, forecasts_bundle = await asyncio.gather(
            self.client.fetch_actuals(start, end),
            self.client.fetch_forecasts(start, end),
        )
        if not actuals_bundle.records or not forecasts_bundle.records:
            raise UpstreamError(
                "Elexon returned no usable actual or forecast records for the analysis period"
            )
        warnings = [*actuals_bundle.warnings, *forecasts_bundle.warnings]
        dataset = Dataset(
            actuals=actuals_bundle.records,
            forecasts=forecasts_bundle.records,
            retrieved_at=datetime.now(timezone.utc).replace(microsecond=0),
            data_state="live",
            warnings=warnings,
            note="Fetched live from the Elexon BMRS API",
        )
        write_dataset_file(
            self.cache_path, dataset, self.settings.analysis_start, self.settings.analysis_end
        )
        logger.info(
            "Live dataset stored: actuals=%s forecasts=%s",
            len(dataset.actuals),
            len(dataset.forecasts),
        )
        return dataset

    def _load_fresh_cache(self) -> Dataset | None:
        path = self.cache_path
        if not path.exists():
            return None
        try:
            dataset = read_dataset_file(
                path,
                data_state="cache",
                note_override="Loaded from the local disk cache of real Elexon data",
            )
        except Exception as exc:  # noqa: BLE001 - corrupt cache should not break startup
            logger.warning("Ignoring unreadable cache %s: %s", path, exc)
            return None
        age = (datetime.now(timezone.utc) - dataset.retrieved_at).total_seconds()
        if age > self.settings.cache_ttl_seconds:
            return None
        return dataset

    def _load_snapshot(self, *, state: str, note: str) -> Dataset:
        path = self.settings.snapshot_path
        if not path.exists():
            message = (
                f"No stored snapshot at {path}"
                if self._last_attempt_error is None
                else f"No stored snapshot at {path}; last upstream error: {self._last_attempt_error}"
            )
            raise DataUnavailableError(message)
        try:
            return read_dataset_file(path, data_state=state, note_override=note)
        except (OSError, ValueError) as exc:
            raise DataUnavailableError(
                f"Stored snapshot at {path} could not be read: {exc}"
            ) from exc


def cache_age_seconds(dataset: Dataset) -> int:
    age = time.time() - dataset.retrieved_at.timestamp()
    return max(0, int(age))
