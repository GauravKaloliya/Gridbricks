from __future__ import annotations

from datetime import datetime, timezone

from app.data.store import Dataset, read_dataset_file, write_dataset_file

from tests.conftest import make_actual, make_forecast


def test_dataset_roundtrip_preserves_values_and_provenance(tmp_path):
    dataset = Dataset(
        actuals=[make_actual("2026-01-01T00:00:00Z", 100.0)],
        forecasts=[
            make_forecast("2026-01-01T00:00:00Z", "2025-12-31T09:30:00Z", 110.0)
        ],
        retrieved_at=datetime(2026, 10, 29, 5, 44, tzinfo=timezone.utc),
        data_state="snapshot",
        warnings=["example warning"],
        note="real test note",
    )
    path = tmp_path / "snapshot.json"
    write_dataset_file(path, dataset, analysis_start=datetime(2026, 1, 1).date(), analysis_end=datetime(2026, 1, 31).date())

    loaded = read_dataset_file(path, data_state="snapshot")
    assert len(loaded.actuals) == 1
    assert len(loaded.forecasts) == 1
    assert loaded.actuals[0].generation == 100.0
    assert loaded.forecasts[0].generation == 110.0
    assert loaded.retrieved_at == dataset.retrieved_at
    assert loaded.warnings == ["example warning"]
    assert loaded.note == "real test note"
    assert loaded.data_state == "snapshot"
