import yt_dlp
import os
import re
import tempfile
import asyncio
import logging
import shutil
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# ── SSRF guard (defense in depth — the Pydantic model in main.py is the
# primary gate; this protects any direct internal callers of this module) ──
_YT_ALLOWED_HOSTS = frozenset({"youtube.com", "youtu.be", "m.youtube.com"})


def assert_youtube_url(url: str) -> str:
    """Raise ValueError unless url is an http(s) URL on a YouTube host."""
    clean = (url or "").strip()
    try:
        parsed = urlparse(clean)
    except Exception:
        raise ValueError("Invalid URL.")
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Only YouTube domains are permitted (http/https YouTube URLs only).")
    host = (parsed.hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if host not in _YT_ALLOWED_HOSTS:
        raise ValueError("Only YouTube domains are permitted (youtube.com, youtu.be, m.youtube.com).")
    return clean

def _impersonate_target():
    """Return ImpersonateTarget('chrome') if curl_cffi is installed, else None."""
    try:
        import importlib.util
        if importlib.util.find_spec("curl_cffi") is None:
            logger.warning("curl_cffi not installed — skipping impersonate. pip install 'curl_cffi>=0.16.3'.")
            return None
        from yt_dlp.networking.impersonate import ImpersonateTarget
        return ImpersonateTarget.from_str("chrome")
    except Exception as e:
        logger.warning(f"Impersonate/chrome unavailable ({e}) — continuing without it.")
        return None

# YouTube no longer serves pre-muxed streams — must request video+audio separately.
FORMAT_MAP = {
    "best":  "bestvideo+bestaudio/best",
    "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
    "720p":  "bestvideo[height<=720]+bestaudio/best[height<=720]",
    "480p":  "bestvideo[height<=480]+bestaudio/best[height<=480]",
    "audio": "bestaudio/best",
}

_HERE = os.path.dirname(os.path.abspath(__file__))
_YT_COOKIES_FILE = os.path.join(_HERE, "yt_cookies.txt")
_LEGACY_COOKIES_FILE = os.path.join(_HERE, "cookies.txt")

# Explicitly ensure our bin/ directory is in PATH so yt-dlp can find deno/ffmpeg
BIN_DIR = os.path.join(os.path.dirname(_HERE), "bin")
if BIN_DIR not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{BIN_DIR}{os.pathsep}{os.environ.get('PATH', '')}"


def _safe_filename(title: str, max_len: int = 100) -> str:
    """Strip characters that are illegal in filenames."""
    return re.sub(r'[\\/*?:"<>|]', "_", title).strip()[:max_len] or "youtube_download"


def _has_youtube_cookies(path: str) -> bool:
    """True if file exists and looks like YouTube/Google auth cookies."""
    if not path or not os.path.isfile(path):
        return False
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return any(d in content for d in (".youtube.com", "youtube.com", ".google.com"))
    except OSError:
        return False


def _get_cookiefile() -> str | None:
    """
    Resolve YouTube cookies in priority order (first hit wins):
      1. $YOUTUBE_COOKIES_PATH (Render Secret File, e.g. /etc/secrets/yt_cookies.txt)
      2. backend/yt_cookies.txt (local dev — git-ignored)
      3. $YOUTUBE_COOKIES_B64 (base64 Netscape file, written to temp on use)
      4. legacy backend/cookies.txt IF it contains youtube cookies
    Returns None when no usable cookies exist (caller falls back to cookieless).
    """
    # 1. Explicit path (hosted)
    env_path = os.getenv("YOUTUBE_COOKIES_PATH", "").strip()
    if env_path and _has_youtube_cookies(env_path):
        logger.info(f"YouTube cookies: using YOUTUBE_COOKIES_PATH={env_path}")
        return env_path

    # 2. Local dedicated file
    if _has_youtube_cookies(_YT_COOKIES_FILE):
        logger.info("YouTube cookies: using backend/yt_cookies.txt")
        return _YT_COOKIES_FILE

    # 3. Base64 env (Render env-var alternative — materialised per-download)
    # Handled in _materialise_b64_cookies(); just signal presence here.
    if os.getenv("YOUTUBE_COOKIES_B64", "").strip():
        logger.info("YouTube cookies: using YOUTUBE_COOKIES_B64 env")
        return "__B64__"

    # 4. Legacy shared file
    if _has_youtube_cookies(_LEGACY_COOKIES_FILE):
        logger.info("YouTube cookies: using legacy backend/cookies.txt")
        return _LEGACY_COOKIES_FILE

    logger.warning("YouTube cookies: none found (datacenter IPs will be bot-blocked)")
    return None


def _materialise_b64_cookies(work_dir: str) -> str | None:
    """Decode $YOUTUBE_COOKIES_B64 into work_dir/yt_cookies.txt. Returns path or None."""
    import base64
    b64 = os.getenv("YOUTUBE_COOKIES_B64", "").strip()
    if not b64:
        return None
    try:
        raw = base64.b64decode(b64).decode("utf-8", errors="ignore")
        if "youtube.com" not in raw:
            logger.error("YOUTUBE_COOKIES_B64 decoded but contains no youtube cookies")
            return None
        out = os.path.join(work_dir, "yt_cookies_b64.txt")
        with open(out, "w", encoding="utf-8") as f:
            f.write(raw)
        return out
    except Exception as e:
        logger.error(f"Failed to decode YOUTUBE_COOKIES_B64: {e}")
        return None


def _ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None


async def download_yt_video(url: str, quality: str = "best") -> tuple[str, str, str]:
    """
    Downloads a YouTube video/audio with embedded metadata + thumbnail.
    Attempt 1: authenticated (cookies) — required on datacenter IPs.
    Attempt 2: cookieless mobile fallback — works on residential IPs only.
    """
    url = assert_youtube_url(url)
    work_dir = tempfile.mkdtemp()

    has_cookies = _get_cookiefile() is not None
    if not has_cookies:
        logger.warning("No YouTube cookies configured — hosted downloads will likely be bot-blocked. "
                       "Set YOUTUBE_COOKIES_PATH or backend/yt_cookies.txt.")
    
    try:
        # Attempt 1: With cookies (best chance for 1080p, but might hit bot block on datacenter)
        return await _do_download(url, quality, work_dir, use_cookies=True)
    except Exception as e:
        msg = str(e).lower()
        if "bot" in msg or "sign in" in msg or "403" in msg or "forbidden" in msg or "unavailable" in msg:
            logger.warning(f"YouTube bot check triggered with cookies. Falling back to cookieless mobile client... ({e})")
            # Attempt 2: Fallback without cookies using mobile clients to bypass IP block
            try:
                return await _do_download(url, quality, work_dir, use_cookies=False)
            except Exception as e2:
                logger.error(f"Fallback download also failed: {e2}")
                # Clean up work_dir since we are failing
                shutil.rmtree(work_dir, ignore_errors=True)
                if not has_cookies:
                    raise Exception(f"YouTube bot-blocked this server and no cookies are configured. "
                                    f"Add YouTube cookies via YOUTUBE_COOKIES_PATH secret file. Details: {e2}")
                raise Exception(f"YouTube rejected the download request. Cookies may be expired — re-export yt_cookies.txt. Details: {e2}")
        else:
            shutil.rmtree(work_dir, ignore_errors=True)
            raise e


async def _do_download(url: str, quality: str, work_dir: str, use_cookies: bool) -> tuple[str, str, str]:
    format_spec = FORMAT_MAP.get(quality, FORMAT_MAP["best"])
    is_audio = (quality == "audio")

    stem = "audio" if is_audio else "video"
    outtmpl = os.path.join(work_dir, f"{stem}.%(ext)s")

    postprocessors: list[dict] = []
    if is_audio:
        postprocessors.append({"key": "FFmpegExtractAudio", "preferredcodec": "m4a"})
    # Order matters: metadata first, then thumbnail embed.
    postprocessors.append({"key": "FFmpegMetadata", "add_chapters": True, "add_infojson": False})
    postprocessors.append({"key": "EmbedThumbnail", "already_have_thumbnail": False})

    ydl_opts: dict = {
        "format":          format_spec,
        "outtmpl":         outtmpl,
        "quiet":           False,
        "no_warnings":     False,
        "noplaylist":      True,
        "writethumbnail":  True,
        "writeinfojson":   False,
        "writedescription": False,
        "addmetadata":     True,
        "postprocessors":  postprocessors,
        # Retries help on flaky datacenter egress
        "retries":         3,
        "socket_timeout":  30,
        "http_headers": {
            # Standard browser User-Agent to match typical cookie origins and reduce bot flags
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
    }
    
    if not is_audio:
        ydl_opts["merge_output_format"] = "mp4"

    # Chrome impersonation + EJS solver only when curl_cffi is present
    # (Render yes via requirements.txt, bare local system-python maybe no).
    _imp = _impersonate_target()
    if _imp is not None:
        ydl_opts["impersonate"] = _imp
        # EJS challenge solver needs deno + impersonate stack
        ydl_opts["remote_components"] = ["ejs:github"]

    if use_cookies:
        cookiefile = _get_cookiefile()
        if cookiefile == "__B64__":
            cookiefile = _materialise_b64_cookies(work_dir)
        if cookiefile:
            # Copy into work_dir so temp cleanup removes the live copy,
            # never the source secret file.
            temp_cookiefile = os.path.join(work_dir, "temp_cookies.txt")
            shutil.copy2(cookiefile, temp_cookiefile)
            ydl_opts["cookiefile"] = temp_cookiefile
            # With auth, web client gives 1080p + full metadata. Keep
            # mobile clients as fallback *inside* the same session.
            ydl_opts["extractor_args"] = {"youtube": ["player_client=android,ios,web"]}
        else:
            use_cookies = False

    if not use_cookies:
        # Without cookies, the web client is heavily blocked on datacenter IPs. 
        # We explicitly force ios and android clients which have different API restrictions.
        ydl_opts["extractor_args"] = {"youtube": ["player_client=ios,android"]}

    if not _ffmpeg_available():
        logger.warning("ffmpeg NOT in PATH — merge + FFmpegMetadata + EmbedThumbnail will fail")

    logger.info(f"YouTube download: url={url} quality={quality} cookies={use_cookies}")

    title = "youtube_download"

    loop = asyncio.get_event_loop()
    def _download():
        nonlocal title
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url)
            if info:
                title = info.get("title") or title

    await loop.run_in_executor(None, _download)

    # Cleanup sidecars yt-dlp leaves behind (thumbnails, temp cookies)
    for f in os.listdir(work_dir):
        if f.endswith((".webp", ".jpg", ".png")) and f.startswith(("video", "audio")):
            # Keep nothing — thumbnail is already embedded by EmbedThumbnail
            pass

    want_ext = ".m4a" if is_audio else ".mp4"
    candidates = [
        f for f in os.listdir(work_dir)
        if f.endswith(want_ext) and not f.endswith(".part") and f.count(".") == 1
    ]

    if not candidates:
        all_files = [f for f in os.listdir(work_dir) if not f.endswith(".part") and "temp_cookies" not in f and "yt_cookies" not in f]
        if not all_files:
            raise Exception("Download failed — no output file produced.")
        candidates = [max(all_files, key=lambda f: os.path.getsize(os.path.join(work_dir, f)))]

    file_path = os.path.join(work_dir, candidates[0])
    size_mb = os.path.getsize(file_path) / 1e6
    logger.info(f"YouTube done: {file_path} ({size_mb:.1f} MB) cookies={use_cookies} ffmpeg={_ffmpeg_available()}")
    if size_mb < 0.1:
        raise Exception("Download produced a near-empty file — likely bot-blocked or age-restricted.")
    return file_path, work_dir, title
