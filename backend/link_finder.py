"""
link_finder.py — 9-layer promised link resolver (Phase 0 + Phase 1 fixes, 22 March 2026)

Layer execution order:
  -1. Comments          — yt-dlp comment data (creator's comments first)
   0. Info dict         — yt-dlp metadata (uploader_url, channel_url)
   1. Caption           — URL directly in description text
   2. Transcript        — Regex + Groq LLM extraction
   3. Bio               — Instaloader (Tier A: info dict, Tier B: Instaloader, Tier C: yt-dlp profile)
   4. Targeted search   — DuckDuckGo with retry + UA rotation
   5. Generic search    — DuckDuckGo fallback

Phase 0 fixes:
  - Bug 0A FIXED: JUNK_DOMAINS + is_junk_url() blocks google.com, bare youtube.com etc.
  - Bug 0B FIXED: Every layer is isolated in its own try/except — one crash cannot kill others
  - Bug 0C FIXED: Caption not truncated; slash preservation guard added
  - Bug 0D FIXED: Search queries use info.get("uploader") display name, not numeric uploader_id
  - Bug 0E (analyzer.py): temperature=0 + anti-hallucination prompt (separate file)
  - Bug 0F NEW: Layer -1 comment mining added

Phase 1 fixes:
  - Bio layer now uses Instaloader (Tier B) as primary method
  - Falls back to yt-dlp profile fetch (Tier C) if Instaloader fails
  - Aggregator resolution (linktree, linkin.bio, stan.store, etc.) added
"""

import os
import re
import json
import time
import random
import logging
import httpx

logger = logging.getLogger(__name__)

# ── Phase 0A: Junk domain guard ───────────────────────────────────────────────

# Domains that should NEVER be returned as a promised link.
# These are platforms the creator uses, not destinations they are directing viewers to.
JUNK_DOMAINS = {
    "google.com", "instagram.com", "facebook.com",
    "twitter.com", "x.com", "tiktok.com", "wikipedia.org",
    "reddit.com", "amazon.com", "apple.com", "microsoft.com",
    "whatsapp.com", "snapchat.com", "pinterest.com", "threads.net",
    "bing.com", "yahoo.com", "linkedin.com",
}


def is_junk_url(url: str) -> bool:
    """
    Returns True if this URL should never be surfaced as a promised link.
    Blocks bare root social/search domains.
    youtube.com/@channel is allowed; bare youtube.com is not.
    """
    if not url:
        return True
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc.lower().replace("www.", "")

        # Block domains in junk list
        if domain in JUNK_DOMAINS:
            return True

        # Block bare YouTube root (no meaningful path)
        if "youtube.com" in domain and parsed.path in ("", "/"):
            return True

        # Block CDN/Instagram internal domains
        cdn_noise = ("cdninstagram.com", "fbcdn.net", "fb.com", "akamaized.net",
                     "scontent", "static.cdninstagram", "instagr.am")
        if any(c in domain for c in cdn_noise):
            return True

        # Block if no TLD (malformed)
        if "." not in domain:
            return True

        return False
    except Exception:
        return True


# ── Domain classification ─────────────────────────────────────────────────────

AGGREGATOR_DOMAINS = {
    "linktr.ee", "linktree.com", "beacons.ai", "stan.store",
    "carrd.co", "bio.link", "lnk.bio", "taplink.cc",
    "solo.to", "allmylinks.com", "linkin.bio", "msha.ke",
    "campsite.bio", "koji.to", "milkshake.app", "later.com",
}

RESOURCE_DOMAINS = {
    "gumroad.com", "notion.so", "notion.site", "lemonsqueezy.com",
    "payhip.com", "teachable.com", "github.com", "github.io",
    "drive.google.com", "docs.google.com", "topmate.io", "whop.com",
    "substack.com", "medium.com", "ko-fi.com", "buymeacoffee.com",
    "udemy.com", "coursera.org", "skillshare.com", "patreon.com",
    "kajabi.com", "podia.com", "etsy.com", "distrokid.com",
    "thefeed.com", "stan.store",
}

RESOURCE_SITES = [
    "gumroad.com", "notion.so", "notion.site",
    "lemonsqueezy.com", "github.com", "beacons.ai", "stan.store",
    "topmate.io", "whop.com", "substack.com", "patreon.com",
    "teachable.com", "ko-fi.com", "etsy.com",
]

SEARCH_BLOCKED = {
    "instagram.com", "tiktok.com", "twitter.com",
    "x.com", "facebook.com", "reddit.com",
}

# yt-dlp info dict fields that may carry the creator's external (bio) link
YTDLP_LINK_FIELDS = [
    "uploader_url",
    "channel_url",
]

URL_PATTERN = re.compile(r'https?://[^\s\)\]>"\'\\,;]+')

SPOKEN_PATTERNS = [
    re.compile(r'https?://\S+', re.I),
    re.compile(
        r'(?:go to|visit|check out|find it at|link at|available at|head to|grab it at)\s+'
        r'([\w\-]+\.[\w]{2,}(?:/\S*)?)', re.I
    ),
    re.compile(r'(www\.[\w\-]+\.[\w]{2,}(?:/\S*)?)', re.I),
    re.compile(
        r'\b([\w\-]+\.(?:com|io|co|app|dev|ai|so|link|store|site|net|org)(?:/\S*)?)\\b',
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean(url: str) -> str:
    return url.rstrip(".,;!?)/\\\"'")

def _is_useful(url: str) -> bool:
    """Old-style check kept for backward compat — use is_junk_url() for new code."""
    noise = {"instagram.com", "instagr.am", "facebook.com", "twitter.com",
             "x.com", "tiktok.com", "youtube.com", "youtu.be"}
    return not any(d in url for d in noise)

def _is_aggregator(url: str) -> bool:
    return any(d in url for d in AGGREGATOR_DOMAINS)

def _is_resource(url: str) -> bool:
    return any(d in url for d in RESOURCE_DOMAINS)

def _is_cdn(url: str) -> bool:
    cdn_noise = ("cdninstagram.com", "fbcdn.net", "fb.com", "akamaized.net",
                 "scontent", "static.cdninstagram")
    return any(c in url for c in cdn_noise)

def _extract_urls(text: str) -> list[str]:
    found = URL_PATTERN.findall(text)
    seen, result = set(), []
    for u in found:
        u = _clean(u)
        # Bug 0C fix: do NOT strip slashes from path — only clean trailing punctuation
        if not is_junk_url(u) and not _is_cdn(u) and u not in seen:
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
        logger.debug(f"GET {url} → {r.status_code} ({len(r.text)} chars)")
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


# ── Phase 1: Handle extraction ────────────────────────────────────────────────

def extract_handle_from_url(info: dict) -> str:
    """
    Extract the @username from whatever yt-dlp gives us.
    Priority: uploader_url/channel_url regex > uploader_id if non-numeric.
    Returns empty string if no reliable handle found.
    """
    # Try extracting from profile URL fields
    for field in ["uploader_url", "channel_url"]:
        url = info.get(field, "") or ""
        match = re.search(r'instagram\.com/([a-zA-Z0-9._]+)/?', url)
        if match:
            candidate = match.group(1)
            if not candidate.isdigit() and candidate not in ("reel", "p", "tv", "stories"):
                logger.info(f"[HANDLE] Extracted from info['{field}']: @{candidate}")
                return candidate

    # Check if uploader_id looks like a handle (has letters, not purely numeric)
    uid = info.get("uploader_id", "") or ""
    if uid and not uid.isdigit():
        logger.info(f"[HANDLE] Using uploader_id as handle: @{uid}")
        return uid

    logger.warning(
        f"[HANDLE] Could not extract handle. "
        f"uploader_id={info.get('uploader_id')!r} uploader={info.get('uploader')!r}"
    )
    return ""


# ── Aggregator resolution ─────────────────────────────────────────────────────

def _follow_aggregator_deep(agg_url: str, concept: dict) -> str | None:
    """Fetch a link aggregator page and return the best destination link."""
    logger.info(f"[AGG] Following aggregator: {agg_url}")
    html = _safe_get(agg_url)
    if not html:
        logger.info(f"[AGG] Could not fetch {agg_url}")
        return None

    hrefs = re.findall(r'href=["\'](http[s]?://[^"\']+)["\']', html)
    candidates = [
        _clean(h) for h in hrefs
        if h.startswith("http") and not is_junk_url(h) and not _is_cdn(h)
    ]
    logger.info(f"[AGG] Found {len(candidates)} candidate links in aggregator page")

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

    logger.info(f"[AGG] Best link: {best} (score {best_score})")
    return best


def resolve_aggregator(url: str, concept: dict = None) -> str | None:
    """
    If the bio URL points to a link aggregator (Linktree, Beacons, etc.),
    follow it one hop and return the best destination URL found.
    For non-aggregators, returns the URL unchanged.
    """
    if not url:
        return None

    from urllib.parse import urlparse
    domain = urlparse(url).netloc.lower().replace("www.", "")

    if not any(agg in domain for agg in AGGREGATOR_DOMAINS):
        return url  # Not an aggregator — return as-is

    logger.info(f"[AGGREGATOR] Resolving {domain}: {url}")

    # Special handling for Linktree — public API
    if "linktr.ee" in domain:
        try:
            handle = url.rstrip("/").split("/")[-1]
            api_url = f"https://linktr.ee/api/profiles/{handle}"
            r = httpx.get(api_url, headers={
                "Origin": "https://linktr.ee",
                "Referer": "https://linktr.ee/",
                "User-Agent": "Mozilla/5.0 (compatible; ReelDecoder/1.0)",
            }, timeout=8.0, follow_redirects=True)
            if r.status_code == 200:
                data = r.json()
                links = data.get("links", [])
                if links:
                    best = links[0].get("url", "")
                    if best and not is_junk_url(best):
                        logger.info(f"[AGGREGATOR] Linktree resolved to: {best}")
                        return best
        except Exception as e:
            logger.warning(f"[AGGREGATOR] Linktree API failed: {e}")

    # Generic: try HTML scraping
    result = _follow_aggregator_deep(url, concept or {})
    if result and not is_junk_url(result):
        logger.info(f"[AGGREGATOR] Deep resolve found: {result}")
        return result

    # Final fallback: follow HTTP redirects
    try:
        r = httpx.get(url, headers=HEADERS, timeout=8.0, follow_redirects=True)
        final_url = str(r.url)
        if final_url != url and not is_junk_url(final_url):
            logger.info(f"[AGGREGATOR] Redirect resolved to: {final_url}")
            return final_url
    except Exception as e:
        logger.warning(f"[AGGREGATOR] HTTP follow failed: {e}")

    return url  # Return original if everything fails


# ── DDG safe wrapper with retry ───────────────────────────────────────────────

DDG_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
]


def _safe_ddg_search(query: str, max_results: int = 5) -> list[dict]:
    """
    DuckDuckGo search with retry + jitter + UA rotation.
    Returns a list of result dicts, or [] on failure.
    """
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        logger.warning("[DDG] duckduckgo-search not installed")
        return []

    for attempt in range(3):
        if attempt > 0:
            wait = random.uniform(3.0, 8.0) * attempt
            logger.info(f"[DDG] Retry {attempt}/2 — waiting {wait:.1f}s")
            time.sleep(wait)

        try:
            ua = random.choice(DDG_USER_AGENTS)
            with DDGS(headers={"User-Agent": ua}) as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                logger.info(f"[DDG] Query '{query[:60]}' returned {len(results)} results")
                return results
        except Exception as e:
            err_str = str(e)
            if "202" in err_str or "Ratelimit" in err_str or "rate" in err_str.lower():
                logger.warning(f"[DDG] Rate limited on attempt {attempt+1}: {e}")
            else:
                logger.error(f"[DDG] Search error (non-ratelimit): {e}")
                return []

    logger.warning("[DDG] All retry attempts exhausted.")
    return []


# ── Layer -1: Comment mining (Phase 0F) ───────────────────────────────────────

def _check_comments(comments: list, uploader_id: str) -> dict | None:
    """
    Layer -1: Mine reel comments for URLs.
    Creator's own comments (by uploader_id) are highest confidence.
    Checks top 50 comments. Creator comments checked first.
    """
    if not comments:
        logger.info("[L-1] No comments available")
        return None

    # Separate creator comments from user comments — creator first
    creator_comments = [c for c in comments if c.get("author_id") == uploader_id]
    other_comments = [c for c in comments if c.get("author_id") != uploader_id]
    ordered = creator_comments + other_comments

    logger.info(f"[L-1] Checking {min(len(ordered), 50)} comments ({len(creator_comments)} from creator)")

    for comment in ordered[:50]:
        text = comment.get("text", "") or ""
        urls = URL_PATTERN.findall(text)
        for url in urls:
            url = _clean(url)
            if not is_junk_url(url) and not _is_cdn(url):
                is_creator = comment.get("author_id") == uploader_id
                confidence = "high" if is_creator else "low"
                source = "comment_creator" if is_creator else "comment_user"
                comment_author_label = "creator's own" if is_creator else "a user"
                logger.info(f"[L-1] URL in {comment_author_label} comment: {url}")
                return {
                    "url": url,
                    "description": f"Found in {comment_author_label} comment on this reel.",
                    "source": source,
                    "confidence": confidence,
                    "comment_text": text[:100],
                }

    logger.info("[L-1] ❌ No URLs found in comments")
    return None


# ── Layer 0: yt-dlp info dict mining ─────────────────────────────────────────

def _check_info_dict(info: dict) -> dict | None:
    """
    Layer 0: Mine yt-dlp's already-fetched info dict for non-Instagram external links.
    Instant — no network call. Uses data already fetched during download.
    """
    non_instagram_candidates = []

    for field in YTDLP_LINK_FIELDS:
        val = info.get(field) or ""
        if isinstance(val, str) and val.startswith("http"):
            if not is_junk_url(val) and not _is_cdn(val):
                non_instagram_candidates.append((field, val))
                logger.info(f"[L0] Found external URL in info['{field}']: {val}")

    if not non_instagram_candidates:
        logger.info("[L0] No external URLs found in info dict fields")
        return None

    field, url = non_instagram_candidates[0]
    url = _clean(url)

    if _is_aggregator(url):
        logger.info(f"[L0] Aggregator found in info dict: {url} — following")
        deep = resolve_aggregator(url, {})
        if deep and deep != url:
            return {
                "url": deep,
                "description": f"Found via creator's link in yt-dlp metadata ({url})",
                "source": "bio",
                "confidence": "high",
            }
        return {
            "url": url,
            "description": "Creator's link-in-bio page found in reel metadata.",
            "source": "bio",
            "confidence": "medium",
        }

    return {
        "url": url,
        "description": f"External link found directly from reel metadata (yt-dlp field: {field}).",
        "source": "bio",
        "confidence": "high",
    }


# ── Layer 1: Caption ──────────────────────────────────────────────────────────

def _check_caption(info: dict) -> dict | None:
    """
    Layer 1: Check the reel's caption/description for URLs.
    Bug 0C fix: uses full description, no truncation.
    Bug 0C fix: does NOT strip slashes from URL paths.
    """
    description = info.get("description") or ""
    logger.info(f"[L1-Caption] Caption length: {len(description)} chars")
    if description:
        logger.info(f"[L1-Caption] Preview: {description[:150]!r}")

    urls = _extract_urls(description)
    logger.info(f"[L1-Caption] URLs found: {len(urls)}")

    if not urls:
        return None
    best = _best_url(urls)
    if not best:
        return None

    # Final validation against junk list
    if is_junk_url(best):
        logger.info(f"[L1-Caption] Blocked junk URL: {best}")
        return None

    idx = description.find(best)
    snippet = description[max(0, idx - 50): idx + len(best) + 50].strip()
    logger.info(f"[L1-Caption] ✅ Found: {best}")
    return {
        "url": best,
        "description": f"Found directly in the reel's caption: \"{snippet[:100]}\"",
        "source": "caption",
        "confidence": "high",
    }


# ── Layer 2: Transcript (regex + LLM fallback) ────────────────────────────────

def _check_transcript(transcript: str, caption: str = "") -> dict | None:
    """
    Phase 2: Structured LLM extraction replacing the old regex + separate LLM fallback.

    Understands the semantic difference between:
      - Tool being used (CapCut, Google) — NOT a destination
      - Platform being promoted (gumroad.com/mylink) — IS a destination

    Returns one of:
      - {url, source, confidence, ...}         — a real link found
      - {type: "dm_gate", keyword, ...}        — DM automation detected
      - {type: "comment_gate", keyword, ...}   — Comment automation detected
      - {_hints: {...}, _no_url: True}          — hints for search layers, no URL
      - {_pure_educational: True}               — no resource promised at all
      - None                                   — no signal found (or error)
    """
    if not transcript or len(transcript.strip()) < 20:
        logger.info("[L2] Transcript too short — skipping")
        return None

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.warning("[L2] GROQ_API_KEY not set — skipping transcript LLM")
        return None

    caption_text = (caption or "")[:400]
    transcript_text = transcript[:2000]

    prompt = f"""You are analyzing content from an Instagram reel creator.
Your job: find any external resource the creator is EXPLICITLY directing viewers to.

STRICT RULES (follow exactly):
- Extract ONLY what is EXPLICITLY STATED in the transcript or caption
- Do NOT extract names of tools the creator is just using or showing
- Only extract destinations the creator is DIRECTING viewers to go to
- "search on Google" is NOT a resource — it is a verb phrase, ignore it
- "CapCut is free" is NOT a resource — CapCut is a tool being discussed
- A resource = something the viewer is being told to go get/visit/download
- If nothing fits, return empty arrays and null values — do not guess
- is_pure_educational = true ONLY if the reel teaches something with ZERO external resource promised (no bio link, no DM keyword, no download)

Return ONLY this JSON object (no markdown, no extra text):
{{
  "explicit_urls": [],
  "domain_mentions": [],
  "platform_as_destination": [],
  "dm_keyword": null,
  "comment_keyword": null,
  "resource_description": null,
  "is_pure_educational": false
}}

Definitions:
- explicit_urls: literal URL strings spoken ("go to gumroad.com/mytemplate")
- domain_mentions: platform name spoken as a destination ("check my Gumroad", "it's on Teachable")
- platform_as_destination: platform where creator's content lives ("my YouTube channel", "my Notion page")
- dm_keyword: if creator says "DM me the word X" → X
- comment_keyword: if creator says "comment the word X" → X
- resource_description: what the resource IS ("free PDF guide", "Notion template", "DJ course")
- is_pure_educational: true if reel teaches something with no resource being promoted

Caption: {caption_text if caption_text else 'none'}

Transcript: {transcript_text}"""

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0,
        )

        raw = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```")).strip()

        data = json.loads(raw)
        logger.info(f"[L2] LLM extraction result: {data}")

        # ── 1. DM gate ─────────────────────────────────────────────────────
        dm_kw = data.get("dm_keyword")
        if dm_kw:
            logger.info(f"[L2] DM gate detected: keyword={dm_kw!r}")
            return {
                "type": "dm_gate",
                "keyword": dm_kw,
                "source": "transcript_llm",
                "confidence": "high",
                "description": f"DM the word '{dm_kw}' to receive the link",
            }

        # ── 2. Comment gate ────────────────────────────────────────────────
        comment_kw = data.get("comment_keyword")
        if comment_kw:
            logger.info(f"[L2] Comment gate detected: keyword={comment_kw!r}")
            return {
                "type": "comment_gate",
                "keyword": comment_kw,
                "source": "transcript_llm",
                "confidence": "high",
                "description": f"Comment the word '{comment_kw}' on the reel to receive an auto-reply",
            }

        # ── 3. Explicit URLs mentioned verbally ────────────────────────────
        for u in data.get("explicit_urls", []):
            u = _clean(str(u))
            if not u.startswith("http"):
                u = "https://" + u
            if not is_junk_url(u) and not _is_cdn(u):
                logger.info(f"[L2] Explicit URL found: {u}")
                return {
                    "url": u,
                    "source": "transcript_explicit_url",
                    "confidence": "high",
                    "description": "Creator mentioned this URL verbally in the reel.",
                    "_hints": data,
                }

        # ── 4. Hints for search layers (no URL, but useful signals) ────────
        has_signal = (
            data.get("domain_mentions")
            or data.get("platform_as_destination")
            or data.get("resource_description")
        )
        if has_signal:
            logger.info(f"[L2] No URL but has search hints: {data}")
            return {"_hints": data, "_no_url": True}

        # ── 5. Pure educational reel ───────────────────────────────────────
        if data.get("is_pure_educational"):
            logger.info("[L2] Reel identified as pure educational — no resource promised")
            return {"_pure_educational": True}

        logger.info("[L2] No signal found in transcript")
        return None

    except json.JSONDecodeError as e:
        logger.error(f"[L2] JSON parse error from Groq: {e}")
        return None
    except Exception as e:
        logger.error(f"[L2] Transcript LLM error: {type(e).__name__}: {e}")
        return None


# ── Layer 3: Bio (Phase 1 — 3-tier implementation) ────────────────────────────

def _layer_3a_info_dict_bio(info: dict) -> dict | None:
    """
    Tier A (free): Check yt-dlp info dict for non-Instagram external bio URL.
    Already handled by Layer 0 via _check_info_dict, but kept here as explicit Tier A
    so the bio layer is self-contained when called directly.
    """
    for field in YTDLP_LINK_FIELDS:
        val = info.get(field, "") or ""
        if isinstance(val, str) and val.startswith("http"):
            if "instagram.com" not in val and not is_junk_url(val) and not _is_cdn(val):
                url = _clean(val)
                logger.info(f"[L3A] Found via info dict field '{field}': {url}")
                if _is_aggregator(url):
                    resolved = resolve_aggregator(url, {})
                    return {
                        "url": resolved or url,
                        "description": f"Creator's bio link found in reel metadata via {field}.",
                        "source": "bio_info_dict",
                        "confidence": "high",
                        "raw_bio_url": url,
                    }
                return {
                    "url": url,
                    "description": f"External link found in reel metadata (field: {field}).",
                    "source": "bio_info_dict",
                    "confidence": "high",
                }

    logger.info("[L3A] No external URL in info dict")
    return None


# Module-level Instaloader instance (reused across requests)
_instaloader_instance = None

def _get_instaloader():
    """Lazily create and return the shared Instaloader instance."""
    global _instaloader_instance
    if _instaloader_instance is None:
        try:
            import instaloader
            _instaloader_instance = instaloader.Instaloader(
                download_pictures=False,
                download_videos=False,
                download_video_thumbnails=False,
                download_geotags=False,
                download_comments=False,
                save_metadata=False,
                compress_json=False,
                quiet=True,
            )
            logger.info("[INSTALOADER] Instance created")
        except ImportError:
            logger.warning("[INSTALOADER] instaloader not installed — Tier B unavailable")
            return None
    return _instaloader_instance


def _layer_3b_instaloader(handle: str) -> dict | None:
    """
    Tier B (primary): Use Instaloader to fetch Instagram profile bio URL.
    Handles Instagram's SPA problem correctly via private API.
    handle: Instagram @username WITHOUT the @ symbol.
    """
    if not handle:
        logger.warning("[L3B] No handle available — skipping")
        return None

    handle = handle.lstrip("@")

    if handle.isdigit():
        logger.warning(f"[L3B] Handle is numeric ID '{handle}' — cannot use for Instaloader")
        return None

    il = _get_instaloader()
    if il is None:
        return None

    try:
        import instaloader
        logger.info(f"[L3B] Fetching @{handle} via Instaloader...")
        profile = instaloader.Profile.from_username(il.context, handle)
        ext_url = profile.external_url
        logger.info(f"[L3B] Profile fetched for @{handle}. external_url={ext_url!r}")

        if ext_url and not is_junk_url(ext_url):
            resolved = resolve_aggregator(ext_url, {})
            final_url = resolved if resolved and resolved != ext_url else ext_url
            return {
                "url": final_url,
                "description": f"@{handle}'s bio link (fetched via Instaloader).",
                "source": "bio_instaloader",
                "confidence": "medium",
                "handle": handle,
                "raw_bio_url": ext_url,
            }

        logger.info(f"[L3B] No usable external URL for @{handle}")
        return None

    except Exception as e:
        exc_type = type(e).__name__
        msg = str(e)
        # Catch common Instaloader exceptions by name (avoid import if not installed)
        if "ProfileNotExistsException" in exc_type:
            logger.warning(f"[L3B] Profile @{handle} not found on Instagram")
        elif "LoginRequiredException" in exc_type:
            logger.warning(f"[L3B] Profile @{handle} requires login — private account")
        elif "ConnectionException" in exc_type or "TooManyRequestsException" in exc_type:
            logger.warning(f"[L3B] Instaloader rate limited for @{handle}: {msg}")
        else:
            logger.error(f"[L3B] Instaloader error for @{handle}: {exc_type}: {msg}")
        return None


def _layer_3c_ytdlp_profile(handle: str) -> dict | None:
    """
    Tier C (fallback): Use yt-dlp to extract Instagram profile info.
    Falls back to this if Instaloader fails.
    """
    if not handle or handle.isdigit():
        return None

    profile_url = f"https://www.instagram.com/{handle}/"
    logger.info(f"[L3C] Fetching @{handle} profile via yt-dlp: {profile_url}")

    try:
        import yt_dlp
        ydl_opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            profile_info = ydl.extract_info(profile_url, download=False)

        if not profile_info:
            return None

        for field in ["uploader_url", "channel_url"]:
            url = profile_info.get(field, "") or ""
            if url and "instagram.com" not in url and not is_junk_url(url) and not _is_cdn(url):
                url = _clean(url)
                logger.info(f"[L3C] ✅ Found via yt-dlp profile field '{field}': {url}")
                if _is_aggregator(url):
                    resolved = resolve_aggregator(url, {})
                    return {
                        "url": resolved or url,
                        "description": f"@{handle}'s bio link (fetched via yt-dlp profile).",
                        "source": "bio_ytdlp_profile",
                        "confidence": "medium",
                    }
                return {
                    "url": url,
                    "description": f"@{handle}'s bio link (fetched via yt-dlp profile).",
                    "source": "bio_ytdlp_profile",
                    "confidence": "medium",
                }

    except Exception as e:
        logger.error(f"[L3C] yt-dlp profile error: {type(e).__name__}: {e}")

    return None


def _check_creator_bio(info: dict, concept: dict) -> dict | None:
    """
    Layer 3: Master bio layer — 3-tier fallback.
    Tier A: yt-dlp info dict (instant, no new calls)
    Tier B: Instaloader (primary)
    Tier C: yt-dlp profile fetch (fallback)
    """
    # Log identity info for diagnostics
    logger.info(
        f"[L3-Bio] uploader_id={info.get('uploader_id')!r} "
        f"uploader={info.get('uploader')!r} "
        f"channel={info.get('channel')!r}"
    )

    # Tier A: Free — check data we already have
    result = _layer_3a_info_dict_bio(info)
    if result:
        return result

    # Extract the actual handle (not numeric ID)
    handle = extract_handle_from_url(info)
    if not handle:
        logger.warning("[L3-Bio] No usable handle — skipping Instaloader and yt-dlp profile")
        return None

    # Tier B: Instaloader (primary)
    result = _layer_3b_instaloader(handle)
    if result:
        return result

    # Tier C: yt-dlp profile (fallback)
    result = _layer_3c_ytdlp_profile(handle)
    return result


# ── Layer 4: Targeted DuckDuckGo Search ───────────────────────────────────────

def _check_targeted_search(info: dict, concept: dict, hints: dict = None) -> dict | None:
    """
    Layer 4: Targeted search using creator's display name + Phase 2 hints.
    hints: optional dict from _check_transcript() containing resource_description,
           domain_mentions, platform_as_destination.
    """
    hints = hints or {}
    uploader_name = (info.get("uploader") or "").strip()
    handle_for_search = uploader_name or (info.get("channel") or "").strip()

    logger.info(
        f"[L4-Targeted] creator={handle_for_search!r} | "
        f"hints={list(hints.get('_hints', hints).keys()) if hints else []}"
    )

    if not handle_for_search:
        logger.info("[L4-Targeted] No usable creator name — skipping")
        return None

    topic = (concept.get("topic") or concept.get("skill_taught") or "").strip()
    withheld_raw = concept.get("what_creator_withholds") or concept.get("withheld_information") or {}
    withheld_str = (
        withheld_raw if isinstance(withheld_raw, str)
        else " ".join(str(v) for v in withheld_raw.values()) if isinstance(withheld_raw, dict)
        else str(withheld_raw)
    )
    withheld_kw = " ".join(withheld_str.split()[:6])

    # Phase 2: extract hints from transcript layer
    h = hints.get("_hints", hints)  # allow passing raw data dict or wrapped {_hints: data}
    resource_desc = h.get("resource_description") or ""
    domain_mentions = h.get("domain_mentions") or []
    platform_dest = h.get("platform_as_destination") or []

    # Use resource_description from hints if available (more accurate than generic withheld_kw)
    search_resource = resource_desc or withheld_kw or "guide"

    queries = []

    # Phase 2: if hints mention a specific platform, prioritize that platform
    for dm in domain_mentions[:2]:
        dm_clean = dm.lower().strip()
        # Map platform names to domains for site: queries
        platform_map = {
            "gumroad": "gumroad.com", "teachable": "teachable.com",
            "patreon": "patreon.com", "notion": "notion.so",
            "kajabi": "kajabi.com", "podia": "podia.com",
            "etsy": "etsy.com", "substack": "substack.com",
            "ko-fi": "ko-fi.com", "youtube": "youtube.com",
            "stan": "stan.store", "beacons": "beacons.ai",
        }
        for keyword, domain in platform_map.items():
            if keyword in dm_clean:
                queries.append(f'"{handle_for_search}" {search_resource} site:{domain}')
                break

    # Phase 2: if platform_as_destination mentions YouTube, add YouTube crossref query
    for p in platform_dest:
        if "youtube" in p.lower():
            queries.append(f'"{handle_for_search}" youtube channel')
            break

    # Standard creator + platform queries
    for site in RESOURCE_SITES[:4]:
        queries.append(f'"{handle_for_search}" {search_resource} site:{site}')
    queries.append(f'"{handle_for_search}" {search_resource}')
    for site in RESOURCE_SITES[:3]:
        queries.append(f"{topic} {search_resource} site:{site}")

    for query in queries:
        logger.info(f"[L4-Targeted] Query: {query}")
        results = _safe_ddg_search(query, max_results=5)
        clean = [r for r in results if not any(b in r.get("href", "") for b in SEARCH_BLOCKED)]
        clean = [r for r in clean if not is_junk_url(r.get("href", ""))]
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

    logger.info("[L4-Targeted] Nothing found")
    return None


# ── Layer 5: Generic DuckDuckGo Search ───────────────────────────────────────

def _check_generic_search(concept: dict, hints: dict = None) -> dict | None:
    """Layer 5: Broad fallback search. Phase 2: uses hints for better query."""
    hints = hints or {}
    topic = (concept.get("topic") or concept.get("skill_taught") or "").strip()
    tools = concept.get("tools_mentioned") or []
    tools_str = " ".join(tools[:3]) if isinstance(tools, list) else ""

    withheld_raw = concept.get("what_creator_withholds") or ""
    withheld_str = (
        withheld_raw if isinstance(withheld_raw, str)
        else " ".join(str(v) for v in withheld_raw.values()) if isinstance(withheld_raw, dict)
        else str(withheld_raw)
    )
    withheld_kw = " ".join(withheld_str.split()[:4])

    # Phase 2: prefer resource_description from hints over generic withheld_kw
    h = hints.get("_hints", hints)
    resource_desc = h.get("resource_description") or ""
    search_kw = resource_desc or withheld_kw

    query = f"{topic} {search_kw} {tools_str} free".strip()
    logger.info(f"[L5-Generic] Query: {query}")

    results = _safe_ddg_search(query, max_results=5)
    clean = [r for r in results if not any(b in r.get("href", "") for b in SEARCH_BLOCKED)]
    clean = [r for r in clean if not is_junk_url(r.get("href", ""))]
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

    logger.info("[L5-Generic] Nothing found")
    return None


# ── Main Entry Point ──────────────────────────────────────────────────────────

def find_promised_link(
    info: dict,           # full yt-dlp info dict
    transcript: str,      # whisper transcript
    concept: dict,        # concept extraction result
    comments: list = [],  # yt-dlp comments list (Phase 0F)
    caption: str = "",   # full caption text (Phase 2 — passed to transcript layer)
) -> dict | None:
    """
    Run all layers in priority order with full isolation.

    Architecture:
    - Each layer is wrapped in its own try/except — one crash cannot kill others
    - Transcript layer runs OUTSIDE the generic loop so its hints can be
      extracted and threaded into search layers 4 and 5
    - DM gate / comment gate / _pure_educational results are returned directly
      (they are valid outcomes, not nulls)
    """
    logger.info("━━━ Link Finder: Starting 7-layer search ━━━")
    logger.info(
        f"[RESOLVER] uploader_id={info.get('uploader_id')} "
        f"uploader={info.get('uploader')} "
        f"channel={info.get('channel')}"
    )

    uploader_id = info.get("uploader_id", "")
    hints: dict = {}  # Phase 2: populated by transcript layer, consumed by search layers

    # ── Instant layers (no network, no LLM) ──────────────────────────────────
    instant_layers = [
        ("comments",  lambda: _check_comments(comments, uploader_id)),
        ("info_dict", lambda: _check_info_dict(info)),
        ("caption",   lambda: _check_caption(info)),
    ]

    for layer_name, layer_fn in instant_layers:
        try:
            logger.info(f"[LAYER:{layer_name}] starting")
            result = layer_fn()
            if result:
                url = result.get("url", "")
                if is_junk_url(url):
                    logger.warning(f"[LAYER:{layer_name}] junk URL blocked: {url}")
                    continue
                logger.info(f"[LAYER:{layer_name}] SUCCESS: {url}")
                result["winner_layer"] = layer_name
                return result
            logger.info(f"[LAYER:{layer_name}] None — continuing")
        except Exception as e:
            logger.error(f"[LAYER:{layer_name}] EXCEPTION: {type(e).__name__}: {e} — continuing")

    # ── Transcript layer — run explicitly to extract hints ────────────────────
    try:
        logger.info("[LAYER:transcript] starting")
        t_result = _check_transcript(transcript, caption)

        if t_result:
            # Gate patterns and explicit URLs are real results — return immediately
            if t_result.get("type") in ("dm_gate", "comment_gate"):
                logger.info(f"[LAYER:transcript] Gate detected: type={t_result['type']} keyword={t_result.get('keyword')}")
                t_result["winner_layer"] = "transcript"
                return t_result

            if "url" in t_result and not is_junk_url(t_result["url"]):
                logger.info(f"[LAYER:transcript] SUCCESS: {t_result['url']}")
                t_result["winner_layer"] = "transcript"
                return t_result

            # Hints and educational signals — save hints, continue
            if t_result.get("_hints"):
                hints = t_result  # pass full dict; search layers unwrap with hints.get('_hints', hints)
                logger.info(f"[LAYER:transcript] Hints extracted for search layers: {t_result.get('_hints')}")

            if t_result.get("_pure_educational"):
                logger.info("[LAYER:transcript] Pure educational reel — no resource promised. Continuing to bio layer.")
        else:
            logger.info("[LAYER:transcript] None — continuing")

    except Exception as e:
        logger.error(f"[LAYER:transcript] EXCEPTION: {type(e).__name__}: {e} — continuing")

    # ── Bio + search layers ───────────────────────────────────────────────────
    late_layers = [
        ("bio",             lambda: _check_creator_bio(info, concept)),
        ("targeted_search", lambda: _check_targeted_search(info, concept, hints=hints)),
        ("generic_search",  lambda: _check_generic_search(concept, hints=hints)),
    ]

    for layer_name, layer_fn in late_layers:
        try:
            logger.info(f"[LAYER:{layer_name}] starting")
            result = layer_fn()
            if result:
                url = result.get("url", "")
                if is_junk_url(url):
                    logger.warning(f"[LAYER:{layer_name}] junk URL blocked: {url}")
                    continue
                logger.info(f"[LAYER:{layer_name}] SUCCESS: {url}")
                result["winner_layer"] = layer_name
                return result
            logger.info(f"[LAYER:{layer_name}] None — continuing")
        except Exception as e:
            logger.error(f"[LAYER:{layer_name}] EXCEPTION: {type(e).__name__}: {e} — continuing")

    logger.info("[RESOLVER] All layers exhausted — no link found")
    return None
