import re
import logging

logger = logging.getLogger(__name__)

URL_PATTERN = re.compile(r'https?://[^\s\)\]\>\"\']+')
SOCIAL_DOMAINS = {
    "instagram.com", "instagr.am", "tiktok.com",
    "twitter.com", "x.com", "facebook.com",
}


def _is_external(url: str) -> bool:
    return not any(d in url for d in SOCIAL_DOMAINS)


def _clean_url(url: str) -> str:
    # Strip trailing punctuation that often gets captured
    return url.rstrip(".,;!?)")


def _search_comments(comments: list) -> dict | None:
    """
    Scan yt-dlp comment objects for external URLs.
    Prioritise pinned comments and comments by the post author.
    """
    if not comments:
        return None

    def score(c):
        s = 0
        if c.get("author_is_uploader"):
            s += 10
        if c.get("is_pinned"):
            s += 5
        return s

    sorted_comments = sorted(comments, key=score, reverse=True)

    for comment in sorted_comments[:40]:  # check top 40 comments
        text = comment.get("text", "")
        urls = [_clean_url(u) for u in URL_PATTERN.findall(text) if _is_external(u)]
        if urls:
            pinned = comment.get("is_pinned", False)
            by_uploader = comment.get("author_is_uploader", False)
            source_label = (
                "Pinned by creator in comments"
                if pinned
                else "Posted by creator in comments"
                if by_uploader
                else "Found in reel comments"
            )
            logger.info(f"Link found in comments: {urls[0]} ({source_label})")
            return {
                "url": urls[0],
                "description": source_label,
                "source": "comments",
            }

    return None


def _search_web(concept: dict) -> dict | None:
    """
    Use DuckDuckGo (no API key needed) to find the actual resource.
    Build the query from the extracted concept so it's highly targeted.
    """
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        logger.warning("duckduckgo-search not installed — skipping web search fallback")
        return None

    topic = (
        concept.get("topic")
        or concept.get("skill_taught")
        or concept.get("trick_or_tool")
        or ""
    )
    tools = concept.get("tools_mentioned") or []
    if isinstance(tools, list):
        tools_str = " ".join(tools[:3])
    else:
        tools_str = str(tools)

    query = f"{topic} {tools_str} free guide tutorial".strip()
    logger.info(f"Web search fallback query: {query}")

    blocked = {"instagram.com", "tiktok.com", "twitter.com", "x.com", "facebook.com"}

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))

        clean = [r for r in results if not any(b in r.get("href", "") for b in blocked)]

        if clean:
            best = clean[0]
            url = best.get("href", "")
            body = best.get("body", "")
            description = body[:140].rstrip() + ("…" if len(body) > 140 else "")
            logger.info(f"Web search found: {url}")
            return {
                "url": url,
                "description": description or "Best matching resource found online",
                "source": "web_search",
            }
    except Exception as e:
        logger.error(f"DuckDuckGo search failed: {e}")

    return None


def find_promised_link(comments: list, concept: dict) -> dict | None:
    """
    Main entry point. Returns a dict with keys:
      url         — the actual link
      description — one or two line human-readable description
      source      — 'comments' | 'web_search'
    Returns None if nothing found.
    """
    # 1. Try reel comments first — most direct
    result = _search_comments(comments)
    if result:
        return result

    # 2. Fall back to targeted web search
    result = _search_web(concept)
    if result:
        return result

    logger.info("No external link found via comments or web search")
    return None
