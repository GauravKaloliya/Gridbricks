from __future__ import annotations

import re
import time
import uuid

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.logging import get_logger

REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")

logger = get_logger("app.request")


def resolve_request_id(value: str | None) -> str:
    candidate = (value or "").strip()
    if _REQUEST_ID_PATTERN.fullmatch(candidate):
        return candidate
    return uuid.uuid4().hex


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Attaches a traceable request id and emits one access log per request."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = resolve_request_id(request.headers.get(REQUEST_ID_HEADER))
        request.state.request_id = request_id
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.exception(
                "request_failed method=%s path=%s duration_ms=%.1f request_id=%s",
                request.method,
                request.url.path,
                duration_ms,
                request_id,
            )
            response = JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "An unexpected server error occurred",
                        "request_id": request_id,
                    }
                },
            )
        else:
            duration_ms = (time.perf_counter() - started) * 1000
            log = logger.debug if request.url.path == "/health" else logger.info
            log(
                "request method=%s path=%s status=%s duration_ms=%.1f request_id=%s",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
                request_id,
            )

        response.headers[REQUEST_ID_HEADER] = request_id
        return response
