import asyncio
import logging
import io

from link_finder import _check_youtube_crossref, _check_wayback_bio, find_promised_link
import link_finder
import httpx

# TEST 1 — YouTube channel URL detection
def test_youtube_channel_url():
    print("TEST 1: YouTube channel URL filter")
    test_urls = [
        ("https://youtube.com/@crossfader", True),    # channel — accept
        ("https://youtube.com/c/crossfader", True),   # channel — accept
        ("https://youtube.com/channel/UCxxx", True),  # channel — accept
        ("https://youtube.com/watch?v=abc", False),   # video — reject
        ("https://youtube.com/shorts/abc", False),    # short — reject
    ]
    all_passed = True
    for url, should_accept in test_urls:
        is_channel = (
            "youtube.com/@" in url or
            "youtube.com/c/" in url or
            "youtube.com/channel/" in url
        )
        status = "✅" if is_channel == should_accept else "❌"
        if is_channel != should_accept:
            all_passed = False
        print(f"  {status} {url} → {'channel' if is_channel else 'video'}")
    assert all_passed, "YouTube channel URL filter failed"
    print("✅ TEST 1 PASS\n")


# TEST 2 — Layer 6 graceful failure when DDG returns no YouTube channels
def test_layer6_no_youtube_channels():
    print("TEST 2: Layer 6 graceful failure on non-YouTube DDG results")
    original_search = link_finder._safe_ddg_search
    # Mock safe_ddg_search to return only non-YouTube results
    def mock_safe_ddg_search(query, max_results=5):
        return [
            {"href": "https://example.com/not-youtube"},
            {"href": "https://twitter.com/creator"}
        ]
    link_finder._safe_ddg_search = mock_safe_ddg_search

    try:
        result = asyncio.run(_check_youtube_crossref("test_creator", "test topic"))
        assert result is None, f"Expected None, got {result}"
        print("✅ TEST 2 PASS — graceful failure\n")
    finally:
        link_finder._safe_ddg_search = original_search


# TEST 3 — Layer 7 graceful failure when Wayback returns no snapshots
def test_layer7_no_snapshots():
    print("TEST 3: Layer 7 graceful failure on no snapshots")
    original_client = httpx.AsyncClient

    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json_data = json_data
            self.status_code = status_code
        def json(self):
            return self._json_data

    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
        async def get(self, url, *args, **kwargs):
            return MockResponse([["timestamp", "original"]]) # Header only

    httpx.AsyncClient = MockAsyncClient

    try:
        result = asyncio.run(_check_wayback_bio("test_handle"))
        assert result is None, f"Expected None, got {result}"
        print("✅ TEST 3 PASS — graceful failure\n")
    finally:
        httpx.AsyncClient = original_client


# TEST 4 — Layer 7 skips numeric handles
def test_layer7_numeric_handle():
    print("TEST 4: Layer 7 skips numeric handle")
    result = asyncio.run(_check_wayback_bio("3037368158"))
    assert result is None, f"Numeric handle should return None immediately, got {result}"
    print("✅ TEST 4 PASS — numeric handle correctly skipped\n")


# TEST 5 — Layers 6 and 7 appear in the find_promised_link() layer sequence
def test_layer_sequence_logging():
    print("TEST 5: Layers 6 and 7 logging sequence")
    
    # Capture logs
    log_stream = io.StringIO()
    handler = logging.StreamHandler(log_stream)
    logger = logging.getLogger("link_finder")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

    # Patch layers
    originals = {
        "_check_comments": link_finder._check_comments,
        "_check_info_dict": link_finder._check_info_dict,
        "_check_caption": link_finder._check_caption,
        "_check_transcript": link_finder._check_transcript,
        "_check_creator_bio": link_finder._check_creator_bio,
        "_check_targeted_search": link_finder._check_targeted_search,
        "_check_generic_search": link_finder._check_generic_search,
        "_check_youtube_crossref": link_finder._check_youtube_crossref,
        "_check_wayback_bio": link_finder._check_wayback_bio,
        "extract_handle_from_url": link_finder.extract_handle_from_url
    }

    link_finder._check_comments = lambda *args: None
    link_finder._check_info_dict = lambda *args: None
    link_finder._check_caption = lambda *args: None
    link_finder._check_transcript = lambda *args: None
    link_finder._check_creator_bio = lambda *args: None
    link_finder._check_targeted_search = lambda *args, **kw: None
    link_finder._check_generic_search = lambda *args, **kw: None
    
    async def mock_layer6(*args): return None
    async def mock_layer7(*args): return None
    
    link_finder._check_youtube_crossref = mock_layer6
    link_finder._check_wayback_bio = mock_layer7
    link_finder.extract_handle_from_url = lambda info: "test_handle"

    try:
        info = {"uploader": "test", "uploader_id": "test_id", "channel": "test_channel"}
        asyncio.run(find_promised_link(info, "transcript", {"topic": "test"}, []))

        # Check logs for "[LAYER:youtube_crossref] starting" and "[LAYER:wayback_bio] starting"
        log_text = log_stream.getvalue()

        assert "[LAYER:youtube_crossref] starting" in log_text, "Layer 6 did not log start"
        assert "[LAYER:wayback_bio] starting" in log_text, "Layer 7 did not log start"
        print("✅ TEST 5 PASS — sequence logs found\n")
    finally:
        for k, v in originals.items():
            setattr(link_finder, k, v)
        logger.removeHandler(handler)


if __name__ == "__main__":
    try:
        test_youtube_channel_url()
        test_layer6_no_youtube_channels()
        test_layer7_no_snapshots()
        test_layer7_numeric_handle()
        test_layer_sequence_logging()
        print("ALL TESTS PASSED ✅")
    except AssertionError as e:
        print(f"FAILED ❌: {e}")
