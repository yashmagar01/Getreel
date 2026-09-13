"""
Live replay harness — measures the ACTUAL link resolution rate against the
10 ground-truth reels from TEST_RESULTS_RAW.json.

Why this exists:
  The master plan claims 22% → 93% across Phases 2-4, but TEST_RESULTS.md's
  "After Fixes" tables were never filled in. This harness replays the recorded
  info/transcript fixtures through the CURRENT resolver and reports the real
  per-layer hit rate — no downloading, no waiting on full reels.

Run:
  venv/Scripts/python.exe -m pytest test_replay_harness.py -v     # skips (needs RUN_LIVE=1)
  RUN_LIVE=1 venv/Scripts/python.exe -m pytest test_replay_harness.py -v

Or standalone:
  RUN_LIVE=1 venv/Scripts/python.exe test_replay_harness.py
"""
import os
import sys
import json
import asyncio
import logging

sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(level=logging.WARNING, format="%(message)s")
logger = logging.getLogger("replay")

import pytest
from link_finder import find_promised_link, is_junk_url


def _load_fixtures() -> list[dict]:
    path = os.path.join(os.path.dirname(__file__), "..", "TEST_RESULTS_RAW.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _to_info(fix: dict) -> dict:
    """Build the info dict the resolver expects from the recorded summary."""
    s = fix.get("info_summary") or {}
    info = {k: v for k, v in s.items() if v is not None}
    # Restore fields the resolver needs that may be missing from the summary
    info.setdefault("description", s.get("description") or "")
    info.setdefault("uploader", s.get("uploader") or "")
    info.setdefault("uploader_id", s.get("uploader_id") or "")
    info.setdefault("webpage_url", fix.get("reel_url") or "")
    return info


def _to_concept(fix: dict) -> dict:
    """A minimal grounded concept — never hallucinated, derived from the caption."""
    desc = (fix.get("info_summary") or {}).get("description") or ""
    return {
        "topic": desc[:80] or "unknown",
        "tools_mentioned": [],
        "what_creator_withholds": {},
        "target_audience": "",
    }


def _domain(url: str) -> str:
    from urllib.parse import urlparse
    return urlparse(url).netloc.lower().replace("www.", "")


async def _resolve_one(fix: dict) -> dict:
    info = _to_info(fix)
    transcript = fix.get("transcript_preview") or ""
    concept = _to_concept(fix)
    started = asyncio.get_event_loop().time()
    result = await find_promised_link(
        info, transcript, concept,
        caption=info.get("description", ""),
        comments=[],
    )
    elapsed = round(asyncio.get_event_loop().time() - started, 1)
    return {
        "reel_url": fix.get("reel_url"),
        "expected_layer": fix.get("expected_layer"),
        "expected_domain": fix.get("expected_domain_hint"),
        "winner_layer": (result or {}).get("winner_layer"),
        "url": (result or {}).get("url"),
        "confidence": (result or {}).get("confidence"),
        "elapsed_s": elapsed,
        "junk": is_junk_url((result or {}).get("url", "")) if result else None,
    }


async def run_all() -> list[dict]:
    fixtures = _load_fixtures()
    results = []
    for fix in fixtures:
        try:
            row = await _resolve_one(fix)
        except Exception as e:
            row = {
                "reel_url": fix.get("reel_url"),
                "expected_layer": fix.get("expected_layer"),
                "expected_domain": fix.get("expected_domain_hint"),
                "winner_layer": "ERROR",
                "url": None,
                "confidence": None,
                "elapsed_s": 0,
                "error": f"{type(e).__name__}: {e}",
            }
        results.append(row)
        print(_fmt_row(row))
    print("\n" + _fmt_summary(results))
    return results


def _fmt_row(r: dict) -> str:
    status = "✅" if _is_match(r) else "❌"
    url = r.get("url") or "—"
    err = f"  ⚠ {r.get('error')}" if r.get("error") else ""
    return (
        f"{status} [{r.get('winner_layer') or 'NULL':<16}] "
        f"expect={str(r.get('expected_layer')):<15} "
        f"domain={str(r.get('expected_domain')):<20} "
        f"→ {url}  ({r.get('elapsed_s')}s){err}"
    )


def _is_match(r: dict) -> bool:
    """Domain-level match: the resolved URL's domain contains the expected domain."""
    if not r.get("url") or r.get("junk"):
        return False
    expected = (r.get("expected_domain") or "").lower()
    if not expected or expected == "any":
        return r.get("url") is not None
    return expected in _domain(r["url"])


def _fmt_summary(results: list[dict]) -> str:
    resolved = [r for r in results if r.get("url") and not r.get("junk")]
    matched = [r for r in results if _is_match(r)]
    layer_hits = {}
    for r in results:
        layer = r.get("winner_layer") or "null"
        layer_hits.setdefault(layer, {"resolved": 0, "matched": 0})
        if r.get("url") and not r.get("junk"):
            layer_hits[layer]["resolved"] += 1
        if _is_match(r):
            layer_hits[layer]["matched"] += 1

    lines = [
        "=" * 78,
        f"RESOLUTION RATE: {len(resolved)}/{len(results)} resolved "
        f"({100 * len(resolved) // max(len(results), 1)}%) — "
        f"{len(matched)}/{len(results)} domain-matched",
        "-" * 78,
    ]
    for layer in sorted(layer_hits):
        h = layer_hits[layer]
        lines.append(f"  {layer:<16} resolved={h['resolved']}  matched={h['matched']}")
    lines.append("=" * 78)
    return "\n".join(lines)


# ── pytest entrypoints ────────────────────────────────────────────────────────

@pytest.mark.live
@pytest.mark.asyncio
async def test_replay_all_ground_truth():
    results = await run_all()
    # The point of this test is measurement, not a hard gate — log everything.
    resolved = [r for r in results if r.get("url") and not r.get("junk")]
    assert len(resolved) >= 2, "regression: must beat the 2/10 pre-fix baseline"


if __name__ == "__main__":
    asyncio.run(run_all())
