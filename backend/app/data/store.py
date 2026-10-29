from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

from app.core.timeutils import parse_utc_timestamp
from app.schemas.models import ActualRecord, ForecastRecord

DATA_STATE = str


@dataclass
class Dataset:
    actuals: list[ActualRecord]
    forecasts: list[ForecastRecord]
    retrieved_at: datetime
    data_state: DATA_STATE
    warnings: list[str] = field(default_factory=list)
    note: str = ""


def dataset_to_payload(dataset: Dataset, analysis_start: date, analysis_end: date) -> dict:
    return {
        "metadata": {
            "created_at": dataset.retrieved_at.isoformat().replace("+00:00", "Z"),
            "retrieved_at": dataset.retrieved_at.isoformat().replace("+00:00", "Z"),
            "analysis_start": analysis_start.isoformat(),
            "analysis_end": analysis_end.isoformat(),
            "unit": "MW",
            "actual_resolution_minutes": 30,
            "forecast_resolution_minutes": 60,
            "actual_source": "Elexon BMRS FUELHH (fuelType=WIND)",
            "forecast_source": "Elexon BMRS WINDFOR",
            "actual_endpoint": "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH",
            "forecast_endpoint": "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR",
            "attribution": "Contains public Elexon BMRS data (FUELHH and WINDFOR).",
            "warnings": dataset.warnings,
            "note": dataset.note,
        },
        "actuals": [record.model_dump(mode="json") for record in dataset.actuals],
        "forecasts": [record.model_dump(mode="json") for record in dataset.forecasts],
    }


def dataset_from_payload(
    payload: dict, *, data_state: str, note_override: str | None = None
) -> Dataset:
    metadata = payload.get("metadata")
    if not isinstance(metadata, dict):
        raise ValueError("dataset file is missing metadata")
    retrieved_raw = metadata.get("retrieved_at") or metadata.get("created_at")
    if not retrieved_raw:
        raise ValueError("dataset file is missing a retrieval timestamp")
    retrieved_at = parse_utc_timestamp(retrieved_raw)
    actuals = [ActualRecord.model_validate(row) for row in payload.get("actuals", [])]
    forecasts = [
        ForecastRecord.model_validate(row) for row in payload.get("forecasts", [])
    ]
    if not actuals or not forecasts:
        raise ValueError("dataset file contains no actual or forecast records")
    warnings = [str(item) for item in metadata.get("warnings", [])]
    note = note_override or str(metadata.get("note") or "")
    return Dataset(
        actuals=actuals,
        forecasts=forecasts,
        retrieved_at=retrieved_at,
        data_state=data_state,
        warnings=warnings,
        note=note,
    )


def read_dataset_file(
    path: Path, *, data_state: str, note_override: str | None = None
) -> Dataset:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return dataset_from_payload(payload, data_state=data_state, note_override=note_override)


def write_dataset_file(
    path: Path, dataset: Dataset, analysis_start: date, analysis_end: date
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = dataset_to_payload(dataset, analysis_start, analysis_end)
    fd, temp_name = tempfile.mkstemp(
        prefix=".dataset-", suffix=".json", dir=str(path.parent)
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, separators=(",", ":"))
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise
