"""
link_finder.py — 5-layer promised link resolver

Priority order:
  1. Reel caption     — URL sitting right in the description yt-dlp already fetched
  2. Transcript       — creator verbally said a URL or "visit my site at..."
  3. Creator bio      — profile bio link (direct or aggregator like Linktree/Beacons)
  4. Targeted search  — DuckDuckGo: "@handle withheld_keyword site:gumroad.com" etc.
  5. Generic search   — DuckDuckGo: topic + tools (broad fallback)

Each layer returns:
  { url, description, source, confidence }
  confidence: "high" | "medium" | "low"
Returns None if all layers fail.
"""

import re
import logging
import httpx

logger = logging.getLogger(__name__)

# ── Domain lists ─────────────────────────────────────────────────────────────

NOISE_DOMAINS = {
    "instagram.com", "instagr.am", "facebook.com", "twitter.com",
    "x.com", "tiktok.com", "youtube.com", "youtu.be",
}

AGGREGATOR_DOMAINS = {
    "linktr.ee", "linktree.com", "beacons.ai", "stan.store",
    "carrd.co", "bio.link", "lnk.bio", "taplink.cc",
    "solo.to", "allmylinks.com",
}

RESOURCE_DOMAINS = {
    "gumroad.com", "notion.so", "notion.site", "lemonsqueezy.com",
    "payhip.com", "teachable.com", "github.com", "github.io",
    "drive.google.com", "docs.google.com",
}

RESOURCE_SITES = [
    "gumroad.com", "notion.so", "notion.site",
    "lemonsqueezy.com", "github.com", "beacons.ai", "stan.store",
]

CDN_NOISE = {
    "cdninstagram.com", "fbcdn.net", "fb.com", "akamaized.net",
    "scontent", "static.cdninstagram",
}

SEARCH_BLOCKED = {
    "instagram.com", "tiktok.com", "twitter.com",
    "x.com", "facebook.com", "reddit.com",
}

URL_PATTERN = re.compile(r'https?://[^\s\)\]\>\"\'\\,;]+')

SPOKEN_PATTERNS = [
    re.compile(r'https?://\S+', re.I),
    re.compile(
        r'(?:go to|visit|check out|find it at|link at|available at|head to)\s+'
        r'([\w\-]+\.[\w]{2,}(?:/\S*)?)', re.I
    ),
    re.compile(r'(www\.[\w\-]+\.[\w]{2,}(?:/\S*)?)', re.I),
    re.compile(
        r'\b([\w\-]+\.(?:com|io|co|app|dev|ai|so|link|store|site|net|org)(?:/\S*)?)\b',
        re.I
    ),
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _clean(url: str) -> str:
    return url.rstrip(".,;!?)/\\\"'")

def _is_useful(url: str) -> bool:
    return not any(d in url for d in NOISE_DOMAINS)

def _is_aggregator(url: str) -> bool:
    return any(d in url for d in AGGREGATOR_DOMAINS)

def _is_resource(url: str) -> bool:
    return any(d in url for d in RESOURCE_DOMAINS)

def _is_cdn(url: str) -> bool:
    return any(c in url for c in CDN_NOISE)

def _extract_urls(text: str) -> list[str]:
    found = URL_PATTERN.findall(text)
    seen, result = set(), []
    for u in found:
        u = _clean(u)
        if _is_useful(u) and not _is_cdn(u) and u not in seen:
            seen.add(u)
            result.append(u)
    return result

def _best_url(urls: list[str]) -> str | None:
    for u in urls:
        if _is_resource(u):
            return u
    for u in urls:
        if _is_aggregator(u):
            return u
    return urls[0] if urls else None

def _safe_get(url: str, timeout: int = 8) -> str | None:
    try:
        r = httpx.get(url, headers=HEADERS, timeout=timeout, follow_redirects=True)
        return r.text if r.status_code == 200 else None
    except Exception as e:
        logger.debug(f"GET {url} failed: {e}")
        return None

def _concept_keywords(concept: dict) -> set[str]:
    topic = (concept.get("topic") or concept.get("skill_taught") or "").lower()
    withheld = concept.get("what_creator_withholds") or concept.get("withheld_information") or {}
    withheld_str = (
        withheld if isinstance(withheld, str)
        else " ".join(str(v) for v in withheld.values()) if isinstance(withheld, dict)
        else str(withheld)
    ).lower()
    tools = concept.get("tools_mentioned") or []
    tools_str = " ".join(tools).lower() if isinstance(tools, list) else ""
    combined = f"{topic} {withheld_str} {tools_str}"
    return {w for w in combined.split() if len(w) > 3}

def _follow_aggregator(agg_url: str, concept: dict) -> str | None:
    html = _safe_get(agg_url)
    if not html:
        return None
    hrefs = re.findall(r'href=["\']([^"\']+)["\']', html)
    candidates = [
        _clean(h) for h in hrefs
        if h.startswith("http") and _is_useful(h) and not _is_cdn(h)
    ]
    if not candidates:
        return None
    keywords = _concept_keywords(concept)
    best, best_score = None, -1
    for url in candidates:
        score = sum(1 for kw in keywords if kw in url.lower())
        if _is_resource(url):
            score += 3
        if score > best_score:
            best_score, best = score, url
    logger.info(f"Aggregator follow → {best} (score {best_score})")
    return best


# ── Layer 1: Caption ──────────────────────────────────────────────────────────

def _check_caption(info: dict) -> dict | None:
    description = info.get("description") or ""
    urls = _extract_urls(description)
    if not urls:
        return None
    best = _best_url(urls)
    if not best:
        return None
    idx = description.find(best)
    snippet = description[max(0, idx - 50): idx + len(best) + 50].strip()
    logger.info(f"[L1-Caption] {best}")
    return {
        "url": best,
        "description": f"Found directly in the reel's caption: \"{snippet[:100]}\"",
        "source": "caption",
        "confidence": "high",
    }


# ── Layer 2: Transcript ───────────────────────────────────────────────────────

def _check_transcript(transcript: str) -> dict | None:
    if not transcript:
        return None
    for pattern in SPOKEN_PATTERNS:
        for match in pattern.findall(transcript):
            raw = match if isinstance(match, str) else match
            if not raw.startswith("http"):
                raw = "https://" + raw
            raw = _clean(raw)
            if _is_useful(raw) and not _is_cdn(raw) and "." in raw:
                logger.info(f"[L2-Transcript] {raw}")
                return {
                    "url": raw,
                    "description": "Creator mentioned this link verbally in the reel.",
                    "source": "transcript",
                    "confidence": "high",
                }
    return None


# ── Layer 3: Creator Bio ──────────────────────────────────────────────────────

def _check_creator_bio(info: dict, concept: dict) -> dict | None:
    handle = (info.get("uploader_id") or info.get("uploader") or "").lstrip("@")
    if not handle:
        return None

    profile_url = f"https://www.instagram.com/{handle}/"
    logger.info(f"[L3-Bio] Fetching @{handle}")
    html = _safe_get(profile_url)
    if not html:
        return None

    bio_urls = _extract_urls(html)
    if not bio_urls:
        return None

    best = _best_url(bio_urls)
    if not best:
        return None

    if _is_aggregator(best):
        logger.info(f"[L3-Bio] Aggregator found: {best} — following")
        deep = _follow_aggregator(best, concept)
        if deep:
            return {
                "url": deep,
                "description": (
                    f"Found via @{handle}'s link-in-bio "
                    f"({best.split('/')[2]}) — best match for this topic."
                ),
                "source": "bio_aggregator",
                "confidence": "medium",
            }
        return {
            "url": best,
            "description": f"@{handle}'s link-in-bio page — browse for the relevant resource.",
            "source": "bio",
            "confidence": "medium",
        }

    logger.info(f"[L3-Bio] Direct bio link: {best}")
    return {
        "url": best,
        "description": f"Direct link from @{handle}'s Instagram bio.",
        "source": "bio",
        "confidence": "high",
    }


# ── Layer 4: Targeted Search ──────────────────────────────────────────────────

def _check_targeted_search(info: dict, concept: dict) -> dict | None:
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        logger.warning("duckduckgo-search not installed — pip install duckduckgo-search==6.2.4")
        return None

    handle = (info.get("uploader_id") or info.get("uploader") or "").lstrip("@")
    topic = (concept.get("topic") or concept.get("skill_taught") or "").strip()
    withheld_raw = concept.get("what_creator_withholds") or concept.get("withheld_information") or {}
    withheld_str = (
        withheld_raw if isinstance(withheld_raw, str)
        else " ".join(str(v) for v in withheld_raw.values()) if isinstance(withheld_raw, dict)
        else str(withheld_raw)
    )
    withheld_kw = " ".join(withheld_str.split()[:6])

    queries = []
    if handle:
        for site in RESOURCE_SITES:
            queries.append(f'"{handle}" {topic} site:{site}')
        queries.append(f'"{handle}" {withheld_kw}')
    for site in RESOURCE_SITES[:3]:
        queries.append(f"{topic} {withheld_kw} site:{site}")

    try:
        with DDGS() as ddgs:
            for query in queries:
                logger.info(f"[L4-Targeted] Query: {query}")
                results = list(ddgs.text(query, max_results=5))
                clean = [r for r in results if not any(b in r.get("href","") for b in SEARCH_BLOCKED)]
                if clean:
                    best = clean[0]
                    body = best.get("body", "")
                    desc = (body[:140] + "…") if len(body) > 140 else body
                    logger.info(f"[L4-Targeted] Found: {best['href']}")
                    return {
                        "url": best["href"],
                        "description": desc or "Best targeted match for this creator and topic.",
                        "source": "targeted_search",
                        "confidence": "medium",
                    }
    except Exception as e:
        logger.error(f"[L4-Targeted] Failed: {e}")

    return None


# ── Layer 5: Generic Search ───────────────────────────────────────────────────

def _check_generic_search(concept: dict) -> dict | None:
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        return None

    topic = (concept.get("topic") or concept.get("skill_taught") or "").strip()
    tools = concept.get("tools_mentioned") or []
    tools_str = " ".join(tools[:3]) if isinstance(tools, list) else ""
    query = f"{topic} {tools_str} free guide tutorial".strip()
    logger.info(f"[L5-Generic] Query: {query}")

    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=5))
            clean = [r for r in results if not any(b in r.get("href","") for b in SEARCH_BLOCKED)]
            if clean:
                best = clean[0]
                body = best.get("body", "")
                desc = (body[:140] + "…") if len(body) > 140 else body
                logger.info(f"[L5-Generic] Found: {best['href']}")
                return {
                    "url": best["href"],
                    "description": desc or "Best general match found for this topic.",
                    "source": "generic_search",
                    "confidence": "low",
                }
    except Exception as e:
        logger.error(f"[L5-Generic] Failed: {e}")

    return None


# ── Main Entry Point ──────────────────────────────────────────────────────────

def find_promised_link(
    info: dict,        # full yt-dlp info dict
    transcript: str,   # whisper transcript
    concept: dict,     # concept extraction result
) -> dict | None:
    """
    Run all 5 layers in priority order.
    Returns { url, description, source, confidence } or None.
    """
    result = _check_caption(info)
    if result:
        return result

    result = _check_transcript(transcript)
    if result:
        return result

    result = _check_creator_bio(info, concept)
    if result:
        return result

    result = _check_targeted_search(info, concept)
    if result:
        return result

    result = _check_generic_search(concept)
    if result:
        return result

    logger.info("All 5 layers exhausted — no promised link found.")
    return None
