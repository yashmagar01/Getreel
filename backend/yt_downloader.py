import yt_dlp
import os
import re
import tempfile
import asyncio

# YouTube no longer serves pre-muxed streams — must request video+audio separately.
FORMAT_MAP = {
    "best":  "bestvideo+bestaudio/bestvideo",
    "1080p": "bestvideo[height<=1080]+bestaudio/bestvideo[height<=1080]",
    "720p":  "bestvideo[height<=720]+bestaudio/bestvideo[height<=720]",
    "480p":  "bestvideo[height<=480]+bestaudio/bestvideo[height<=480]",
    "audio": "bestaudio",
}

def _safe_filename(title: str, max_len: int = 100) -> str:
    """Strip characters that are illegal in filenames."""
    return re.sub(r'[\\/*?:"<>|]', "_", title).strip()[:max_len] or "youtube_download"

async def download_yt_video(url: str, quality: str = "best") -> tuple[str, str, str]:
    """
    Downloads a YouTube video/audio with embedded metadata + thumbnail.
    Returns (file_path, work_dir, video_title).
    Caller must shutil.rmtree(work_dir) after streaming.
    quality: 'best' | '1080p' | '720p' | '480p' | 'audio'
    """
    format_spec = FORMAT_MAP.get(quality, FORMAT_MAP["best"])
    is_audio = (quality == "audio")

    # Isolated subdirectory — no cross-download file confusion
    work_dir = tempfile.mkdtemp()
    stem = "audio" if is_audio else "video"
    outtmpl = os.path.join(work_dir, f"{stem}.%(ext)s")

    # Build postprocessor chain
    postprocessors: list[dict] = []
    if is_audio:
        postprocessors.append({
            "key": "FFmpegExtractAudio",
            "preferredcodec": "m4a",
        })
    postprocessors.append({"key": "FFmpegMetadata"})   # bakes title/artist/year
    postprocessors.append({"key": "EmbedThumbnail"})   # bakes album art

    ydl_opts = {
        "format": format_spec,
        "outtmpl": outtmpl,
        "quiet": True,
        "writethumbnail": True,          # needed by EmbedThumbnail
        "postprocessors": postprocessors,
    }
    if not is_audio:
        ydl_opts["merge_output_format"] = "mp4"

    title = "youtube_download"

    loop = asyncio.get_event_loop()
    def _download():
        nonlocal title
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url)
            if info:
                title = info.get("title") or title

    await loop.run_in_executor(None, _download)

    # Final file: single dot before extension (skip intermediate streams like video.f137.mp4)
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


