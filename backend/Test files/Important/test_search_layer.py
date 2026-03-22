"""
test_search_layer.py — Phase 3 acceptance tests for DDG search layer hardening.

Tests validate:
  1. Rate limit handling (safe_ddg_search doesn't raise)
  2. Intent-aware query generation (build_targeted_queries)
  3. Result scoring logic (creator name ranking)
  4. Minimum score threshold (blocks junk)
  5. Inter-query jitter limit (max 4 queries)

Run from backend directory:
    python test_search_layer.py
"""

import sys
import logging
from unittest import mock

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ── import under test ────────────────────────────────────────────────────────
from link_finder import (
    _safe_ddg_search,
    build_targeted_queries,
    score_result,
    RESOURCE_PLATFORMS
)

def test_1_ddg_rate_limit_handling():
    print("\n▶ TEST 1 — DDG rate limit handling (Mocked)")
    from duckduckgo_search.exceptions import DuckDuckGoSearchException
    
    # We mock DDGS to raise an exception, and we also mock httpx so the fallback fails too
    # to ensure it returns [] gracefully without raising.
    with mock.patch("duckduckgo_search.DDGS") as MockDDGS, mock.patch("httpx.Client") as MockClient:
        # Make the context manager raise immediately, bypassing sleep for speed
        mock_instance = mock.MagicMock()
        mock_instance.__enter__.side_effect = DuckDuckGoSearchException("202 Ratelimit")
        MockDDGS.return_value = mock_instance
        
        # Make httpx raise instantly too to bypass instant answer wait
        MockClient.side_effect = Exception("Fallback network error")
        
        # Fast-forward time sleep to make the 3 retries instant
        with mock.patch("time.sleep"):
            result = _safe_ddg_search("test query")
            
    assert result == [], f"Expected [], got {result}"
    print("✅ TEST 1 PASS")

def test_2_intent_aware_queries():
    print("\n▶ TEST 2 — Intent-aware query generation")
    uploader = "Crossfader"
    concept = {"topic": "DJ content editing", "tools_mentioned": ["CapCut"]}
    hints = {"resource_description": "free DJ course", "domain_mentions": ["Teachable"]}
    queries = build_targeted_queries(uploader, concept, hints)
    
    assert any("teachable.com" in q.lower() or "teachable" in q.lower() for q in queries), "Teachable not in queries"
    assert all("crossfader" in q.lower() for q in queries), "Creator name missing"
    assert not any(q.strip().split()[0].isdigit() for q in queries), "Numeric ID in query"
    print(f"Queries generated:\n  - " + "\n  - ".join(queries))
    print("✅ TEST 2 PASS")

def test_3_result_scoring():
    print("\n▶ TEST 3 — Result scoring ranking")
    results = [
        {"href": "https://reddit.com/r/DJing/crossfader_review", "title": "crossfader review", "body": ""},
        {"href": "https://gumroad.com/crossfaderdjcourse", "title": "Crossfader DJ Course", "body": ""},
        {"href": "https://medium.com/some-blog-post", "title": "DJ tips 2024", "body": ""},
    ]
    scored = sorted(
        results, 
        key=lambda r: score_result(r, "Crossfader", {"resource_description": "free DJ course"}), 
        reverse=True
    )
    
    assert "gumroad.com" in scored[0]["href"], "gumroad result should rank first"
    assert scored[-1]["href"] == "https://medium.com/some-blog-post" or "reddit.com" in scored[-1]["href"], "Low quality should rank last"
    print(f"Ranking:\n  - " + "\n  - ".join([r['href'] for r in scored]))
    print("✅ TEST 3 PASS")

def test_4_minimum_score_threshold():
    print("\n▶ TEST 4 — Minimum score threshold for junk")
    junk_results = [
        {"href": "https://pinterest.com/djpin/", "title": "DJ inspiration", "body": ""},
        {"href": "https://quora.com/what-is-dj", "title": "What is DJing?", "body": ""},
    ]
    
    # We pass empty hints to test baseline scoring
    scored = sorted(junk_results, key=lambda r: score_result(r, "Crossfader", {}), reverse=True)
    best_score = score_result(scored[0], "Crossfader", {})
    
    assert best_score < 3, f"Expected score < 3 for junk results, got {best_score}"
    print(f"Best score for junk: {best_score} (correctly below threshold)")
    print("✅ TEST 4 PASS")

def test_5_inter_query_jitter():
    print("\n▶ TEST 5 — Query count limit (Rate limit prevention)")
    concept = {
        "topic": "DJ content editing for Instagram Reels and TikTok",
        "tools_mentioned": ["CapCut", "Premiere", "DaVinci", "Final Cut", "iMovie"]
    }
    hints = {
        "domain_mentions": ["Teachable", "Gumroad", "Udemy"],
        "resource_description": "complete DJ editing masterclass"
    }
    queries = build_targeted_queries("Crossfader", concept, hints)
    
    assert len(queries) <= 4, f"Got {len(queries)} queries — must be <= 4"
    print(f"Query count: {len(queries)} ✅")
    print("✅ TEST 5 PASS")

def run_tests():
    print("=" * 60)
    print("🔬 Phase 3 Search Layer Acceptance Tests")
    print("=" * 60)
    
    passed = 0
    tests = [
        test_1_ddg_rate_limit_handling,
        test_2_intent_aware_queries,
        test_3_result_scoring,
        test_4_minimum_score_threshold,
        test_5_inter_query_jitter,
    ]
    
    try:
        for t in tests:
            t()
            passed += 1
    except AssertionError as e:
        print(f"❌ ASSERTION ERROR: {e}")
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        
    print("\n" + "=" * 60)
    if passed == 5:
        print("✅ Score: 5/5")
    else:
        print(f"❌ Score: {passed}/5")
    print("=" * 60)
    
    sys.exit(0 if passed == 5 else 1)

if __name__ == "__main__":
    run_tests()
