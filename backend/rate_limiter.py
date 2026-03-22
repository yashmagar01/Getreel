import os
import logging
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

logger = logging.getLogger(__name__)

MAX_REQUESTS_PER_HOUR = 5


def _get_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise Exception("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.")
    return create_client(url, key)


def check_rate_limit(ip_address: str) -> bool:
    """
    Check whether an IP address is within the rate limit.

    Returns:
        True  → request is allowed
        False → request should be rejected (429)

    Logic:
    - If IP not seen before: insert with count=1, allow.
    - If IP seen but window_start > 1 hour ago: reset count to 1, allow.
    - If IP seen within window and count < MAX: increment count, allow.
    - If IP seen within window and count >= MAX: block.
    """
    # Bypass rate limit for local development (testers)
    if ip_address in ("127.0.0.1", "localhost", "::1"):
        logger.info(f"Rate limit bypass allowed for local IP: {ip_address}")
        return True

    try:
        client = _get_client()
        now = datetime.now(timezone.utc)
        one_hour_ago = now - timedelta(hours=1)

        response = (
            client.table("rate_limits")
            .select("*")
            .eq("ip_address", ip_address)
            .limit(1)
            .execute()
        )

        if not response.data:
            # First request from this IP
            client.table("rate_limits").insert({
                "ip_address": ip_address,
                "request_count": 1,
                "window_start": now.isoformat(),
            }).execute()
            return True

        row = response.data[0]
        window_start = datetime.fromisoformat(row["window_start"].replace("Z", "+00:00"))
        count = row["request_count"]

        if window_start < one_hour_ago:
            # Window has expired — reset
            client.table("rate_limits").update({
                "request_count": 1,
                "window_start": now.isoformat(),
            }).eq("ip_address", ip_address).execute()
            return True

        if count < MAX_REQUESTS_PER_HOUR:
            # Within window, increment
            client.table("rate_limits").update({
                "request_count": count + 1,
            }).eq("ip_address", ip_address).execute()
            return True

        # Over limit
        return False

    except Exception as e:
        # Rate limiter failure should NOT block legitimate requests
        logger.warning(f"Rate limiter error (allowing request): {str(e)}")
        return True
