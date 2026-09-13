"""
Offline unit tests for the link resolver's deterministic layer logic.

These tests never touch the network — they prove the Phase 0/1/3 fixes that
were written but never validated:

  - Bug 0A: junk-domain guard (google.com must never resolve)
  - Bug 0C: caption URL slash preservation (fclinks.firstcry.com/obZe/ds4g6xck)
  - Bug 0D: queries use display name, never numeric uploader_id
  - Phase 3: result scoring returns best (not first) and junk never wins
  - Layer isolation: a crashing layer must not kill the resolver

Run with:  venv/Scripts/python.exe -m pytest test_link_resolver.py -v
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import pytest

import link_finder as lf


# ── Bug 0A: Junk domain guard ─────────────────────────────────────────────────

@pytest.mark.unit
@pytest.mark.parametrize("url,expected", [
    # Master plan acceptance cases
    ("https://google.com", True),
    ("https://youtube.com/@sebriaahleshun", False),
    ("https://gumroad.com/l/xyz", False),
    # Bare roots of social platforms = junk
    ("https://youtube.com", True),
    ("https://www.youtube.com/", True),
    ("https://instagram.com", True),
    ("https://facebook.com", True),
    ("https://tiktok.com", True),
    ("https://twitter.com", True),
    # CDN noise from yt-dlp metadata = junk
    ("https://scontent.cdninstagram.com/v/t51.29350", True),
    ("https://fbcdn.net/something", True),
    # Real destinations = fine
    ("https://thefeed.com/savilia", False),
    ("https://stan.store/enricoincarnati", False),
    ("https://linkin.bio/wearecrossfader", False),
    ("https://distrokid.com/hyperfollow/datboijug/ptsd-vol2", False),
    ("https://fclinks.firstcry.com/obZe/ds4g6xck", False),
    ("https://collabs.shop/wgagfd", False),
    # Malformed / empty
    ("", True),
    ("not-a-url", True),
])
def test_is_junk_url(url: str, expected: bool):
    assert lf.is_junk_url(url) is expected


# ── Bug 0C: Caption layer must preserve URL slashes ──────────────────────────

@pytest.mark.unit
def test_caption_preserves_slash_in_url_path():
    """Reel 3: fclinks.firstcry.com/obZe/ds4g6xck must keep its slash."""
    info = {
        "description": (
            "Shop the look — link in caption @firstcryindia \n\n"
            "  https://fclinks.firstcry.com/obZe/ds4g6xck\n\n"
            "#trending \n#ad \n#viralreels"
        )
    }
    result = lf._check_caption(info)
    assert result is not None, "caption layer should find the URL"
    assert result["url"] == "https://fclinks.firstcry.com/obZe/ds4g6xck", \
        f"slash lost: {result['url']}"


@pytest.mark.unit
def test_caption_blocks_google():
    """A caption mentioning 'search on Google' must never resolve google.com."""
    info = {"description": "Just search on Google for more info about CapCut tutorials!"}
    assert lf._check_caption(info) is None


@pytest.mark.unit
def test_caption_empty_description_returns_none():
    assert lf._check_caption({"description": ""}) is None
    assert lf._check_caption({}) is None


# ── Bug 0D: Handle extraction + query construction ───────────────────────────

@pytest.mark.unit
def test_extract_handle_from_uploader_url():
    """Reel 4: uploader_url contains the real handle, not the numeric ID."""
    info = {
        "uploader": "Kamora B. Reed",
        "uploader_id": "3037368158",
        "uploader_url": "https://www.instagram.com/theeeylovekamora/",
    }
    assert lf.extract_handle_from_url(info) == "theeeylovekamora"


@pytest.mark.unit
def test_extract_handle_prefers_channel_field():
    info = {
        "channel": "saviliablunk",
        "uploader_id": "231430803",
        "uploader_url": "https://www.instagram.com/saviliablunk/",
    }
    assert lf.extract_handle_from_url(info) == "saviliablunk"


@pytest.mark.unit
def test_extract_handle_rejects_numeric_uploader_id():
    """Numeric IDs are useless as handles — must return empty, not the digits."""
    info = {"uploader": "Kamora B. Reed", "uploader_id": "3037368158"}
    assert lf.extract_handle_from_url(info) == ""


@pytest.mark.unit
def test_build_targeted_queries_uses_display_name_not_numeric_id():
    """Phase 3 acceptance: queries use 'Kamora B. Reed', never '3037368158'."""
    hints = {"resource_description": "free video", "domain_mentions": ["YouTube"]}
    queries = lf.build_targeted_queries("Kamora B. Reed", {}, hints)
    assert queries, "should build at least one query"
    joined = " ".join(queries)
    assert "Kamora B. Reed" in joined
    assert "3037368158" not in joined


@pytest.mark.unit
def test_build_targeted_queries_empty_creator():
    assert lf.build_targeted_queries("", {}, {}) == []


# ── Phase 3: Result scoring ───────────────────────────────────────────────────

@pytest.mark.unit
def test_score_result_junk_never_wins():
    junk = {"href": "https://google.com", "title": "Google", "body": ""}
    good = {"href": "https://gumroad.com/kamora/free-guide", "title": "Kamora free guide", "body": ""}
    assert lf.score_result(junk, "Kamora", {}) == -100
    assert lf.score_result(good, "Kamora", {}) > 0
    assert lf.score_result(good, "Kamora", {}) > lf.score_result(junk, "Kamora", {})


@pytest.mark.unit
def test_score_result_resource_platform_boost():
    r = {"href": "https://gumroad.com/x/y", "title": "something", "body": ""}
    score = lf.score_result(r, "Someone Else", {})
    assert score >= 8  # gumroad gets the platform tier bonus


@pytest.mark.unit
def test_score_result_low_quality_penalty():
    r = {"href": "https://medium.com/@x/y", "title": "x", "body": ""}
    assert lf.score_result(r, "Someone Else", {}) < 0


@pytest.mark.unit
def test_score_result_creator_name_bonus():
    r = {"href": "https://gumroad.com/kamora/template", "title": "Kamora's Notion Template", "body": ""}
    score = lf.score_result(r, "Kamora B. Reed", {})
    high = lf.score_result(r, "Someone Else", {})
    assert score > high


# ── Layer isolation (Bug 0B): one crash must not kill the resolver ───────────

@pytest.mark.unit
async def test_resolver_survives_caption_crash(monkeypatch):
    """If the caption layer throws, the resolver must still finish without raising."""
    async def boom(info):
        raise RuntimeError("simulated caption crash")

    monkeypatch.setattr(lf, "_check_caption", boom)
    # Stub every network layer so this stays a fast deterministic unit test
    for name in ["_check_creator_bio", "_check_targeted_search", "_check_generic_search"]:
        monkeypatch.setattr(lf, name, lambda *a, **k: None)
    async def no_crossref(*a, **k):
        return None
    monkeypatch.setattr(lf, "_check_youtube_crossref", no_crossref)
    async def no_wayback(*a, **k):
        return None
    monkeypatch.setattr(lf, "_check_wayback_bio", no_wayback)

    info = {
        "webpage_url": "https://www.instagram.com/reel/DUHkGtFkQ74/",
        "uploader": "Savilia Blunk",
        "uploader_id": "231430803",
        "description": "Going into year 5 with @thefeed! Link in caption for 40% off",
    }

    result = await lf.find_promised_link(info, "short", {})  # <20 chars → L2 LLM skips instantly

    # The resolver must either find a link from another layer or return None —
    # but it must NOT raise because caption crashed.
    assert result is None or isinstance(result, dict)


# ── Layer -1: Comment mining ──────────────────────────────────────────────────

@pytest.mark.unit
def test_creator_comment_url_high_confidence():
    comments = [
        {"author_id": "231430803", "text": "Check the link in my pinned comment https://gumroad.com/savilia/guide"},
        {"author_id": "999", "text": "Great reel!"},
    ]
    result = lf._check_comments(comments, "231430803")
    assert result is not None
    assert result["confidence"] == "high"
    assert "gumroad.com" in result["url"]


@pytest.mark.unit
def test_user_comment_url_low_confidence():
    comments = [
        {"author_id": "999", "text": "I found it here https://gumroad.com/savilia/guide"},
    ]
    result = lf._check_comments(comments, "231430803")
    assert result is not None
    assert result["confidence"] == "low"


@pytest.mark.unit
def test_comments_junk_url_ignored():
    comments = [{"author_id": "999", "text": "just google it https://google.com"}]
    assert lf._check_comments(comments, "231430803") is None


@pytest.mark.unit
def test_comments_empty():
    assert lf._check_comments([], "231430803") is None
    assert lf._check_comments(None, "231430803") is None


# ── Layer 0: Info dict mining ─────────────────────────────────────────────────

@pytest.mark.unit
def test_info_dict_mines_external_bio_url():
    info = {
        "uploader_url": "https://www.youtube.com/@sebriaahleshun",
        "channel_url": "https://www.instagram.com/sebriaahleshun/",
    }
    result = lf._check_info_dict(info)
    assert result is not None
    assert "youtube.com" in result["url"]


@pytest.mark.unit
def test_info_dict_skips_instagram_only():
    info = {
        "uploader_url": "https://www.instagram.com/sebriaahleshun/",
        "channel_url": "https://www.instagram.com/sebriaahleshun/",
    }
    assert lf._check_info_dict(info) is None


# ── DM bot env gate (the stall fix) ───────────────────────────────────────────

@pytest.mark.unit
async def test_resolver_skips_dm_bot_when_disabled(monkeypatch):
    """Without REELDECODER_ENABLE_DM_BOT, the DM interceptor must never run."""
    monkeypatch.delenv("REELDECODER_ENABLE_DM_BOT", raising=False)
    called = {"hit": False}

    async def fake_intercept(**kwargs):
        called["hit"] = True
        return None

    monkeypatch.setattr(lf, "intercept_via_dm", fake_intercept)
    # Stub every network layer so this stays a fast deterministic unit test
    for name in ["_check_creator_bio", "_check_targeted_search", "_check_generic_search"]:
        monkeypatch.setattr(lf, name, lambda *a, **k: None)
    async def no_crossref(*a, **k):
        return None
    monkeypatch.setattr(lf, "_check_youtube_crossref", no_crossref)
    async def no_wayback(*a, **k):
        return None
    monkeypatch.setattr(lf, "_check_wayback_bio", no_wayback)

    info = {"webpage_url": "https://www.instagram.com/reel/DUHkGtFkQ74/", "uploader": "Savilia Blunk"}
    await lf.find_promised_link(info, "short", {})  # <20 chars → L2 LLM skips instantly
    assert called["hit"] is False, "DM bot ran despite env gate being off"


# ── Instaloader fail-fast rate controller (the 30-min sleep fix) ──────────────

def _make_controller():
    """Build a _FailFastRateController with a minimal fake context."""
    import types
    ctx = types.SimpleNamespace(
        log=lambda *a, **k: None,   # base wait_before_query logs long waits
        error=lambda *a, **k: None,
    )
    return lf._FailFastRateController(ctx), ctx


@pytest.mark.unit
def test_rate_controller_handle_429_raises_immediately():
    """handle_429 must raise, never sleep (default sleeps up to 1800s)."""
    ctrl, _ = _make_controller()
    with pytest.raises(Exception) as ei:
        ctrl.handle_429("iphone")
    assert "TooManyRequests" in type(ei.value).__name__


@pytest.mark.unit
def test_rate_controller_rejects_30min_sleep():
    """sleep(1800) — the exact 30-min block — must raise, not block."""
    ctrl, _ = _make_controller()
    with pytest.raises(Exception) as ei:
        ctrl.sleep(1800.0)
    assert "TooManyRequests" in type(ei.value).__name__


@pytest.mark.unit
def test_rate_controller_allows_polite_wait(monkeypatch):
    """Small polite waits (<= 10s) still sleep normally."""
    slept = {"secs": None}
    monkeypatch.setattr(lf.time, "sleep", lambda s: slept.__setitem__("secs", s))
    ctrl, _ = _make_controller()
    ctrl.sleep(2.5)
    assert slept["secs"] == 2.5


@pytest.mark.unit
def test_wait_before_query_long_wait_raises(monkeypatch):
    """wait_before_query with a full sliding window must raise, not sleep.

    This is the critical dispatch test: base wait_before_query() computes a
    wait and calls self.sleep() — a subclass override must intercept it.
    """
    import time as _t
    ctrl, _ = _make_controller()
    # Poison the iphone window: 199 requests in the last 1800s → waittime ~1800s
    now = _t.monotonic()
    ctrl._query_timestamps["iphone"] = [now - i * 5 for i in range(199)]
    with pytest.raises(Exception) as ei:
        ctrl.wait_before_query("iphone")
    assert "TooManyRequests" in type(ei.value).__name__


@pytest.mark.unit
def test_wait_before_query_small_wait_sleeps(monkeypatch):
    """wait_before_query with a tiny wait must dispatch to the polite sleep."""
    import time as _t
    slept = {"secs": None}
    monkeypatch.setattr(lf.time, "sleep", lambda s: slept.__setitem__("secs", s))
    ctrl, ctx = _make_controller()
    now = _t.monotonic()
    # 74 requests in the window → 75-per-window cap means 1 more allowed → no wait
    ctrl._query_timestamps["other"] = [now - i * 5 for i in range(74)]
    ctrl.wait_before_query("other")
    # Allowed through; timestamp bookkeeping on the base controller must work
    assert len(ctrl._query_timestamps["other"]) == 75
    assert slept["secs"] is None


@pytest.mark.unit
def test_get_instaloader_wires_fail_fast_controller(monkeypatch):
    """The shared Instaloader instance must use _FailFastRateController."""
    monkeypatch.delenv("INSTAGRAM_COOKIES_PATH", raising=False)
    il = lf._get_instaloader()
    assert il is not None
    assert isinstance(il.context._rate_controller, lf._FailFastRateController)
    # And a 429 simulation must raise, not block
    with pytest.raises(Exception) as ei:
        il.context._rate_controller.handle_429("iphone")
    assert "TooManyRequests" in type(ei.value).__name__
