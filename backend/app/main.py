from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import configure_logging, get_logger
from app.core.request_context import RequestContextMiddleware

configure_logging()
logger = get_logger(__name__)
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "Wind-generation forecast analytics for day-ahead procurement. "
        "Elexon FUELHH actuals and WINDFOR forecasts, January 2026. "
        "Forecast selection is cutoff-aware and prevents look-ahead bias. "
        "Every response carries an X-Request-ID header; error envelopes repeat "
        "it as request_id so a failed call can be traced in the server log."
    ),
    openapi_tags=[
        {
            "name": "system",
            "description": "Liveness, service metadata, and scope information.",
        },
        {
            "name": "analysis",
            "description": (
                "Cutoff-aware forecast selection and accuracy metrics. Dates are "
                "inclusive delivery dates interpreted in Europe/London."
            ),
        },
    ],
)

# Added before CORS so CORS becomes the outer layer and decorates error responses.
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


def _error_body(
    request: Request, code: str, message: str, details: object | None = None
) -> dict:
    error: dict[str, object] = {
        "code": code,
        "message": message,
        "request_id": getattr(request.state, "request_id", None),
    }
    if details is not None:
        error["details"] = details
    return {"error": error}


@app.exception_handler(AppError)
async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(request, exc.code, exc.message, exc.details),
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    if errors:
        first = errors[0]
        location = ".".join(str(part) for part in first.get("loc", [])[1:]) or "request"
        message = f"Invalid {location}: {first.get('msg', 'invalid value')}"
    else:
        message = "Invalid request"
    return JSONResponse(
        status_code=400,
        content=_error_body(request, "INVALID_REQUEST", message),
    )


@app.exception_handler(StarletteHTTPException)
async def handle_http_error(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    code = {
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
    }.get(exc.status_code, "HTTP_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(request, code, str(exc.detail)),
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content=_error_body(
            request, "INTERNAL_ERROR", "An unexpected server error occurred"
        ),
    )


@app.get("/", tags=["system"])
async def root() -> dict:
    return {
        "name": settings.app_name,
        "docs": "/docs",
        "health": "/health",
        "analysis_period": [
            settings.analysis_start.isoformat(),
            settings.analysis_end.isoformat(),
        ],
    }


app.include_router(router)
