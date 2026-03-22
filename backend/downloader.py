import os
import logging
import ffmpeg
import yt_dlp

logger = logging.getLogger(__name__)


def download_reel(url: str, temp_dir: str) -> dict:
    """
    Downloads reel video + audio.
    Returns { video_path, audio_path, info }
    'info' is the full yt-dlp info dict — contains description,
    uploader_id, comments, duration, and all metadata.
    """
    cookies_path = os.getenv("INSTAGRAM_COOKIES_PATH")
    video_path = os.path.join(temp_dir, "reel.mp4")
    audio_path = os.path.join(temp_dir, "audio.mp3")

    ydl_opts = {
        "format": "mp4",
        "outtmpl": os.path.join(temp_dir, "reel.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "getcomments": True,
        "extractor_args": {
            "instagram": {"max_comments": ["50"]},
        },
        "http_headers": {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/122.0.0.0 Safari/537.36"
            )
        },
    }

    if cookies_path and os.path.exists(cookies_path):
        ydl_opts["cookiefile"] = cookies_path
        logger.info("Using Instagram cookies for download")
    else:
        logger.warning("No cookies file found — download may fail")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            comments = info.get("comments") or []
            description = info.get("description") or ""
            handle = info.get("uploader_id") or info.get("uploader") or "unknown"
            logger.info(
                f"Downloaded reel. Handle: @{handle} | "
                f"Caption length: {len(description)} chars | "
                f"Comments: {len(comments)}"
            )
    except yt_dlp.utils.DownloadError as e:
        msg = str(e).lower()
        logger.error(f"yt-dlp error: {e}") # Log raw error for diagnostics
        
        if "private" in msg:
            raise Exception("This reel is from a private account. Only public reels are supported.")
        
        if "login" in msg or "rate-limit" in msg or "429" in msg:
            raise Exception("Instagram is currently limiting access. Please try again in a few minutes.")
            
        if "empty media response" in msg:
            raise Exception("This reel could not be fetched — it may be a collaborative post or age-restricted content.")
            
        if "not found" in msg or "does not exist" in msg:
            raise Exception("This reel no longer exists or has been removed.")
            
        raise Exception(
            f"Could not download this reel. Instagram access is restricted. Details: {e}"
        )

    if not os.path.exists(video_path):
        raise Exception("Download appeared to succeed but video file was not created.")

    # Extract audio
    try:
        (
            ffmpeg
            .input(video_path)
            .output(audio_path, format="mp3", acodec="libmp3lame", ac=1, ar="16000")
            .overwrite_output()
            .run(quiet=True)
        )
        logger.info(f"Audio extracted: {audio_path}")
    except ffmpeg.Error as e:
        raise Exception(f"Failed to extract audio: {e}")

    return {
        "video_path": video_path,
        "audio_path": audio_path,
        "temp_dir": temp_dir,
        "info": info,          # full yt-dlp dict — link_finder uses this directly
    }
