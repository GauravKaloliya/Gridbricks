"""Vercel entrypoint. Serverless filesystems are read-only, so the deployed API
serves the provenance-stamped snapshot instead of fetching and caching locally."""

from __future__ import annotations

import os

os.environ.setdefault("DATA_MODE", "snapshot")
os.environ.setdefault("CACHE_DIR", "/tmp/gridbricks-cache")

from app.main import app  # noqa: E402

__all__ = ["app"]
