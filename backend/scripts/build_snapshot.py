"""Fetch real January 2026 Elexon data and write a provenance-stamped snapshot.

Usage (from backend/):
    python scripts/build_snapshot.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import Settings  # noqa: E402
from app.core.timeutils import iter_hours  # noqa: E402
from app.data.elexon import ElexonClient  # noqa: E402
from app.data.store import Dataset, write_dataset_file  # noqa: E402
from app.domain.cutoff import CutoffRule  # noqa: E402
from app.domain.matching import (  # noqa: E402
    aggregate_actuals,
    build_intervals,
    hourly_actual,
)
from app.domain.metrics import compute_metrics, count_intervals  # noqa: E402
from app.schemas.models import IntervalStatus  # noqa: E402


async def main() -> int:
    settings = Settings()
    client = ElexonClient(
        settings.elexon_base_url,
        timeout_seconds=settings.upstream_timeout_seconds,
        max_retries=settings.upstream_max_retries,
    )
    start = settings.analysis_start_utc
    end = settings.analysis_end_utc

    print(f"Fetching real Elexon data {start.isoformat()} .. {end.isoformat()}")
    actuals_bundle, forecasts_bundle = await asyncio.gather(
        client.fetch_actuals(start, end),
        client.fetch_forecasts(start, end),
    )
    actuals = actuals_bundle.records
    forecasts = forecasts_bundle.records

    if not actuals or not forecasts:
        print("Refusing to write a snapshot: upstream returned no usable records.")
        return 2

    retrieved_at = datetime.now(timezone.utc).replace(microsecond=0)
    dataset = Dataset(
        actuals=actuals,
        forecasts=forecasts,
        retrieved_at=retrieved_at,
        data_state="snapshot",
        warnings=[*actuals_bundle.warnings, *forecasts_bundle.warnings],
        note=(
            "Real Elexon BMRS historical snapshot created by "
            "backend/scripts/build_snapshot.py. Not synthetic data."
        ),
    )
    write_dataset_file(
        settings.snapshot_path, dataset, settings.analysis_start, settings.analysis_end
    )

    expected_halves = {
        timestamp
        for hour in iter_hours(start, end)
        for timestamp in (hour, hour.replace(minute=30))
    }
    actual_half_hours = {record.start_time for record in actuals}
    expected_hours = list(iter_hours(start, end))
    indexed = aggregate_actuals(actuals)
    complete_hours = [
        hour
        for hour in expected_hours
        if hourly_actual(hour, indexed).status == IntervalStatus.MATCHED
    ]

    rule = CutoffRule(
        local_time=settings.decision_cutoff_time,
        timezone_name=settings.decision_cutoff_tz,
        inclusive=settings.decision_cutoff_inclusive,
    )
    intervals = build_intervals(
        start=start,
        end_exclusive=end,
        forecasts=forecasts,
        actuals=actuals,
        rule=rule,
    )
    counts = count_intervals(intervals)
    metrics = compute_metrics(intervals)
    target_hours = {record.start_time for record in forecasts}
    revision_counts = Counter(record.start_time for record in forecasts)

    summary = {
        "snapshot_path": str(settings.snapshot_path),
        "snapshot_bytes": settings.snapshot_path.stat().st_size,
        "retrieved_at": retrieved_at.isoformat(),
        "actual_records": len(actuals),
        "expected_half_hours": len(expected_halves),
        "missing_half_hours": len(expected_halves - actual_half_hours),
        "extra_half_hours": len(actual_half_hours - expected_halves),
        "forecast_records": len(forecasts),
        "forecast_target_hours": len(target_hours),
        "expected_hours": len(expected_hours),
        "hours_without_any_forecast": len(set(expected_hours) - target_hours),
        "publication_count": len({record.publish_time for record in forecasts}),
        "revisions_per_target_min": min(revision_counts.values()),
        "revisions_per_target_max": max(revision_counts.values()),
        "complete_hourly_actuals": len(complete_hours),
        "counts": counts.model_dump(),
        "metrics": metrics.model_dump(),
        "warnings": dataset.warnings,
    }
    print(json.dumps(summary, indent=2, default=str))
    print(f"Wrote real snapshot: {settings.snapshot_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
