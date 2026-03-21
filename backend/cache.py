import os
import hashlib
import json
from supabase import create_client, Client


def _get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise Exception("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.")
    return create_client(url, key)


def _hash_url(url: str) -> str:
    """SHA-256 hash of a URL (normalizes trailing slashes / query params implicitly)."""
    return hashlib.sha256(url.strip().encode()).hexdigest()


def get_cached_result(url: str) -> dict | None:
    """
    Look up a previously decoded reel by URL.

    Returns the full row dict if found, None if not cached.
    """
    try:
        client = _get_client()
        url_hash = _hash_url(url)
        response = (
            client.table("reel_cache")
            .select("*")
            .eq("url_hash", url_hash)
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]
        return None
    except Exception as e:
        # Cache miss is non-fatal — log and continue
        import logging
        logging.getLogger(__name__).warning(f"Cache lookup failed: {str(e)}")
        return None


def save_result(url: str, transcript: str, concept: dict, roadmap: str) -> None:
    """
    Save a decoded reel result to Supabase.
    Uses upsert (on conflict do nothing) so duplicate processing never crashes.
    """
    try:
        client = _get_client()
        url_hash = _hash_url(url)
        row = {
            "instagram_url": url.strip(),
            "url_hash": url_hash,
            "transcript": transcript,
            "concept_summary": json.dumps(concept),
            "roadmap_markdown": roadmap,
        }
        client.table("reel_cache").upsert(row, on_conflict="url_hash").execute()
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Cache save failed (non-fatal): {str(e)}")
