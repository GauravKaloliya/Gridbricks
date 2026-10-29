from __future__ import annotations

import math
from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.timeutils import ensure_utc, parse_utc_timestamp


class ActualRecord(BaseModel):
    model_config = ConfigDict(frozen=True)

    start_time: datetime
    publish_time: datetime
    generation: float
    fuel_type: Literal["WIND"] = "WIND"
    settlement_date: date | None = None
    settlement_period: int | None = Field(default=None, ge=1, le=50)
    source: str = "Elexon FUELHH"

    @field_validator("start_time", "publish_time", mode="before")
    @classmethod
    def _normalise_timestamp(cls, value):
        if isinstance(value, str):
            return parse_utc_timestamp(value)
        if isinstance(value, datetime):
            return ensure_utc(value)
        raise ValueError("timestamp must be a string or datetime")

    @field_validator("generation", mode="before")
    @classmethod
    def _validate_generation(cls, value):
        if isinstance(value, bool):
            raise ValueError("generation must be numeric")
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("generation must be numeric") from exc
        if not math.isfinite(number):
            raise ValueError("generation must be finite")
        if number < 0:
            raise ValueError("wind generation cannot be negative")
        return number


class ForecastRecord(BaseModel):
    model_config = ConfigDict(frozen=True)

    start_time: datetime
    publish_time: datetime
    generation: float
    source: str = "Elexon WINDFOR"

    @field_validator("start_time", "publish_time", mode="before")
    @classmethod
    def _normalise_timestamp(cls, value):
        if isinstance(value, str):
            return parse_utc_timestamp(value)
        if isinstance(value, datetime):
            return ensure_utc(value)
        raise ValueError("timestamp must be a string or datetime")

    @field_validator("generation", mode="before")
    @classmethod
    def _validate_generation(cls, value):
        if isinstance(value, bool):
            raise ValueError("generation must be numeric")
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("generation must be numeric") from exc
        if not math.isfinite(number):
            raise ValueError("generation must be finite")
        if number < 0:
            raise ValueError("wind generation cannot be negative")
        return number


class IntervalStatus(str, Enum):
    MATCHED = "matched"
    MISSING_FORECAST = "missing_forecast"
    MISSING_ACTUAL = "missing_actual"
    INVALID_RECORD = "invalid_record"
    UPSTREAM_UNAVAILABLE = "upstream_unavailable"


class IntervalResult(BaseModel):
    start_time: datetime
    end_time: datetime
    decision_cutoff: datetime
    selected_publish_time: datetime | None = None
    forecast_generation: float | None = None
    actual_generation: float | None = None
    signed_error: float | None = None
    absolute_error: float | None = None
    status: IntervalStatus
    detail: str | None = None
    actual_periods_used: int = 0
    eligible_forecast_count: int = 0
    lead_time_hours: float | None = None


class AnalysisCounts(BaseModel):
    candidate_count: int
    matched_count: int
    missing_forecast_count: int
    missing_actual_count: int
    invalid_record_count: int
    coverage_pct: float


class AccuracyMetrics(BaseModel):
    status: Literal["ok", "no_data"]
    mae: float | None = None
    rmse: float | None = None
    mbe: float | None = None
    matched_count: int
    unit: str = "MW"
    sign_convention: str = "forecast - actual"


class LeadTimeBucket(BaseModel):
    label: str
    lower_hours: float | None
    upper_hours: float | None
    matched_count: int
    mae: float | None = None
    mean_signed_error: float | None = None


class DecisionSupport(BaseModel):
    p90_absolute_error: float | None = None
    p95_absolute_error: float | None = None
    p90_shortfall: float | None = None
    underforecast_share_pct: float | None = None
    lead_time_buckets: list[LeadTimeBucket] = Field(default_factory=list)
    method: str



class CutoffInfo(BaseModel):
    local_time: str
    timezone: str
    inclusive: bool
    rule: str
    assumption: str


class DataFreshness(BaseModel):
    retrieved_at: datetime | None = None
    data_state: Literal["live", "cache", "snapshot", "snapshot_fallback"]
    source: str
    cache_age_seconds: int | None = None
    is_fallback: bool = False
    note: str | None = None
    warnings: list[str] = Field(default_factory=list)


class AnalysisResponse(BaseModel):
    start_date: date
    end_date: date
    timezone: str
    unit: str = "MW"
    forecast_resolution_minutes: int = 60
    actual_resolution_minutes: int = 30
    matching_rule: str
    cutoff: CutoffInfo
    counts: AnalysisCounts
    metrics: AccuracyMetrics
    decision_support: DecisionSupport
    intervals: list[IntervalResult]
    freshness: DataFreshness


class ForecastsResponse(BaseModel):
    start_date: date
    end_date: date
    cutoff: CutoffInfo
    intervals: list[IntervalResult]
    freshness: DataFreshness


class HourlyActual(BaseModel):
    start_time: datetime
    generation: float
    periods_used: int


class ActualsResponse(BaseModel):
    start_date: date
    end_date: date
    unit: str = "MW"
    actual_resolution_minutes: int = 30
    hourly_resolution_minutes: int = 60
    records: list[ActualRecord]
    hourly: list[HourlyActual]
    freshness: DataFreshness


class ForecastRevision(BaseModel):
    publish_time: datetime
    generation: float
    eligible: bool
    selected: bool


class RevisionsResponse(BaseModel):
    start_time: datetime
    decision_cutoff: datetime
    selected_publish_time: datetime | None
    status: IntervalStatus
    revisions: list[ForecastRevision]
    freshness: DataFreshness


class MetaResponse(BaseModel):
    app_name: str
    analysis_start: date
    analysis_end: date
    timezone: str
    forecast_resolution_minutes: int = 60
    actual_resolution_minutes: int = 30
    cutoff: CutoffInfo
    data_mode: str
    source_attribution: str
    disclaimer: str
