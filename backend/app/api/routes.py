from __future__ import annotations

from datetime import date, datetime, timezone
from functools import lru_cache

from fastapi import APIRouter, Depends, Query

from app.core.config import get_settings
from app.data.repository import DatasetRepository
from app.schemas.models import (
    ActualsResponse,
    AnalysisResponse,
    ForecastsResponse,
    MetaResponse,
    RevisionsResponse,
)
from app.services.analysis import AnalysisService

router = APIRouter()


@lru_cache
def get_repository() -> DatasetRepository:
    return DatasetRepository(get_settings())


@lru_cache
def get_service() -> AnalysisService:
    return AnalysisService(get_settings(), get_repository())


@router.get("/health", tags=["system"])
async def health() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data_mode": settings.data_mode,
    }


@router.get("/api/meta", response_model=MetaResponse, tags=["analysis"])
async def meta(service: AnalysisService = Depends(get_service)) -> MetaResponse:
    return await service.meta()


@router.get("/api/accuracy", response_model=AnalysisResponse, tags=["analysis"])
async def accuracy(
    start_date: date | None = Query(default=None, description="Inclusive delivery date"),
    end_date: date | None = Query(default=None, description="Inclusive delivery date"),
    service: AnalysisService = Depends(get_service),
) -> AnalysisResponse:
    return await service.analyze(start_date, end_date)


@router.get("/api/forecasts", response_model=ForecastsResponse, tags=["analysis"])
async def forecasts(
    start_date: date | None = Query(default=None, description="Inclusive delivery date"),
    end_date: date | None = Query(default=None, description="Inclusive delivery date"),
    service: AnalysisService = Depends(get_service),
) -> ForecastsResponse:
    return await service.forecasts(start_date, end_date)


@router.get("/api/actuals", response_model=ActualsResponse, tags=["analysis"])
async def actuals(
    start_date: date | None = Query(default=None, description="Inclusive delivery date"),
    end_date: date | None = Query(default=None, description="Inclusive delivery date"),
    service: AnalysisService = Depends(get_service),
) -> ActualsResponse:
    return await service.actuals(start_date, end_date)


@router.get(
    "/api/forecast-revisions",
    response_model=RevisionsResponse,
    tags=["analysis"],
)
async def forecast_revisions(
    start_time: datetime = Query(
        description="Target delivery hour, ISO-8601 with timezone (e.g. 2026-01-01T00:00:00Z)"
    ),
    service: AnalysisService = Depends(get_service),
) -> RevisionsResponse:
    return await service.revisions(start_time)
