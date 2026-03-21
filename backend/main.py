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

    # Cache check
    cached = get_cached_result(url)
    if cached:
        logger.info(f"Cache hit: {url[:50]}...")
        return {
            "roadmap": cached["roadmap_markdown"],
            "concept": cached.get("concept_summary"),
            "promised_link": cached.get("promised_link"),
            "from_cache": True,
        }

    logger.info(f"Starting analysis: {url[:50]}...")
    temp_dir = tempfile.mkdtemp()

    try:
        # ── 1. Download ────────────────────────────────────────────────────
        download_result = download_reel(url, temp_dir)
        video_path = download_result["video_path"]
        audio_path = download_result["audio_path"]
        info       = download_result["info"]          # full yt-dlp dict
        logger.info(f"Download complete: {video_path}")

        # ── 2. Duration guard ──────────────────────────────────────────────
        duration = float(info.get("duration") or 0)
        if duration > 300:
            raise HTTPException(
                status_code=400,
                detail="Reel is over 5 minutes — too long for the free tier pipeline."
            )

        # ── 3. Transcribe ─────────────────────────────────────────────────
        transcript = transcribe_audio(audio_path)
        logger.info(f"Transcript: {len(transcript)} chars")

        # ── 4. Extract frames ─────────────────────────────────────────────
        frames = extract_frames(video_path, temp_dir)
        logger.info(f"Frames: {len(frames)}")

        # ── 5. Concept analysis ───────────────────────────────────────────
        concept = analyze_concept(transcript, frames)
        logger.info(f"Concept: {concept.get('topic', concept.get('skill_taught', 'unknown'))}")

        # ── 6. Find promised link (all 5 layers) ──────────────────────────
        promised_link = find_promised_link(info, transcript, concept)
        if promised_link:
            logger.info(
                f"Promised link found via [{promised_link.get('source', 'unknown')}] "
                f"confidence={promised_link.get('confidence', '100%')}: {promised_link.get('url', '')}"
            )
        else:
            logger.info("No promised link found across all 5 layers.")

        # ── 7. Generate roadmap ───────────────────────────────────────────
        roadmap = generate_roadmap(concept)
        logger.info(f"Roadmap: {len(roadmap)} chars")

        # ── 8. Cache ──────────────────────────────────────────────────────
        save_result(url, transcript, concept, roadmap, promised_link)
        logger.info("Cached in Supabase.")

        return {
            "roadmap": roadmap,
            "concept": concept,
            "promised_link": promised_link,
            "from_cache": False,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        logger.info("Temp dir cleaned up.")
