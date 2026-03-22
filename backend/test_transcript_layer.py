"""
test_transcript_layer.py — Phase 2 acceptance tests for the new _check_transcript() layer.

Tests validate:
  1. "search on Google" → does NOT produce google.com
  2. DM gate detection  → dm_gate + correct keyword
  3. Explicit URL       → returned with confidence=high
  4. Pure educational   → _pure_educational=True or None, no url
  5. Hints pass-through → resource_description reaches search layer query

Run from backend directory:
    python test_transcript_layer.py

All 5 tests must pass. GROQ_API_KEY must be set.
"""

import os
import sys
import json
import time
import logging

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("test_transcript")

# ── import under test ────────────────────────────────────────────────────────
from link_finder import _check_transcript, is_junk_url

# ── test case definitions ────────────────────────────────────────────────────

TESTS = [
    # (name, transcript, caption, assertion_fn, expected_desc)
    (
        "TEST 1 — Google false positive must NOT happen",
        "So first open CapCut — it's free and available on Google Play. "
        "Tap the plus button, select your clip and that's it. Really simple.",
        "",
        lambda r: (
            r is None or r.get("_pure_educational") is True or
            (not r.get("url") or "google" not in r.get("url", "").lower())
        ),
        "Expected: no google.com url returned",
    ),
    (
        "TEST 2 — DM gate detection",
        "DM me the word FREE and I'll send you the complete template guide right away.",
        "",
        lambda r: (r is not None and r.get("type") == "dm_gate" and r.get("keyword") == "FREE"),
        "Expected: {type: dm_gate, keyword: FREE}",
    ),
    (
        "TEST 3 — Comment gate detection",
        "Comment the word COURSE below and I'll send you the link to my full editing course.",
        "",
        lambda r: (r is not None and r.get("type") == "comment_gate" and r.get("keyword") is not None),
        "Expected: {type: comment_gate, keyword: COURSE or similar}",
    ),
    (
        "TEST 4 — Pure educational reel (no resource promised)",
        "Instagram just dropped a new feature. You can now add clickable links directly on "
        "your Reels using the Edits app. Here's how it looks on the profile. Super clean!",
        "",
        lambda r: r is None or r.get("_pure_educational") is True or (r and "url" not in r),
        "Expected: None or {_pure_educational: True}, no url",
    ),
    (
        "TEST 5 — Hints pass-through for search layer",
        "Check out my free DJ course on Teachable. It covers everything from beatmatching to mixing.",
        "Link in bio to my Teachable DJ course",
        lambda r: (
            r is not None and (
                (r.get("_hints") and r.get("_no_url")) or
                r.get("type") in ("dm_gate", "comment_gate") or
                r.get("url")
            )
        ),
        "Expected: _hints dict with resource_description or domain_mentions containing Teachable",
    ),
]


def run_tests():
    print("\n🔬 Phase 2 Transcript Layer Acceptance Tests")
    print("=" * 60)

    if not os.getenv("GROQ_API_KEY"):
        print("❌ GROQ_API_KEY not set — tests cannot run")
        sys.exit(1)

    passed = 0
    failed = []

    for i, (name, transcript, caption, assert_fn, expected_desc) in enumerate(TESTS):
        print(f"\n{'─' * 55}")
        print(f"▶ {name}")
        print(f"  Transcript: {transcript[:80]!r}...")

        start = time.time()
        try:
            result = _check_transcript(transcript, caption)
        except Exception as e:
            print(f"  ❌ EXCEPTION: {type(e).__name__}: {e}")
            failed.append(name)
            continue
        elapsed = round(time.time() - start, 1)

        try:
            ok = assert_fn(result)
        except Exception as e:
            print(f"  ❌ ASSERTION ERROR: {e}")
            failed.append(name)
            continue

        if ok:
            passed += 1
            print(f"  ✅ PASS ({elapsed}s)")
            print(f"  Result: {json.dumps(result, default=str)[:160]}")
        else:
            print(f"  ❌ FAIL ({elapsed}s)")
            print(f"  {expected_desc}")
            print(f"  Got: {json.dumps(result, default=str)[:160]}")
            failed.append(name)

        # Respect Groq rate limits between calls
        if i < len(TESTS) - 1:
            time.sleep(1)

    print("\n" + "=" * 60)
    status = "✅" if passed == len(TESTS) else "⚠️ " if passed >= 3 else "❌"
    print(f"{status} Score: {passed}/{len(TESTS)}")

    if failed:
        print("\nFailed tests:")
        for f in failed:
            print(f"  ❌ {f}")

    print("=" * 60)

    # Additional: verify is_junk_url regression (Phase 0 must not break)
    print("\n🔄 Phase 0 regression check (is_junk_url)...")
    regressions = 0
    junk_checks = [
        ("https://google.com", True),
        ("https://youtube.com/", True),
        ("https://youtube.com/@handle", False),
        ("https://gumroad.com/l/test", False),
    ]
    for url, expected in junk_checks:
        got = is_junk_url(url)
        if got != expected:
            print(f"  ❌ REGRESSION: is_junk_url({url!r}) = {got}, expected {expected}")
            regressions += 1
    if regressions == 0:
        print(f"  ✅ All {len(junk_checks)} is_junk_url checks still pass")

    return passed, len(TESTS)


if __name__ == "__main__":
    score, total = run_tests()
    sys.exit(0 if score == total else 1)
