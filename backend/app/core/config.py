from __future__ import annotations

from datetime import date, time, datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Gridbricks Wind Forecast Analytics"
    app_env: str = "development"

    elexon_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    analysis_start: date = date(2026, 1, 1)
    analysis_end: date = date(2026, 1, 31)

    decision_cutoff_time: time = time(9, 30)
    decision_cutoff_tz: str = "Europe/London"
    decision_cutoff_inclusive: bool = True

    data_mode: Literal["live", "snapshot"] = "live"
    snapshot_path: Path = BACKEND_DIR / "data" / "snapshot_january_2026.json"
    cache_dir: Path = BACKEND_DIR / ".cache"
    cache_ttl_seconds: int = 7 * 24 * 60 * 60

    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    upstream_timeout_seconds: float = 30.0
    upstream_max_retries: int = 3
    max_range_days: int = 31

    @field_validator("snapshot_path", mode="after")
    @classmethod
    def _resolve_snapshot_path(cls, value: Path) -> Path:
        return value if value.is_absolute() else (BACKEND_DIR / value).resolve()

    @field_validator("cache_dir", mode="after")
    @classmethod
    def _resolve_cache_dir(cls, value: Path) -> Path:
        return value if value.is_absolute() else (BACKEND_DIR / value).resolve()

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def cutoff_zone(self) -> ZoneInfo:
        return ZoneInfo(self.decision_cutoff_tz)

    @property
    def analysis_start_utc(self) -> datetime:
        return datetime.combine(self.analysis_start, time.min, tzinfo=timezone.utc)

    @property
    def analysis_end_utc(self) -> datetime:
        # Exclusive end: midnight following the last in-scope delivery date.
        return datetime.combine(
            self.analysis_end, time.min, tzinfo=timezone.utc
        ) + timedelta(days=1)


@lru_cache
def get_settings() -> Settings:
    return Settings()
