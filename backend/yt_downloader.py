import yt_dlp
import os
import re
import tempfile
import asyncio
import logging
import shutil

logger = logging.getLogger(__name__)

# YouTube no longer serves pre-muxed streams — must request video+audio separately.
FORMAT_MAP = {
    "best":  "bestvideo+bestaudio/best",
    "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
    "720p":  "bestvideo[height<=720]+bestaudio/best[height<=720]",
    "480p":  "bestvideo[height<=480]+bestaudio/best[height<=480]",
    "audio": "bestaudio/best",
}

_HERE = os.path.dirname(os.path.abspath(__file__))
_COOKIES_FILE = os.path.join(_HERE, "cookies.txt")

# Explicitly ensure our bin/ directory is in PATH so yt-dlp can find deno/ffmpeg
BIN_DIR = os.path.join(os.path.dirname(_HERE), "bin")
if BIN_DIR not in os.environ.get("PATH", ""):
    os.environ["PATH"] = f"{BIN_DIR}{os.pathsep}{os.environ.get('PATH', '')}"


def _safe_filename(title: str, max_len: int = 100) -> str:
    """Strip characters that are illegal in filenames."""
    return re.sub(r'[\\/*?:"<>|]', "_", title).strip()[:max_len] or "youtube_download"


def _get_cookiefile() -> str | None:
    """
    Return path to cookies.txt only if it contains YouTube/Google cookies.
    """
    if not os.path.isfile(_COOKIES_FILE):
        return None
    try:
        with open(_COOKIES_FILE, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        if any(d in content for d in (".youtube.com", "youtube.com", ".google.com")):
            return _COOKIES_FILE
    except OSError:
        pass
    return None


async def download_yt_video(url: str, quality: str = "best") -> tuple[str, str, str]:
    """
    Downloads a YouTube video/audio with embedded metadata + thumbnail.
    We implement a robust fallback mechanism here to bypass Datacenter IP bot checks.
    """
    work_dir = tempfile.mkdtemp()
    
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
                raise Exception(f"YouTube rejected the download request. The video might be restricted or YouTube is blocking the server. Details: {e2}")
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
    postprocessors.append({"key": "FFmpegMetadata"})
    postprocessors.append({"key": "EmbedThumbnail"})

    ydl_opts: dict = {
        "format":          format_spec,
        "outtmpl":         outtmpl,
        "quiet":           True,
        "noplaylist":      True,
        "writethumbnail":  True,
        "postprocessors":  postprocessors,
        # Download the EJS challenge solver from GitHub automatically.
        "remote_components": ["ejs:github"],
        "http_headers": {
            # Standard browser User-Agent to match typical cookie origins and reduce bot flags
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
    }
    
    if not is_audio:
        ydl_opts["merge_output_format"] = "mp4"

    if use_cookies:
        cookiefile = _get_cookiefile()
        if cookiefile:
            temp_cookiefile = os.path.join(work_dir, "temp_cookies.txt")
            shutil.copy2(cookiefile, temp_cookiefile)
            ydl_opts["cookiefile"] = temp_cookiefile
            ydl_opts["extractor_args"] = {"youtube": ["player_client=ios,android,web"]}
        else:
            use_cookies = False

    if not use_cookies:
        # Without cookies, the web client is heavily blocked on datacenter IPs. 
        # We explicitly force ios and android clients which have different API restrictions.
        ydl_opts["extractor_args"] = {"youtube": ["player_client=ios,android"]}

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

    want_ext = ".m4a" if is_audio else ".mp4"
    candidates = [
        f for f in os.listdir(work_dir)
        if f.endswith(want_ext) and not f.endswith(".part") and f.count(".") == 1
    ]

    if not candidates:
        all_files = [f for f in os.listdir(work_dir) if not f.endswith(".part") and "temp_cookies" not in f]
        if not all_files:
            raise Exception("Download failed — no output file produced.")
        candidates = [max(all_files, key=lambda f: os.path.getsize(os.path.join(work_dir, f)))]

    file_path = os.path.join(work_dir, candidates[0])
    return file_path, work_dir, title
