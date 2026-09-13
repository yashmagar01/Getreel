"""
Shared pytest fixtures for the Reel Decoder / Getreel backend.

- Adds the backend directory to sys.path so tests can import modules directly.
- Loads .env so API keys / cookie paths are available.
- Provides the ground-truth fixture set from ../TEST_RESULTS_RAW.json.
"""
import os
import sys
import json

import pytest
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(__file__)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

UNIT_ONLY = os.getenv("RUN_LIVE", "").strip().lower() not in ("1", "true", "yes", "on")


@pytest.fixture
def ground_truth() -> list[dict]:
    """The 10-reel ground-truth dataset recorded in TEST_RESULTS_RAW.json."""
    path = os.path.join(BACKEND_DIR, "..", "TEST_RESULTS_RAW.json")
    if not os.path.exists(path):
        pytest.skip("TEST_RESULTS_RAW.json not found — cannot load ground truth")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def pytest_collection_modifyitems(config, items):
    """Auto-skip `live` tests unless RUN_LIVE=1."""
    if not UNIT_ONLY:
        return
    skip_live = pytest.mark.skip(reason="live test — set RUN_LIVE=1 to run")
    for item in items:
        if "live" in item.keywords:
            item.add_marker(skip_live)