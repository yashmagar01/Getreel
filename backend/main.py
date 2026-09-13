import sys
import asyncio

# Fix for Windows: SelectorEventLoop doesn't support subprocesses (Playwright needs ProactorEventLoop)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import os
import re
import tempfile
import shutil
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load .env FIRST — before any other module reads environment variables
load_dotenv()
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from urllib.parse import urlparse

from downloader import download_reel
from transcriber import transcribe_audio
from frame_extractor import extract_frames
from analyzer import analyze_concept
from roadmap_generator import generate_roadmap
from content_classifier import classify, normalize_content_type
from content_strategies import get_strategy
from cache import get_cached_result, save_result
from rate_limiter import check_rate_limit
from link_finder import find_promised_link
from dm_interceptor import init_ig_client
from ig_meta import fetch_ig_meta, enrich_info_with_meta
from job_store import (
    create_job, get_queue, delete_queue,
    register_download, get_download_path, delete_download_token,
    cleanup_expired_downloads
)
from capsule_store import create_capsule, get_capsule
import json
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi import BackgroundTasks
import yt_downloader
import os

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)



YT_ALLOWED_HOSTS = frozenset({"youtube.com", "youtu.be", "m.youtube.com"})


class YTDownloadRequest(BaseModel):
    url: str = Field(..., max_length=2000)
    quality: str = "best" # e.g., '1080p', '720p', '480p', 'audio', 'best'

    @field_validator("url")
    @classmethod
    def _validate_youtube_url(cls, v: str) -> str:
        """Allow only YouTube watch/shorts/share URLs (SSRF guard)."""
        url = (v or "").strip()
        try:
            parsed = urlparse(url)
        except Exception:
            raise ValueError("Invalid URL.")
        if parsed.scheme not in ("http", "https"):
            raise ValueError("Only YouTube domains are permitted (http/https YouTube URLs only).")
        host = (parsed.hostname or "").lower()
        if host.startswith("www."):
            host = host[4:]
        if host not in YT_ALLOWED_HOSTS:
            raise ValueError("Only YouTube domains are permitted (youtube.com, youtu.be, m.youtube.com).")
        return url


# ── Content-strategy helpers (Phase B/C/D: additive, legacy-safe) ─────────────
def _content_payload_from_cache(cached: dict) -> dict:
    """Build the additive content_type/blocks payload for a cache hit.

    Legacy rows (no content_type/blocks) fall back to a single
    `markdown_document` block wrapping the stored markdown, so the new
    generic renderer handles old and new rows identically.
    """
    content_type = normalize_content_type(cached.get("content_type"))
    blocks = cached.get("blocks")
    if isinstance(blocks, str):
        try:
            blocks = json.loads(blocks)
        except Exception:
            blocks = None
    # Legacy row (or failed normalisation): wrap stored markdown.
    # NOTE: get() default only applies when the key is *missing*; legacy
    # rows may carry content_type=None explicitly, so handle that too.
    if not blocks and cached.get("roadmap_markdown"):
        if not cached.get("content_type"):
            content_type = "teaser_tutorial"
        blocks = [{"type": "markdown_document", "title": "Roadmap",
                   "body": cached["roadmap_markdown"]}]
    return {"content_type": content_type, "blocks": blocks or []}


# ── URL Validation ────────────────────────────────────────────────────────────
# Accepts both /reel/ and /p/ URLs (oEmbed pre-flight supports both).
INSTAGRAM_REEL_PATTERN = re.compile(
    r"https://(www\.)?instagram\.com/(reel|p)/[A-Za-z0-9_-]+/?(\?.*)?\S*$"
)


def validate_reel_url(url: str) -> bool:
    return bool(INSTAGRAM_REEL_PATTERN.match(url.strip()))


def _blocks_to_markdown(blocks: list) -> str:
    """Synthesize legacy markdown from structured blocks (backward compat)."""
    parts: list[str] = []
    for b in blocks or []:
        btype = b.get("type", "")
        title = b.get("title", "")
        if btype == "markdown_document" and b.get("body"):
            return b["body"]
        if btype in ("quick_summary", "recap_card"):
            body = b.get("body") or b.get("summary") or ""
            parts.append(f"## {title or 'Summary'}\n{body}".strip())
        elif btype in ("scene_list", "technique_list"):
            lines = [f"## {title or 'Breakdown'}"]
            for item in b.get("items") or []:
                heading = item.get("heading") or item.get("name") or ""
                body = item.get("body") or ""
                lines.append(f"- **{heading}**: {body}" if heading else f"- {body}")
            parts.append("\n".join(lines))
        elif btype == "comparison_table":
            cols = b.get("columns") or []
            rows = b.get("rows") or []
            lines = [f"## {title or 'Comparison'}"]
            if cols:
                lines.append(" | ".join(cols))
            for row in rows:
                lines.append(" | ".join(str(c) for c in row))
            parts.append("\n".join(lines))
        elif btype == "list_section":
            lines = [f"## {title or 'Details'}"]
            lines += [f"- {i}" for i in (b.get("items") or [])]
            parts.append("\n".join(lines))
    return "\n\n".join(p for p in parts if p.strip()) or "Unable to generate roadmap. Please try again."


# ── Startup/shutdown ──────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Layer 0 Instagram client (burner account)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, init_ig_client)
    
    # Background task for periodic cleanup of expired downloads
    async def periodic_cleanup():
        while True:
            await asyncio.sleep(300)
            cleanup_expired_downloads()

    asyncio.create_task(periodic_cleanup())
    
    logger.info("Server is warm and ready ✅")
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Reel Decoder API", lifespan=lifespan)

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ── Request Schema ────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    instagram_url: str


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Instant Metadata Pre-flight (oEmbed) ──────────────────────────────────────
@app.post("/reel-info")
async def reel_info(request: AnalyzeRequest):
    """
    Zero-cost instant metadata pre-flight via Instagram's public oEmbed API.
    Returns the full caption, author handle, and thumbnail in ~1s —
    no download, no Whisper, no LLM.
    """
    url = str(request.instagram_url).strip()

    if not INSTAGRAM_REEL_PATTERN.match(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL. Please paste a link like: https://www.instagram.com/reel/... or https://www.instagram.com/p/..."
        )

    try:
        meta = await fetch_ig_meta(url)
        return meta
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.warning(f"/reel-info pre-flight failed: {e}")
        raise HTTPException(status_code=502, detail=f"Could not fetch reel metadata: {e}")


# ── SSE Progress Endpoint ─────────────────────────────────────────────────────
@app.get("/stream-progress/{job_id}")
async def stream_progress(job_id: str):
    """
    SSE endpoint. Client connects here immediately after receiving job_id.
    Backend pushes progress events as the pipeline runs.
    Connection closes when backend pushes a 'done' or 'error' event.
    """
    queue = get_queue(job_id)
    if not queue:
        return JSONResponse({"error": "job not found"}, status_code=404)

    async def event_generator():
        try:
            while True:
                # 5.5 minute timeout (330s)
                event = await asyncio.wait_for(queue.get(), timeout=330)
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("type") in ("done", "error"):
                    break
        except asyncio.TimeoutError:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Pipeline timed out'})}\n\n"
        finally:
            delete_queue(job_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # critical for Nginx/Render proxies
        }
    )


# ── Download Endpoint ─────────────────────────────────────────────────────────
@app.get("/download/{token}")
async def download_video(token: str):
    """
    Streams the video file to the client.
    Deletes the file and token after streaming.
    Single-use: token is invalidated after first download.
    """
    video_path = get_download_path(token)
    if not video_path or not os.path.exists(video_path):
        return JSONResponse({"error": "Download link expired or invalid"}, status_code=404)

    delete_download_token(token)
    filename = os.path.basename(video_path)

    async def file_streamer():
        try:
            with open(video_path, "rb") as f:
                while chunk := f.read(1024 * 1024):  # 1MB chunks
                    yield chunk
        finally:
            try:
                os.remove(video_path)
                logger.info(f"Download complete, cleaned up {video_path}")
            except Exception as e:
                logger.error(f"Cleanup after download failed: {e}")

    return StreamingResponse(
        file_streamer(),
        media_type="video/mp4",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        }
    )


# ── Main Endpoint ─────────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(request: AnalyzeRequest, req: Request):
    url = str(request.instagram_url).strip()

    if not INSTAGRAM_REEL_PATTERN.match(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL. Please paste a link like: https://www.instagram.com/reel/... or https://www.instagram.com/p/..."
        )

    client_ip = req.client.host if req.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="You've decoded 5 reels this hour. Please wait before decoding more."
        )

    job_id = create_job()
    queue = get_queue(job_id)

    async def push(stage: str, message: str):
        await queue.put({"type": "progress", "stage": stage, "message": message})

    async def run_pipeline():
        temp_dir = None
        video_path = None
        try:
            # 1. Cache check
            await push("cache", "Checking if we've seen this reel before...")
            cached = get_cached_result(url)
            if cached:
                logger.info(f"Cache hit: {url[:50]}...")
                content_payload = _content_payload_from_cache(cached)
                await queue.put({
                    "type": "done",
                    "roadmap": cached["roadmap_markdown"],
                    "concept": cached.get("concept_summary"),
                    "promised_link": cached.get("promised_link"),
                    "download_token": None,
                    "from_cache": True,
                    "content_type": content_payload["content_type"],
                    "blocks": content_payload["blocks"],
                })
                return

            await push("download", "Downloading the reel from Instagram...")
            # ── Step 0: Instant oEmbed pre-flight (Bug 0D + caption fix) ──
            # Best-effort: on any failure the pipeline proceeds on the yt-dlp path.
            ig_meta: dict | None = None
            try:
                ig_meta = await fetch_ig_meta(url)
                await queue.put({"type": "meta", "meta": ig_meta})
            except Exception as e:
                logger.warning(f"oEmbed pre-flight failed, continuing with yt-dlp path: {e}")
                ig_meta = None

            temp_dir = tempfile.mkdtemp()
            download_result = download_reel(url, temp_dir)
            video_path = download_result["video_path"]
            audio_path = download_result["audio_path"]
            info       = download_result["info"]
            # Enrich yt-dlp info with oEmbed metadata: fixes numeric
            # uploader_id (Bug 0D) and truncated descriptions.
            info = enrich_info_with_meta(info, ig_meta)
            comments   = info.get("comments") or []
            description = info.get("description") or ""

            # Duration guard
            duration = float(info.get("duration") or 0)
            if duration > 300:
                await queue.put({"type": "error", "message": "Reel is over 5 minutes — too long for the free tier pipeline."})
                return

            await push("transcribe", "Transcribing audio with Whisper AI...")
            transcript = transcribe_audio(audio_path)

            await push("frames", "Extracting key video frames...")
            frames = extract_frames(video_path, temp_dir)

            await push("analyze", "Analyzing with Llama 4 Scout...")
            concept = analyze_concept(transcript, frames)

            await push("classify", "Figuring out what kind of reel this is...")
            classification = classify(concept, transcript)
            logger.info(f"Content classified as {classification.content_type} (confidence={classification.confidence})")

            await push("link", "Hunting for the promised link...")
            promised_link = await find_promised_link(info, transcript, concept, comments=comments, caption=description)

            await push("roadmap", "Writing your result...")
            strategy = get_strategy(classification.content_type)
            result = strategy.generate(concept, transcript)
            result["content_type"] = classification.content_type
            blocks = result.get("blocks") or []
            # Legacy `roadmap` field: prefer the strategy's markdown; otherwise
            # synthesize a readable markdown from blocks so old clients keep working.
            roadmap = result.get("roadmap_markdown") or _blocks_to_markdown(blocks)
            # Phase A/B parity guard: teaser path must behave exactly as before.
            if classification.content_type == "teaser_tutorial" and not result.get("roadmap_markdown"):
                roadmap = generate_roadmap(concept)
                blocks = [{"type": "markdown_document", "title": "Roadmap", "body": roadmap}]

            # Guarantee non-null fields
            roadmap = roadmap or "Unable to generate roadmap. Please try again."
            if not concept or not concept.get("topic"):
                concept = concept or {}
                concept.update({
                    "topic": concept.get("topic") or "Could not extract topic",
                    "what_creator_shows": concept.get("what_creator_shows") or "",
                    "what_creator_withholds": concept.get("what_creator_withholds") or "",
                    "target_audience": concept.get("target_audience") or "",
                    "tools_mentioned": concept.get("tools_mentioned") or [],
                    "key_concepts": concept.get("key_concepts") or []
                })

            # Register video for download
            download_token = register_download(video_path)
            # We don't null video_path here because we need it for cleanup skip logic below
            # but we define a separate variable for the registry

            # Cache
            save_result(url, transcript, concept, roadmap, promised_link,
                        content_type=classification.content_type, blocks=blocks)

            # Create shareable capsule
            capsule_data = {
                "reel_url": url,
                "topic": concept.get("topic", ""),
                "transcript": transcript,
                "concept_summary": concept,
                "roadmap_markdown": roadmap,
                "promised_link": promised_link,
                "content_type": classification.content_type,
                "blocks": blocks,
            }
            capsule_id = create_capsule(capsule_data)
            
            await queue.put({
                "type": "done",
                "roadmap": roadmap,
                "concept": concept,
                "promised_link": promised_link,
                "download_token": download_token,
                "from_cache": False,
                "capsule_id": capsule_id,
                "content_type": classification.content_type,
                "blocks": blocks,
            })

        except Exception as e:
            logger.error(f"Pipeline error: {e}")
            await queue.put({"type": "error", "message": str(e)})
        finally:
            if temp_dir and os.path.exists(temp_dir):
                for f in os.listdir(temp_dir):
                    fpath = os.path.join(temp_dir, f)
                    if video_path and fpath == video_path:
                        continue # Keep the video for download
                    try:
                        if os.path.isfile(fpath) or os.path.islink(fpath):
                            os.remove(fpath)
                        elif os.path.isdir(fpath):
                            shutil.rmtree(fpath)
                    except Exception as e:
                        logger.error(f"Failed to delete {fpath}: {e}")
                
                # We can't delete temp_dir if video_path is still in it.
                # If video_path was never created, delete temp_dir.
                if not video_path or not os.path.exists(video_path):
                    shutil.rmtree(temp_dir, ignore_errors=True)
                    logger.info("Temp dir cleaned up.")
                else:
                    logger.info(f"Temp dir preserved for video download: {video_path}")

    asyncio.create_task(run_pipeline())

    return JSONResponse({"job_id": job_id})


# ── Capsule Endpoints ──────────────────────────────────────────────────────────

capsule_results: dict[str, dict] = {}

@app.post("/capsule")
async def save_capsule(data: dict):
    capsule_id = create_capsule(data)
    return {"capsule_id": capsule_id}

@app.get("/capsule/{capsule_id}")
async def get_capsule_endpoint(capsule_id: str):
    data = get_capsule(capsule_id)
    if not data:
        raise HTTPException(status_code=404, detail="Capsule not found")
    return data


@app.post("/api/youtube/download")
async def download_youtube(req: YTDownloadRequest):
    try:
        file_path, work_dir, title = await yt_downloader.download_yt_video(req.url, req.quality)

        ext = os.path.splitext(file_path)[1]  # .mp4 or .m4a
        is_audio = (req.quality == "audio")
        safe_title = yt_downloader._safe_filename(title)
        filename = f"{safe_title}{ext}"
        media_type = "audio/mp4" if is_audio else "video/mp4"

        async def stream_and_cleanup():
            try:
                with open(file_path, "rb") as f:
                    while chunk := f.read(1024 * 1024):  # 1 MB chunks
                        yield chunk
            finally:
                shutil.rmtree(work_dir, ignore_errors=True)
                logger.info(f"YT download complete, cleaned up {work_dir}")

        return StreamingResponse(
            stream_and_cleanup(),
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except Exception as e:
        logger.error(f"YouTube download failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

