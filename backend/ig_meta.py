"""ig_meta.py — zero-cost instant metadata pre-flight via Instagram's public oEmbed API.

Instagram's oEmbed endpoint is public, unauthenticated, and returns the full
caption, author handle, and a direct CDN URL for the video thumbnail in ~1s.

Endpoint: https://www.instagram.com/api/v1/oembed/?url=<url>&format=json&omitscript=true

Fixes:
- Bug 0D: yt-dlp extracts numeric Instagram IDs (e.g. `3037368158`) instead of
  `@usernames`, poisoning downstream DDG search layers. oEmbed returns the
  actual `@username` inside the `author_url` field.
- Truncated captions: yt-dlp sometimes truncates the caption. oEmbed returns
  the full (up to 2200-char) caption.
"""

import logging
import os
import re
import shutil
import urllib.parse

import httpx

logger = logging.getLogger(__name__)

OEMBED_ENDPOINT = "https://www.instagram.com/api/v1/oembed/"
SHORTCODE_RE = re.compile(r"instagram\.com/(?:reel|p|reels|tv)/([A-Za-z0-9_-]+)")

# Matches bare numeric IDs like "3037368158" (Bug 0D poison signal).
_NUMERIC_ID_RE = re.compile(r"^\d+$")


def extract_shortcode(url: str) -> str | None:
    """Extract the reel/post shortcode from an Instagram URL, or None."""
    m = SHORTCODE_RE.search(url or "")
    return m.group(1) if m else None


def _username_from_author_url(author_url: str | None) -> str | None:
    """Derive `@username` from an oEmbed `author_url` like https://www.instagram.com/<user>."""
    if not author_url:
        return None
    try:
        path = urllib.parse.urlparse(author_url).path.strip("/")
        # author_url path is just "<username>" (or "<username>/..."); take first segment.
        username = path.split("/")[0].strip().lstrip("@")
        return username or None
    except Exception:
        return None


async def fetch_ig_meta(url: str, timeout: float = 10.0) -> dict:
    """Fetch instant metadata for an Instagram reel/post via the public oEmbed API.

    Returns a cleaned dict:
        {
            "title": <full caption>,
            "author_name": <display name>,
            "username": <handle without @, derived from author_url>,
            "thumbnail_url": <direct CDN thumbnail>,
            "shortcode": <reel shortcode>,
        }

    Raises:
        ValueError: if the URL is not a valid Instagram reel/post URL.
        httpx.HTTPError / RuntimeError: if the oEmbed request fails.

    Callers that want best-effort behaviour should catch Exception and fall
    back to the yt-dlp path.
    """
    clean_url = (url or "").strip()
    shortcode = extract_shortcode(clean_url)
    if not shortcode:
        raise ValueError(
            "Invalid URL. Please paste a link like: "
            "https://www.instagram.com/reel/... or https://www.instagram.com/p/..."
        )

    params = {"url": clean_url, "format": "json", "omitscript": "true"}
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            resp = await client.get(
                OEMBED_ENDPOINT,
                params=params,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/122.0.0.0 Safari/537.36"
                    ),
                    "Accept": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        status = e.response.status_code if e.response is not None else "?"
        logger.warning(f"oEmbed fetch failed (HTTP {status}) for {clean_url[:60]}...")
        raise RuntimeError(f"Instagram metadata fetch failed (HTTP {status}).") from e
    except httpx.HTTPError as e:
        logger.warning(f"oEmbed fetch failed (network) for {clean_url[:60]}...: {e}")
        raise RuntimeError(f"Instagram metadata fetch failed: {e}") from e

    title = (data.get("title") or "").strip()
    author_name = (data.get("author_name") or "").strip()
    author_url = (data.get("author_url") or "").strip()
    thumbnail_url = (data.get("thumbnail_url") or "").strip()
    username = _username_from_author_url(author_url)

    if not username:
        logger.warning("oEmbed response missing author_url/username.")
        raise RuntimeError("Instagram metadata response was incomplete (missing author).")

    return {
        "title": title,
        "author_name": author_name,
        "username": username,
        "thumbnail_url": thumbnail_url,
        "shortcode": shortcode,
    }


def is_numeric_uploader_id(value: str | None) -> bool:
    """True when a yt-dlp `uploader_id` is a bare numeric ID (Bug 0D signal)."""
    return bool(value) and bool(_NUMERIC_ID_RE.match(str(value).strip()))


def writable_cookie_copy(cookies_path: str | None, work_dir: str) -> str | None:
    """Copy a cookie file into a writable directory and return the copy's path.

    WHY THIS EXISTS (Render crash fix): yt-dlp treats `cookiefile` as
    read-write — on context exit it calls `cookiejar.save()`, dumping merged
    session cookies back into the same file. When `INSTAGRAM_COOKIES_PATH`
    points at a Render Secret File (e.g. `/etc/secrets/cookies.txt`, mounted
    read-only), that write raises `OSError [Errno 30] Read-only file system`
    AFTER the download already succeeded — killing the whole pipeline.
    Pointing yt-dlp at a copy inside our writable `work_dir` avoids this.

    Returns None when there is nothing usable to copy (caller should proceed
    without cookies and warn, never crash).
    """
    if not cookies_path or not os.path.exists(cookies_path):
        return None
    try:
        os.makedirs(work_dir, exist_ok=True)
        dest = os.path.join(work_dir, "ig_cookies.txt")
        shutil.copy2(cookies_path, dest)
        # copy2 preserves the source's permission bits — a read-only secret
        # file would produce a read-only copy. Force owner read/write so
        # yt-dlp's cookiejar.save() back to this path always succeeds.
        os.chmod(dest, 0o600)
        return dest
    except Exception as e:
        logger.warning(f"Could not stage writable cookie copy: {e}")
        return None


def enrich_info_with_meta(info: dict, ig_meta: dict | None) -> dict:
    """Enrich a yt-dlp `info` dict with oEmbed metadata (Bug 0D + caption fix).

    - Replaces numeric/missing `uploader_id` (and empty `uploader`) with the
      real `ig_meta['username']`.
    - Replaces missing/short `description` with the full `ig_meta['title']`.

    Mutates and returns `info`. Safe no-op when `ig_meta` is None/empty.
    """
    if not info or not ig_meta:
        return info

    username = (ig_meta.get("username") or "").strip()
    title = (ig_meta.get("title") or "").strip()

    if username:
        current_id = str(info.get("uploader_id") or "").strip()
        if not current_id or is_numeric_uploader_id(current_id):
            info["uploader_id"] = username
        if not str(info.get("uploader") or "").strip():
            info["uploader"] = username

    if title:
        current_desc = str(info.get("description") or "").strip()
        # Replace when missing, or when yt-dlp truncated (oEmbed caption is longer).
        if not current_desc or len(title) > len(current_desc):
            info["description"] = title

    return info
