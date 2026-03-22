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
from pydantic import BaseModel

from downloader import download_reel
from transcriber import transcribe_audio
from frame_extractor import extract_frames
from analyzer import analyze_concept
from roadmap_generator import generate_roadmap
from cache import get_cached_result, save_result
from rate_limiter import check_rate_limit
from link_finder import find_promised_link
from dm_interceptor import init_ig_client
from job_store import (
    create_job, get_queue, delete_queue,
    register_download, get_download_path, delete_download_token,
    cleanup_expired_downloads
)
import json
from fastapi.responses import StreamingResponse, JSONResponse

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

# ── URL Validation ────────────────────────────────────────────────────────────
INSTAGRAM_REEL_PATTERN = re.compile(
    r"https://(www\.)?instagram\.com/reel/[A-Za-z0-9_-]+/?(\?.*)?\S*$"
)


def validate_reel_url(url: str) -> bool:
    return bool(INSTAGRAM_REEL_PATTERN.match(url.strip()))


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
            detail="Invalid URL. Please paste a link like: https://www.instagram.com/reel/..."
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
                await queue.put({
                    "type": "done",
                    "roadmap": cached["roadmap_markdown"],
                    "concept": cached.get("concept_summary"),
                    "promised_link": cached.get("promised_link"),
                    "download_token": None,
                    "from_cache": True
                })
                return

            await push("download", "Downloading the reel from Instagram...")
            temp_dir = tempfile.mkdtemp()
            download_result = download_reel(url, temp_dir)
            video_path = download_result["video_path"]
            audio_path = download_result["audio_path"]
            info       = download_result["info"]
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

            await push("link", "Hunting for the promised link...")
            promised_link = await find_promised_link(info, transcript, concept, comments=comments, caption=description)

            await push("roadmap", "Writing your step-by-step guide...")
            roadmap = generate_roadmap(concept)

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
            save_result(url, transcript, concept, roadmap, promised_link)
            
            await queue.put({
                "type": "done",
                "roadmap": roadmap,
                "concept": concept,
                "promised_link": promised_link,
                "download_token": download_token,
                "from_cache": False
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
