from __future__ import annotations

from datetime import datetime, timezone, timedelta

UTC = timezone.utc


def parse_utc_timestamp(value: str) -> datetime:
    """Parse an Elexon ISO-8601 timestamp and normalise it to UTC.

    Elexon emits values such as ``2026-01-01T00:00:00Z``. Naive timestamps are
    rejected rather than silently treated as UTC.
    """
    if not isinstance(value, str) or not value.strip():
        raise ValueError("timestamp must be a non-empty string")
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("timestamp must include a timezone")
    return parsed.astimezone(UTC)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("datetime must be timezone-aware")
    return value.astimezone(UTC)


def floor_to_hour(value: datetime) -> datetime:
    value = ensure_utc(value)
    return value.replace(minute=0, second=0, microsecond=0)


def iter_hours(start: datetime, end_exclusive: datetime):
    cursor = floor_to_hour(start)
    end = ensure_utc(end_exclusive)
    while cursor < end:
        yield cursor
        cursor += timedelta(hours=1)
