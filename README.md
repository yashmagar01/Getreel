# Reel Decoder

> Paste any Instagram Reel URL. Get the complete step-by-step guide the creator was gatekeeping. No follows. No comments. No waiting.

Reel Decoder is a full-stack AI pipeline that reverse-engineers the "follow & comment for the link" pattern used by Instagram creators. It downloads the reel, transcribes the audio, extracts key frames, identifies what the creator is teaching (and withholding), hunts down the promised resource link across 8 signal layers, and generates a complete actionable roadmap — all in under 60 seconds.

---

## How It Works

```
Instagram URL
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│                    8-Stage Pipeline                      │
│                                                          │
│  Rate limit check → Cache lookup → Download reel        │
│  → Transcribe audio → Extract frames → Analyze concept  │
│  → Hunt promised link → Generate roadmap                │
└─────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────┐  ┌───────────────────┐
│  Step-by-step guide  │  │  Promised link     │
│  (Llama 4 Scout)     │  │  (from 8 layers)  │
└──────────────────────┘  └───────────────────┘
```

Progress is streamed to the frontend in real-time via **Server-Sent Events (SSE)**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind CSS v4 → Vercel |
| Backend | Python FastAPI (async) → Render |
| Video download | yt-dlp |
| Audio extraction | ffmpeg |
| Transcription | Groq Whisper (`whisper-large-v3`) |
| Frame extraction | ffmpeg-python + Pillow |
| Concept analysis | Google Gemini 1.5 Pro (vision + JSON) |
| Roadmap generation | Groq Llama 3.3 70B (`llama-3.3-70b-versatile`) |
| Link search | Groq LLM + DuckDuckGo / Serper + Instaloader |
| DM interception | Playwright + Instagrapi (Layer 0) |
| Cache + Rate limit | Supabase (PostgreSQL) |

---

## The Link-Finding Engine (8 Layers)

The `link_finder.py` module runs up to 8 signal layers in order, stopping at the first confident result:

| Layer | Signal | Method |
|---|---|---|
| **-1** | Comments | Scans yt-dlp comment data; creator's comments checked first |
| **0** | yt-dlp metadata | Mines `uploader_url`, `channel_url` from download info dict |
| **1** | Caption | Regex URL extraction from the reel's description |
| **2** | Transcript | Groq LLM structured extraction — detects DM gates, comment gates, explicit URLs, domain mentions |
| **3** | Bio | Instaloader → yt-dlp profile fallback → aggregator resolution (Linktree, Beacons, etc.) |
| **4** | Targeted search | DuckDuckGo / Serper: `@creator topic site:gumroad.com` |
| **5** | Generic search | DuckDuckGo / Serper: fallback keyword search |
| **6** | YouTube crossref | Finds creator's YouTube channel → extracts their bio link |

Layer 2 also detects two special gate types:
- **DM gate** — creator uses automated DM replies with a keyword
- **Comment gate** — creator delivers the link via comment keyword automation

---

## Project Structure

```
reel-decoder/
├── backend/
│   ├── main.py               # FastAPI app — /analyze, /stream-progress, /download, /health
│   ├── downloader.py         # yt-dlp download + ffmpeg audio extraction
│   ├── transcriber.py        # Groq Whisper transcription
│   ├── frame_extractor.py    # Key frame extraction (ffmpeg + base64)
│   ├── analyzer.py           # Gemini 1.5 Pro concept + withholding analysis
│   ├── roadmap_generator.py  # Groq Llama 3.3 70B roadmap generation
│   ├── link_finder.py        # 8-layer promised link resolver
│   ├── dm_interceptor.py     # Playwright + Instagrapi DM automation
│   ├── job_store.py          # SSE job queue + single-use download tokens
│   ├── cache.py              # Supabase result caching
│   ├── rate_limiter.py       # IP-based rate limiting (5 req/hour via Supabase)
│   ├── build.sh              # Render build script (installs ffmpeg + dependencies)
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx          # Main page — idle / loading / result views
    │   ├── layout.tsx
    │   └── globals.css       # Design tokens + animations
    ├── components/
    │   ├── UrlInput.tsx
    │   ├── LoadingState.tsx   # Radar animation + SSE-synced progress
    │   ├── RoadmapDisplay.tsx # Parsed markdown sections with accordion steps
    │   ├── PromisedLinkCTA.tsx # Link card — handles URLs, DM gates, comment gates
    │   ├── DownloadButton.tsx  # Single-use .mp4 download with countdown
    │   ├── Sidebar.tsx        # Section navigation sidebar
    │   ├── StatCard.tsx       # Metric display card
    │   ├── ResultLayout.tsx   # Sidebar + main content layout
    │   └── ui/
    │       └── Card.tsx       # Reusable card with accent variants
    ├── lib/
    │   └── api.ts            # analyzeReel() — POST /analyze + SSE stream
    └── .env.local.example
```

---

## Prerequisites

1. **Groq API Key** — [console.groq.com](https://console.groq.com) (free tier available)
2. **Google Gemini API Key** — [aistudio.google.com](https://aistudio.google.com) (free tier available)
3. **Supabase project** — [supabase.com](https://supabase.com) (free tier)
4. **Instagram cookies.txt** — required for yt-dlp authentication (see below)
5. **ffmpeg** — must be available on `PATH` locally and on Render
6. **Serper API Key** *(optional)* — [serper.dev](https://serper.dev) — improves search quality; falls back to DuckDuckGo if absent

---

## ⚠️ Instagram Cookies — Critical Setup

Instagram requires an authenticated session for yt-dlp to download reels. Without a valid `cookies.txt`, all downloads will fail with a login error.

### Export steps (repeat every 2–4 weeks when downloads stop working):

1. Log into Instagram in **Chrome** or **Firefox**
2. Install **"Get cookies.txt LOCALLY"** from the Chrome Web Store
3. Navigate to `https://www.instagram.com`
4. Click the extension → **Export** → save as `cookies.txt`

### Upload to Render:
1. Go to your Render service → **Environment** tab
2. Under **Secret Files**, add:
   - **Filename**: `cookies.txt`
   - **File path**: `/etc/secrets/cookies.txt`
   - Paste the exported cookie content
3. Set env var: `INSTAGRAM_COOKIES_PATH=/etc/secrets/cookies.txt`

> ⚠️ Sessions expire every 2–4 weeks. When downloads start failing with a login error, re-export and update the Secret File on Render.

---

## Supabase Setup

Run this SQL in your Supabase project's **SQL Editor**:

```sql
create table if not exists reel_cache (
  id uuid primary key default gen_random_uuid(),
  instagram_url text not null unique,
  url_hash text not null unique,
  transcript text,
  concept_summary text,
  roadmap_markdown text not null,
  promised_link jsonb,
  created_at timestamptz default now()
);

create index if not exists reel_cache_url_hash_idx on reel_cache (url_hash);

create table if not exists rate_limits (
  ip_address text not null,
  request_count integer default 1,
  window_start timestamptz default now(),
  primary key (ip_address)
);
```

Then go to **Settings → API** and copy:
- **Project URL** → `SUPABASE_URL`
- **service_role key** (not the anon key) → `SUPABASE_SERVICE_KEY`

---

## Environment Variables

### Backend (`.env`)

```env
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
INSTAGRAM_COOKIES_PATH=/etc/secrets/cookies.txt
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app

# Optional — improves search quality (Layer 4/5)
SERPER_API_KEY=...

# Optional — for DM interception (Layer 0)
INSTAGRAM_USERNAME=your_burner_account
INSTAGRAM_PASSWORD=your_burner_password
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## Local Development

### Backend

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install Playwright browsers (for DM interception)
playwright install chromium

# 4. Copy and fill in env file
copy .env.example .env

# 5. Start the server
uvicorn main:app --reload --port 8000
```

Verify with:
```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

### Frontend

```bash
cd frontend

npm install

# Set backend URL
copy .env.local.example .env.local
# Edit: NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Backend → Render

1. Push the repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your repo, set **Root Directory** to `backend`
4. Set **Build Command**: `./build.sh` *(installs ffmpeg + pip dependencies)*
5. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables from `.env.example`
7. Add `cookies.txt` as a **Secret File** at `/etc/secrets/cookies.txt`
8. Deploy and verify: `https://your-service.onrender.com/health`

> **Note**: `build.sh` handles ffmpeg installation on Render's Linux environment. Do not use `pip install -r requirements.txt` as the build command directly.

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import the GitHub repo, set **Root Directory** to `frontend`
3. Add env var: `NEXT_PUBLIC_BACKEND_URL=https://your-render-service.onrender.com`
4. Deploy

After deploying to Vercel, update `ALLOWED_ORIGINS` in your Render environment to your Vercel domain to allow cross-origin requests.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analyze` | Validates URL, enforces rate limit, starts pipeline, returns `{job_id}` |
| `GET` | `/stream-progress/{job_id}` | SSE stream — pushes `progress` and `done`/`error` events |
| `GET` | `/download/{token}` | Single-use video download — token invalidated after first use |
| `GET` | `/health` | Health check |

### SSE Event Types

```json
// Progress event
{"type": "progress", "stage": "transcribe", "message": "Transcribing audio..."}

// Done event
{
  "type": "done",
  "roadmap": "## What This Reel Is Actually Teaching\n...",
  "concept": {"topic": "...", "target_audience": "...", "tools_mentioned": [...]},
  "promised_link": {"url": "...", "source": "caption", "confidence": "high"},
  "download_token": "abc123",
  "from_cache": false
}

// Error event
{"type": "error", "message": "Pipeline error description"}
```

---

## Free Tier Limits

| Service | Limit | Notes |
|---|---|---|
| Groq (Whisper + Llama) | ~6,000 audio-seconds/day, 100 req/min | ~100 reels/day |
| Gemini 1.5 Pro | 1,500 req/day | |
| Render | 750 hours/month, 512MB RAM | Sleeps after 15 min inactivity |
| Vercel | 100GB bandwidth/month | More than sufficient |
| Supabase | 500MB database | More than sufficient for caching |

Supabase caching ensures the same reel is never processed twice, significantly reducing API usage.

---

## Common Issues

| Problem | Fix |
|---|---|
| Download fails with login error | Re-export `cookies.txt` — Instagram session expired |
| `ffmpeg: command not found` | Install ffmpeg and ensure it is in `PATH`; on Render, use `build.sh` |
| Gemini returns non-JSON | Occasional — the app automatically retries after stripping markdown fences |
| Render cold start (30–60s) | Expected on free tier — the loading screen handles wait time gracefully |
| Rate limited (429) | 5 decodes per hour per IP — wait and try again |
| DuckDuckGo rate limit | Searches retry up to 3 times with random delays; set `SERPER_API_KEY` for reliability |
| `playwright install` required | First run needs `playwright install chromium` for DM interception |
