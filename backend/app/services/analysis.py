from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from app.core.config import Settings
from app.core.errors import InvalidRequestError, OutOfScopeError
from app.core.timeutils import ensure_utc, floor_to_hour
from app.data.repository import DatasetRepository, cache_age_seconds
from app.data.store import Dataset
from app.domain.cutoff import CutoffRule, cutoff_for_delivery, is_eligible
from app.domain.matching import aggregate_actuals, build_intervals, hourly_actual
from app.domain.metrics import (
    compute_decision_support,
    compute_metrics,
    count_intervals,
)
from app.domain.selection import select_forecast
from app.schemas.models import (
    ActualsResponse,
    AnalysisResponse,
    CutoffInfo,
    DataFreshness,
    ForecastRevision,
    ForecastsResponse,
    HourlyActual,
    IntervalStatus,
    MetaResponse,
    RevisionsResponse,
)

UTC = timezone.utc

MATCHING_RULE = (
    "WINDFOR forecasts are hourly and FUELHH actuals are half-hourly. Each "
    "forecast hour is paired with the mean of the two half-hourly actuals in "
    "that hour; both halves must be present. No half-hourly forecast values "
    "are invented."
)

CUTOFF_ASSUMPTION = (
    "The challenge does not specify a clock-time cutoff. This implementation "
    "uses 09:30 Europe/London on the calendar day before delivery, inclusive. "
    "The rule is configurable and is an explicit assumption, not a client rule."
)


class AnalysisService:
    def __init__(self, settings: Settings, repository: DatasetRepository) -> None:
        self.settings = settings
        self.repository = repository

    @property
    def cutoff_rule(self) -> CutoffRule:
        return CutoffRule(
            local_time=self.settings.decision_cutoff_time,
            timezone_name=self.settings.decision_cutoff_tz,
            inclusive=self.settings.decision_cutoff_inclusive,
        )

    def cutoff_info(self) -> CutoffInfo:
        operator = "<=" if self.settings.decision_cutoff_inclusive else "<"
        return CutoffInfo(
            local_time=self.settings.decision_cutoff_time.strftime("%H:%M"),
            timezone=self.settings.decision_cutoff_tz,
            inclusive=self.settings.decision_cutoff_inclusive,
            rule=(
                "For each delivery interval, choose the forecast with the latest "
                f"publishTime where publishTime {operator} cutoff."
            ),
            assumption=CUTOFF_ASSUMPTION,
        )

    def resolve_range(
        self, start_date: date | None, end_date: date | None
    ) -> tuple[date, date]:
        start = start_date or self.settings.analysis_start
        end = end_date or min(
            start + timedelta(days=6), self.settings.analysis_end
        )
        if start > end:
            raise InvalidRequestError("start_date must be on or before end_date")
        if start < self.settings.analysis_start or end > self.settings.analysis_end:
            raise OutOfScopeError(
                "Requested dates are outside the supported analysis period "
                f"{self.settings.analysis_start.isoformat()} to "
                f"{self.settings.analysis_end.isoformat()}"
            )
        if (end - start).days + 1 > self.settings.max_range_days:
            raise InvalidRequestError(
                f"Date range must not exceed {self.settings.max_range_days} days"
            )
        return start, end

    def freshness(self, dataset: Dataset) -> DataFreshness:
        return DataFreshness(
            retrieved_at=dataset.retrieved_at,
            data_state=dataset.data_state,
            source="Elexon FUELHH + Elexon WINDFOR",
            cache_age_seconds=cache_age_seconds(dataset),
            is_fallback=dataset.data_state == "snapshot_fallback",
            note=dataset.note or None,
            warnings=dataset.warnings,
        )

    async def analyze(
        self, start_date: date | None = None, end_date: date | None = None
    ) -> AnalysisResponse:
        start, end = self.resolve_range(start_date, end_date)
        start_dt = datetime.combine(start, time.min, tzinfo=UTC)
        end_exclusive = datetime.combine(end, time.min, tzinfo=UTC) + timedelta(days=1)

        dataset = await self.repository.get_dataset()
        actuals = [
            record
            for record in dataset.actuals
            if start_dt <= record.start_time < end_exclusive
        ]
        forecasts = [
            record
            for record in dataset.forecasts
            if start_dt <= record.start_time < end_exclusive
        ]

        intervals = build_intervals(
            start=start_dt,
            end_exclusive=end_exclusive,
            forecasts=forecasts,
            actuals=actuals,
            rule=self.cutoff_rule,
        )
        metrics = compute_metrics(intervals)
        counts = count_intervals(intervals)

        return AnalysisResponse(
            start_date=start,
            end_date=end,
            timezone=self.settings.decision_cutoff_tz,
            forecast_resolution_minutes=60,
            actual_resolution_minutes=30,
            matching_rule=MATCHING_RULE,
            cutoff=self.cutoff_info(),
            counts=counts,
            metrics=metrics,
            decision_support=compute_decision_support(intervals),
            intervals=intervals,
            freshness=self.freshness(dataset),
        )

    async def forecasts(
        self, start_date: date | None = None, end_date: date | None = None
    ) -> ForecastsResponse:
        analysis = await self.analyze(start_date, end_date)
        return ForecastsResponse(
            start_date=analysis.start_date,
            end_date=analysis.end_date,
            cutoff=analysis.cutoff,
            intervals=analysis.intervals,
            freshness=analysis.freshness,
        )

    async def actuals(
        self, start_date: date | None = None, end_date: date | None = None
    ) -> ActualsResponse:
        start, end = self.resolve_range(start_date, end_date)
        start_dt = datetime.combine(start, time.min, tzinfo=UTC)
        end_exclusive = datetime.combine(end, time.min, tzinfo=UTC) + timedelta(days=1)

        dataset = await self.repository.get_dataset()
        records = sorted(
            (
                record
                for record in dataset.actuals
                if start_dt <= record.start_time < end_exclusive
            ),
            key=lambda record: record.start_time,
        )
        indexed = aggregate_actuals(records)
        hourly: list[HourlyActual] = []
        cursor = start_dt
        while cursor < end_exclusive:
            aggregate = hourly_actual(cursor, indexed)
            if (
                aggregate.status == IntervalStatus.MATCHED
                and aggregate.generation is not None
            ):
                hourly.append(
                    HourlyActual(
                        start_time=cursor,
                        generation=aggregate.generation,
                        periods_used=aggregate.periods_used,
                    )
                )
            cursor += timedelta(hours=1)

        return ActualsResponse(
            start_date=start,
            end_date=end,
            records=records,
            hourly=hourly,
            freshness=self.freshness(dataset),
        )

    async def revisions(self, start_time: datetime) -> RevisionsResponse:
        if start_time.tzinfo is None or start_time.utcoffset() is None:
            raise InvalidRequestError("start_time must include a timezone offset")
        target = ensure_utc(start_time)
        if target != floor_to_hour(target):
            raise InvalidRequestError("start_time must align to a whole hour")
        if not (
            self.settings.analysis_start_utc
            <= target
            < self.settings.analysis_end_utc
        ):
            raise OutOfScopeError(
                "start_time is outside the supported analysis period"
            )

        dataset = await self.repository.get_dataset()
        cutoff = cutoff_for_delivery(target, self.cutoff_rule)
        versions = sorted(
            (
                record
                for record in dataset.forecasts
                if record.start_time == target
            ),
            key=lambda record: record.publish_time,
        )
        outcome = select_forecast(
            versions,
            target,
            cutoff,
            inclusive=self.settings.decision_cutoff_inclusive,
        )
        selected_publish = (
            outcome.selected.publish_time if outcome.selected is not None else None
        )
        revisions = [
            ForecastRevision(
                publish_time=record.publish_time,
                generation=record.generation,
                eligible=is_eligible(
                    record.publish_time, cutoff, self.settings.decision_cutoff_inclusive
                ),
                selected=(
                    selected_publish is not None
                    and record.publish_time == selected_publish
                    and record.generation == outcome.selected.generation
                ),
            )
            for record in versions
        ]
        return RevisionsResponse(
            start_time=target,
            decision_cutoff=cutoff,
            selected_publish_time=selected_publish,
            status=outcome.status,
            revisions=revisions,
            freshness=self.freshness(dataset),
        )

    async def meta(self) -> MetaResponse:
        return MetaResponse(
            app_name=self.settings.app_name,
            analysis_start=self.settings.analysis_start,
            analysis_end=self.settings.analysis_end,
            timezone=self.settings.decision_cutoff_tz,
            cutoff=self.cutoff_info(),
            data_mode=self.settings.data_mode,
            source_attribution=(
                "Actuals: Elexon BMRS FUELHH (WIND). Forecasts: Elexon BMRS "
                "WINDFOR. Public data, used under the Elexon BMRS terms."
            ),
            disclaimer=(
                "This tool analyses national wind forecast accuracy only. It "
                "does not calculate an optimal procurement volume and does not "
                "use demand, prices, other generation, or contract data."
            ),
        )
