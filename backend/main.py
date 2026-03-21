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
    allow_credentials=True,
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
async def analyze(body: AnalyzeRequest, request: Request):
    url = body.instagram_url.strip()

    # 1. Validate URL format
    if not validate_reel_url(url):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL. Please provide a valid Instagram Reel URL "
                   "(https://www.instagram.com/reel/...).",
        )

    # 2. Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="You've decoded 5 reels this hour. Please wait before decoding more.",
        )

    # 3. Cache check
    cached = get_cached_result(url)
    if cached:
        logger.info(f"Cache hit for URL: {url[:50]}...")
        return {
            "roadmap": cached["roadmap_markdown"],
            "concept": cached.get("concept_summary", ""),
            "from_cache": True,
        }

    # 4. Full pipeline with automatic temp-dir cleanup
    temp_dir = tempfile.mkdtemp()
    try:
        logger.info(f"Starting analysis for URL: {url[:50]}...")

        # Download
        dl = download_reel(url, temp_dir)
        video_path = dl["video_path"]
        audio_path = dl["audio_path"]
        logger.info(f"Download complete. Video: {video_path}")

        # Duration guard — reject reels > 5 minutes
        import ffmpeg as ffmpeg_lib
        probe = ffmpeg_lib.probe(video_path)
        duration = float(probe["format"]["duration"])
        if duration > 300:
            raise Exception(
                "This reel is too long to process on the free tier. "
                "The decoder works best on reels under 5 minutes."
            )

        # Transcribe
        transcript = transcribe_audio(audio_path)
        logger.info(f"Transcript length: {len(transcript)} chars")

        # Extract frames
        frames_b64 = extract_frames(video_path, temp_dir)
        logger.info(f"Extracted {len(frames_b64)} frames")

        # Analyze concept with Gemini
        concept = analyze_concept(transcript, frames_b64)
        logger.info(f"Gemini concept extracted: {concept.get('topic', '')}")

        # Generate roadmap with Groq Llama
        roadmap = generate_roadmap(concept)
        logger.info(f"Roadmap generated. Length: {len(roadmap)} chars")

        # Save to cache
        save_result(url, transcript, concept, roadmap)
        logger.info("Result cached in Supabase.")

        import json
        return {
            "roadmap": roadmap,
            "concept": json.dumps(concept),
            "from_cache": False,
        }

    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)

        # Pass through error messages from the pipeline as-is (they are already user-friendly)
        detail = f"Processing failed: {err_msg}"

        logger.error(f"Pipeline error: {err_msg}")
        raise HTTPException(status_code=500, detail=detail)

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        logger.info("Temp files cleaned up.")
