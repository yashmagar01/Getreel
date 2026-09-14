import glob
import os
import logging
import shutil
import subprocess
import ffmpeg
import yt_dlp
from ig_meta import writable_cookie_copy

logger = logging.getLogger(__name__)


def _resolve_ffmpeg_bin() -> str:
    """Resolve a working ffmpeg binary, checking PATH then local bin/.

    On Render, build.sh drops a static build into backend/bin/ and the
    startCommand prepends it to PATH. If that broke (stale build cache,
    bad tarball layout), fall back to an explicit backend/bin lookup so
    we fail with a clear message instead of FileNotFoundError.
    """
    found = shutil.which("ffmpeg")
    if found:
        return found
    # Fallback: <repo>/backend/bin/ffmpeg (Render rootDir=backend layout)
    here = os.path.dirname(os.path.abspath(__file__))
    candidate = os.path.join(here, "bin", "ffmpeg")
    if os.path.isfile(candidate):
        return candidate
    # Last resort: ./bin/ffmpeg relative to CWD
    candidate2 = os.path.join(os.getcwd(), "bin", "ffmpeg")
    if os.path.isfile(candidate2):
        return candidate2
    return "ffmpeg"  # let ffmpeg-python raise, we wrap with a clear message


def _log_ffmpeg_version() -> None:
    try:
        bin_path = _resolve_ffmpeg_bin()
        out = subprocess.run(
            [bin_path, "-version"],
            capture_output=True, text=True, timeout=15,
        )
        first = (out.stdout or "").splitlines()[0] if out.stdout else ""
        logger.info(f"ffmpeg binary: {bin_path} | {first}")
    except Exception as e:
        logger.error(f"ffmpeg binary check failed: {e}")


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
        # Prefer a muxed file with audio. Old "mp4" selector could pick a
        # video-only format → ffmpeg audio extraction then fails on Render.
        "format": "bv*+ba/b[acodec!=none]/b/best",
        "merge_output_format": "mp4",
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

    # Stage the secret cookie file into our writable temp_dir first.
    # yt-dlp writes merged cookies back into `cookiefile` on exit, so handing
    # it a read-only Render Secret File (/etc/secrets/...) raises
    # OSError [Errno 30] AFTER a successful download, killing the pipeline.
    staged_cookies = writable_cookie_copy(cookies_path, temp_dir)
    if staged_cookies:
        ydl_opts["cookiefile"] = staged_cookies
        logger.info("Using Instagram cookies for download (staged writable copy)")
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
        # yt-dlp + merge may produce reel.mkv/webm if merge failed — accept any reel.*
        candidates = sorted(glob.glob(os.path.join(temp_dir, "reel.*")))
        # Exclude the audio file / cookie copy we may create later
        candidates = [c for c in candidates
                      if os.path.basename(c) not in ("audio.mp3", "ig_cookies.txt")]
        if candidates:
            video_path = candidates[0]
            logger.warning(f"Expected reel.mp4 missing, using {video_path} instead")
        else:
            listing = os.listdir(temp_dir)
            raise Exception(
                "Download appeared to succeed but video file was not created. "
                f"temp_dir contents: {listing}"
            )

    # Log what we actually got (size + streams) — critical for Render debugging.
    try:
        size = os.path.getsize(video_path)
        logger.info(f"Downloaded file: {video_path} ({size} bytes)")
    except Exception:
        pass
    _log_ffmpeg_version()
    try:
        probe = ffmpeg.probe(video_path)
        streams = [(s.get("codec_type"), s.get("codec_name")) for s in probe.get("streams", [])]
        logger.info(f"Probed streams: {streams} | format={probe.get('format', {}).get('format_name')}")
        has_audio = any(s.get("codec_type") == "audio" for s in probe.get("streams", []))
        if not has_audio:
            raise Exception(
                "This reel has no audio track (music-only or silent video). "
                "The decoder needs spoken audio to transcribe."
            )
    except ffmpeg.Error as e:
        stderr = (e.stderr or b"").decode("utf-8", errors="replace") if isinstance(e.stderr, bytes) else str(e.stderr or "")
        logger.error(f"ffprobe failed for {video_path}: {stderr[:2000]}")
        raise Exception(f"Downloaded video could not be read (ffprobe failed): {stderr[:500]}")
    except Exception:
        raise  # re-raise the clear no-audio message above unchanged

    # Extract audio — capture stderr so Render logs show the REAL reason.
    try:
        (
            ffmpeg
            .input(video_path)
            .output(audio_path, format="mp3", acodec="libmp3lame", ac=1, ar="16000")
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        logger.info(f"Audio extracted: {audio_path}")
    except ffmpeg.Error as e:
        raw = e.stderr
        if isinstance(raw, bytes):
            stderr = raw.decode("utf-8", errors="replace")
        else:
            stderr = str(raw or "")
        logger.error(f"ffmpeg audio extraction failed: {stderr[:3000]}")
        raise Exception(f"Failed to extract audio: {stderr[:500] or e}")
    except FileNotFoundError as e:
        logger.error(f"ffmpeg binary not found on PATH: {e}")
        raise Exception(
            "ffmpeg is not installed on the server (binary missing from PATH/bin). "
            "Check Render build logs for the ffmpeg download step."
        )

    return {
        "video_path": video_path,
        "audio_path": audio_path,
        "temp_dir": temp_dir,
        "info": info,          # full yt-dlp dict — link_finder uses this directly
    }
