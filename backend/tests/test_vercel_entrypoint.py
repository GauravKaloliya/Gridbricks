from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_vercel_entrypoint_boots_in_snapshot_mode() -> None:
    env = os.environ.copy()
    env.pop("DATA_MODE", None)
    env.pop("CACHE_DIR", None)
    script = (
        "from app.vercel import app\n"
        "from app.core.config import get_settings\n"
        "from fastapi.testclient import TestClient\n"
        "settings = get_settings()\n"
        "response = TestClient(app).get('/health')\n"
        "print(settings.data_mode, settings.cache_dir, response.status_code)\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", script],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stdout.strip().split(" ") == [
        "snapshot",
        "/tmp/gridbricks-cache",
        "200",
    ]
