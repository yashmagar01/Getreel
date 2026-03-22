"""
test_bio_layer.py — Phase 1 acceptance test for the bio resolution layer.

Ground truth: 6 handles with confirmed publicly-accessible bio URLs
(verified by browser agent on 22 March 2026).

Run from backend directory:
  python test_bio_layer.py

Target: 5/6 (83%) minimum pass rate.
"""

import sys
import time
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("test_bio_layer")

from link_finder import _check_creator_bio, extract_handle_from_url, is_junk_url

# Ground truth from browser agent audit (22 March 2026)
GROUND_TRUTH = {
    "saviliablunk":     "thefeed.com/savilia",
    "theeeylovekamora": "youtube.com/channel/UC1DY49MTJfXn5q7wQDL5www",
    "1datboijug":       "distrokid.com/hyperfollow/datboijug/ptsd-vol2",
    "sebriaahleshun":   "youtube.com/@sebriaahleshun",
    "rico.incarnati":   "stan.store/enricoincarnati",
    "wearecrossfader":  "linkin.bio/wearecrossfader",  # aggregator — resolved URL may differ
}


def domain_match(expected: str, found: str) -> bool:
    """Returns True if the found URL contains the expected domain."""
    # Extract just the domain from expected hint (e.g. "thefeed.com")
    expected_domain = expected.split("/")[0].replace("www.", "")
    return expected_domain.lower() in found.lower()


def test_all():
    print("\n🔬 Bio Layer Acceptance Test — Phase 1")
    print("=" * 60)
    print(f"Testing {len(GROUND_TRUTH)} handles against confirmed ground truth\n")

    passed = 0
    results = []

    for handle, expected in GROUND_TRUTH.items():
        print(f"\n{'─'*50}")
        print(f"📌 @{handle} (expected domain: {expected.split('/')[0]})")

        # Build a minimal info dict simulating what yt-dlp would produce
        # (Tier A will find nothing, so Instaloader / yt-dlp profile will fire)
        info = {
            "uploader": handle,
            "uploader_id": handle,  # handle-style (not numeric for these)
            "channel": handle,
        }
        concept = {}

        start = time.time()
        try:
            result = _check_creator_bio(info, concept)
        except Exception as e:
            print(f"  ❌ EXCEPTION: {type(e).__name__}: {e}")
            results.append({"handle": handle, "expected": expected, "found": None, "pass": False})
            continue
        elapsed = round(time.time() - start, 1)

        if result:
            found_url = result.get("url", "")
            source = result.get("source", "?")
            match = domain_match(expected, found_url)
            status = "✅ PASS" if match else "❌ FAIL (wrong domain)"
            print(f"  {status} ({elapsed}s)")
            print(f"  Source:   {source}")
            print(f"  Expected: {expected}")
            print(f"  Found:    {found_url}")
            if match:
                passed += 1
            results.append({"handle": handle, "expected": expected, "found": found_url, "pass": match})
        else:
            print(f"  ❌ FAIL — returned None ({elapsed}s)")
            print(f"  Expected: {expected}")
            results.append({"handle": handle, "expected": expected, "found": None, "pass": False})

        # Respect Instaloader rate limits between handles
        if handle != list(GROUND_TRUTH.keys())[-1]:
            print("  ⏸️  Pausing 2s (Instaloader rate limit protection)...")
            time.sleep(2)

    print("\n" + "=" * 60)
    pct = round(passed / len(GROUND_TRUTH) * 100)
    status_icon = "✅" if passed >= 5 else "⚠️ " if passed >= 3 else "❌"
    print(f"{status_icon} Bio layer score: {passed}/{len(GROUND_TRUTH)} ({pct}%)")

    if passed < 5:
        print("\n── Failures ────────────────────────────────────────────────")
        for r in results:
            if not r["pass"]:
                print(f"  ❌ @{r['handle']}: expected {r['expected']} | got {r['found']}")

    print("\nTarget: 5/6 (83%) minimum")
    print("=" * 60)
    # Pytest warning fix: do not return the score directly
    global _last_score
    _last_score = passed


if __name__ == "__main__":
    _last_score = 0
    test_all()
    sys.exit(0 if _last_score >= 5 else 1)
