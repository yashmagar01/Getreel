"""Orchestrator — downloader-first routing (GetReel v2).

Two modes, one rule: `download` never touches AI modules;
`resource` (Instagram only) reuses the downloaded file and runs
the existing pipeline in main.py unchanged.
"""
import re

DOWNLOAD = "download"
RESOURCE = "resource"

_INSTAGRAM_RE = re.compile(r"instagram\.com/(reel|p|reels|tv)/[A-Za-z0-9_-]+")
_YOUTUBE_RE = re.compile(r"(?:youtube\.com/(?:watch\?v=|shorts/)|youtu\.be/)([A-Za-z0-9_-]+)")


def detect_platform(url: str) -> str | None:
    """Lightweight URL sniffing before anything expensive. No network."""
    u = (url or "").strip()
    if _INSTAGRAM_RE.search(u):
        return "instagram"
    if _YOUTUBE_RE.search(u):
        return "youtube"
    return None


if __name__ == "__main__":
    # ponytail: runnable self-check, no framework needed
    assert detect_platform("https://www.instagram.com/reel/AbC123/") == "instagram"
    assert detect_platform("https://www.instagram.com/p/AbC123/?x=1") == "instagram"
    assert detect_platform("https://youtu.be/AbC123") == "youtube"
    assert detect_platform("https://www.youtube.com/shorts/AbC123") == "youtube"
    assert detect_platform("https://example.com/x") is None
    print("orchestrator OK")
