import os
import logging
import ffmpeg
import yt_dlp

logger = logging.getLogger(__name__)


def download_reel(instagram_url: str, temp_dir: str) -> dict:
    """
    Download an Instagram reel and extract its audio track.
    Also fetches comments for the link-finder feature.

    Returns:
        {"video_path": str, "audio_path": str, "comments": list}

    Raises:
        Exception: Human-readable message if download or extraction fails.
    """
    video_path = os.path.join(temp_dir, "reel.mp4")
    audio_path = os.path.join(temp_dir, "audio.mp3")

    ydl_opts = {
        "format": "mp4",
        "outtmpl": os.path.join(temp_dir, "reel.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "getcomments": True,   # fetch comments for link-finder
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

    # Add cookies if the file exists (required for Instagram authentication)
    cookies_path = os.getenv("INSTAGRAM_COOKIES_PATH")
    if cookies_path and os.path.exists(cookies_path):
        ydl_opts["cookiefile"] = cookies_path
        logger.info("Using Instagram cookies for download")
    else:
        logger.warning(
            "No cookies file found at INSTAGRAM_COOKIES_PATH. "
            "Instagram may block unauthenticated requests."
        )

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(instagram_url, download=True)
            comments = info.get("comments", []) or []
            logger.info(f"Downloaded reel. Comments fetched: {len(comments)}")
    except yt_dlp.utils.DownloadError as e:
        err = str(e).lower()
        if "private" in err and "login" not in err and "rate" not in err:
            raise Exception(
                "This reel is from a private account. "
                "The app can only process public reels."
            )
        elif "login" in err or "authentication" in err or "rate" in err or "not available" in err:
            raise Exception(
                "Instagram is blocking the download — cookies are missing or expired. "
                "Please place a fresh cookies.txt in the backend/ folder (see README)."
            )
        elif "not found" in err or "does not exist" in err or "404" in err:
            raise Exception(
                "This reel no longer exists or has been removed by the creator."
            )
        else:
            raise Exception(
                "Could not download this reel. It may be private or Instagram "
                "is blocking the request. If this keeps happening, the session "
                "cookies may have expired — re-export and update the secret file on Render."
            )
    except Exception as e:
        raise Exception(f"Could not download this reel: {str(e)}")

    # Verify video file was actually created
    if not os.path.exists(video_path):
        raise Exception(
            "Download appeared to succeed but no video file was saved. "
            "This can happen if Instagram returned an unsupported format."
        )

    # Extract audio track using ffmpeg
    try:
        (
            ffmpeg
            .input(video_path)
            .output(audio_path, acodec="mp3", audio_bitrate="128k")
            .overwrite_output()
            .run(quiet=True)
        )
        logger.info(f"Audio extracted to {audio_path}")
    except ffmpeg.Error as e:
        raise Exception(f"Audio extraction failed: {e.stderr.decode() if e.stderr else str(e)}")

    return {
        "video_path": video_path,
        "audio_path": audio_path,
        "comments": comments,
    }
