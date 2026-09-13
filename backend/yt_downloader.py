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


def _safe_filename(title: str, max_len: int = 100) -> str:
    """Strip characters that are illegal in filenames."""
    return re.sub(r'[\\/*?:"<>|]', "_", title).strip()[:max_len] or "youtube_download"


def _get_cookiefile() -> str | None:
    """
    Return path to cookies.txt only if it contains YouTube/Google cookies.
    The web client (which supports cookies) also supports the n-challenge when
    cookies provide a valid session — this is the supported path per the yt-dlp wiki.
    """
    if not os.path.isfile(_COOKIES_FILE):
        return None
    try:
        with open(_COOKIES_FILE, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        if any(d in content for d in (".youtube.com", "youtube.com", ".google.com")):
            logger.info("YouTube: using cookies.txt for auth")
            return _COOKIES_FILE
    except OSError:
        pass
    return None


async def download_yt_video(url: str, quality: str = "best") -> tuple[str, str, str]:
    """
    Downloads a YouTube video/audio with embedded metadata + thumbnail.
    Returns (file_path, work_dir, video_title).
    Caller must shutil.rmtree(work_dir) after streaming.
    quality: 'best' | '1080p' | '720p' | '480p' | 'audio'

    Client selection strategy
    ─────────────────────────
    We do NOT set player_client explicitly. yt-dlp's built-in defaults (as of
    2026.8.x) already pick clients that work without a PO Token and without
    Deno/Node. Overriding this caused "Skipping client" warnings and format
    unavailability errors.

    Cookies are passed only if cookies.txt contains YouTube/Google entries —
    the web client (which uses cookies) handles the n-challenge internally
    when a valid session cookie is present.
    """
    format_spec = FORMAT_MAP.get(quality, FORMAT_MAP["best"])
    is_audio = (quality == "audio")

    work_dir = tempfile.mkdtemp()
    stem = "audio" if is_audio else "video"
    outtmpl = os.path.join(work_dir, f"{stem}.%(ext)s")

    postprocessors: list[dict] = []
    if is_audio:
        postprocessors.append({
            "key": "FFmpegExtractAudio",
            "preferredcodec": "m4a",
        })
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
        # Requires Deno to be installed — yt-dlp uses it to solve YouTube's
        # JS n-challenge when cookies+web client are in play.
        # Per: https://github.com/yt-dlp/yt-dlp/wiki/EJS
        "remote_components": ["ejs:github"],
        # Let yt-dlp choose the best client — don't override player_client
    }
    if not is_audio:
        ydl_opts["merge_output_format"] = "mp4"

    # Attach cookies only when they contain YouTube/Google entries
    cookiefile = _get_cookiefile()
    if cookiefile:
        temp_cookiefile = os.path.join(work_dir, "temp_cookies.txt")
        shutil.copy2(cookiefile, temp_cookiefile)
        ydl_opts["cookiefile"] = temp_cookiefile
    else:
        logger.info("YouTube: no YouTube cookies in cookies.txt — using default client (no auth)")

    logger.info("YouTube download: url=%s quality=%s", url, quality)

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
        all_files = [f for f in os.listdir(work_dir) if not f.endswith(".part")]
        if not all_files:
            raise Exception("Download failed — no output file produced.")
        candidates = [max(all_files, key=lambda f: os.path.getsize(os.path.join(work_dir, f)))]

    file_path = os.path.join(work_dir, candidates[0])
    return file_path, work_dir, title
