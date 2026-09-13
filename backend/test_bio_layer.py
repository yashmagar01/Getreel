"""
Phase 1 acceptance test — Bio Layer Resurrection (was promised in the master
plan but never built).

Tests the 3-tier bio resolution (info dict → Instaloader → yt-dlp profile)
against the 6 bio URLs CONFIRMED by the browser-agent audit (22 March 2026):

    @saviliablunk      → thefeed.com/savilia              (brand affiliate)
    @theeeylovekamora  → youtube.com/channel/UC1D...      (YouTube channel)
    @1datboijug        → distrokid.com/hyperfollow/...    (music release)
    @sebriaahleshun    → youtube.com/@sebriaahleshun      (YouTube channel)
    @rico.incarnati    → stan.store/enricoincarnati       (creator store)
    @wearecrossfader   → linkin.bio/wearecrossfader       (aggregator)

Run:
  venv/Scripts/python.exe -m pytest test_bio_layer.py -v     # skips (RUN_LIVE=1)
  RUN_LIVE=1 venv/Scripts/python.exe -m pytest test_bio_layer.py -v
"""
import os
import sys
import asyncio
import logging

sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(level=logging.WARNING, format="%(message)s")

import pytest
from link_finder import _check_creator_bio

# From the master plan — verified live by the browser agent, not estimated.
GROUND_TRUTH = {
    "saviliablunk":     "thefeed.com",
    "theeeylovekamora": "youtube.com",
    "1datboijug":       "distrokid.com",
    "sebriaahleshun":   "youtube.com",
    "rico.incarnati":   "stan.store",
    "wearecrossfader":  "linkin.bio",
}


def _info_for(handle: str) -> dict:
    """Info dict shaped like what yt-dlp ACTUALLY returns (verified live):
    channel field carries the real @username; uploader_id is a numeric ID."""
    return {
        "webpage_url": f"https://www.instagram.com/reel/TEST123456/",
        "uploader": handle,
        "uploader_id": "1234567890",   # numeric — like real yt-dlp output
        "channel": handle,             # like real yt-dlp output (the @username)
        "description": "test reel",
    }


async def _resolve(handle: str) -> str:
    info = _info_for(handle)
    concept = {"topic": "test", "tools_mentioned": [], "what_creator_withholds": {}}
    result = await asyncio.wait_for(
        asyncio.to_thread(_check_creator_bio, info, concept),
        timeout=45.0,
    )
    return (result or {}).get("url", "")


@pytest.mark.live
@pytest.mark.asyncio
async def test_bio_layer_ground_truth():
    """Target per master plan: 5/6 minimum (83%)."""
    passed, failures = 0, []
    for handle, expected_domain in GROUND_TRUTH.items():
        try:
            url = await _resolve(handle)
        except Exception as e:
            url = ""
            print(f"❌ @{handle}: ERROR {type(e).__name__}: {e}")
            failures.append((handle, expected_domain, f"ERROR: {e}"))
            continue

        ok = bool(url) and expected_domain in url.lower()
        status = "✅" if ok else "❌"
        print(f"{status} @{handle}: expected={expected_domain!r} got={url!r}")
        if ok:
            passed += 1
        else:
            failures.append((handle, expected_domain, url))

    print(f"\nBio layer score: {passed}/{len(GROUND_TRUTH)}")
    # 5/6 is the master plan's acceptance target
    assert passed >= 5, f"bio layer below target: {failures}"


if __name__ == "__main__":
    async def main():
        results = []
        for handle in GROUND_TRUTH:
            try:
                url = await _resolve(handle)
            except Exception as e:
                url = f"ERROR: {e}"
            ok = bool(url) and not url.startswith("ERROR") and GROUND_TRUTH[handle] in url.lower()
            print(f"{'✅' if ok else '❌'} @{handle}: got={url!r}")
            results.append(ok)
        print(f"\nBio layer score: {sum(results)}/{len(results)}")

    asyncio.run(main())
