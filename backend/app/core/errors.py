from __future__ import annotations

from typing import Any


class AppError(Exception):
    status_code = 400
    code = "APP_ERROR"

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        self.details = details


class InvalidRequestError(AppError):
    status_code = 400
    code = "INVALID_REQUEST"


class OutOfScopeError(AppError):
    status_code = 400
    code = "OUT_OF_ANALYSIS_PERIOD"


class UpstreamError(AppError):
    status_code = 502
    code = "UPSTREAM_UNAVAILABLE"


class UpstreamTimeoutError(UpstreamError):
    status_code = 504
    code = "UPSTREAM_TIMEOUT"


class DataUnavailableError(AppError):
    status_code = 503
    code = "DATA_UNAVAILABLE"
