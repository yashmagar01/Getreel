# Reel Decoder

> Paste any Instagram Reel URL. Get the complete step-by-step guide the creator was hiding. No follows. No comments. No waiting.

Reel Decoder downloads a reel, transcribes its audio, extracts key frames, runs AI analysis with Gemini to understand what the creator is teaching and withholding, then generates a complete actionable roadmap with Groq Llama 3.3 70B.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS → Vercel |
| Backend | Python FastAPI → Render |
| Video download | yt-dlp |
| Audio extraction | ffmpeg |
| Transcription | Groq Whisper (whisper-large-v3) |
| Frame extraction | ffmpeg-python + Pillow |
| Concept analysis | Google Gemini 1.5 Pro |
| Roadmap generation | Groq Llama 3.3 70B (llama-3.3-70b-versatile) |
| Cache + Rate limit | Supabase (PostgreSQL) |

---

## Project Structure

```
reel-decoder/
├── backend/
│   ├── main.py               # FastAPI app — /analyze + /health
│   ├── downloader.py         # yt-dlp + ffmpeg audio
│   ├── transcriber.py        # Groq Whisper
│   ├── frame_extractor.py    # ffmpeg frames + base64
│   ├── analyzer.py           # Gemini concept extraction
│   ├── roadmap_generator.py  # Groq Llama roadmap
│   ├── cache.py              # Supabase caching
│   ├── rate_limiter.py       # IP rate limiting
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
└── frontend/
    ├── app/
    │   ├── page.tsx
    │   ├── layout.tsx
    │   └── globals.css
    ├── components/
    │   ├── UrlInput.tsx
    │   ├── LoadingState.tsx
    │   └── RoadmapDisplay.tsx
    ├── lib/
    │   └── api.ts
    └── .env.local.example
```

---

## Prerequisites

1. **Groq API Key** — [console.groq.com](https://console.groq.com) (free)
2. **Google Gemini API Key** — [aistudio.google.com](https://aistudio.google.com) (free)
3. **Supabase project** — [supabase.com](https://supabase.com) (free tier)
4. **Instagram cookies.txt** — see below
5. **ffmpeg installed** — required on both local machine and Render

---

## ⚠️ Instagram Cookies — Critical Setup

Instagram blocks yt-dlp without an authenticated session. You must export cookies from a logged-in browser. **Without this, all downloads will fail.**

### Export steps (one-time, repeat every 2–4 weeks when downloads stop working):

1. Log into Instagram in **Chrome** or **Firefox**
2. Install the extension **"Get cookies.txt LOCALLY"** from the Chrome Web Store
3. Navigate to `https://www.instagram.com`
4. Click the extension icon → click **Export** → save as `cookies.txt`
5. Keep this file — you'll upload it to Render as a Secret File

### Upload to Render:
1. Go to your Render service → **Environment** tab
2. Under **Secret Files**, create a new file:
   - **Filename**: `cookies.txt`
   - **File path**: `/etc/secrets/cookies.txt`
   - Paste the exported cookies content
3. Set the env var `INSTAGRAM_COOKIES_PATH=/etc/secrets/cookies.txt`

> ⚠️ Instagram sessions expire every 2–4 weeks. When downloads start failing, re-export and update the Secret File on Render.

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
- **service_role key** (not the anon key — scroll down) → `SUPABASE_SERVICE_KEY`

---

## Local Development

### Backend

```bash
cd backend

# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Install ffmpeg (if not already installed)
# Windows: Download from https://ffmpeg.org/download.html and add to PATH
# macOS:   brew install ffmpeg
# Linux:   apt-get install ffmpeg

# 4. Create your .env file
copy .env.example .env     # Windows
# cp .env.example .env     # macOS/Linux
# Fill in your real API keys

# 5. Start the server
uvicorn main:app --reload --port 8000
```

Test the health endpoint:
```bash
curl http://localhost:8000/health
# Expected: {"status":"ok"}
```

### Frontend

```bash
cd frontend

# 1. Install dependencies (already done during setup)
npm install

# 2. Create your .env.local
copy .env.local.example .env.local     # Windows
# Set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Backend → Render

1. Push the `backend/` folder to a GitHub repository
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Set **Root Directory** to `backend`
5. Set **Build Command**: `pip install -r requirements.txt`
6. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables from `.env.example`
8. Add `cookies.txt` as a Secret File at `/etc/secrets/cookies.txt`
9. **Deploy** and test `https://your-service.onrender.com/health`

> **ffmpeg on Render**: Render's Python environment does not include ffmpeg by default. Add a build step or use a Docker environment. The easiest fix: change the build command to `apt-get install -y ffmpeg && pip install -r requirements.txt`.

### Frontend → Vercel

1. Push the `frontend/` folder to GitHub (same repo is fine)
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import the GitHub repo, set **Root Directory** to `frontend`
4. Add env var: `NEXT_PUBLIC_BACKEND_URL=https://your-render-service.onrender.com`
5. **Deploy**

### Supabase → Update CORS

After getting your Vercel URL, update `ALLOWED_ORIGINS` in your Render environment to your Vercel domain.

---

## Free Tier Limits

| Service | Limit | Notes |
|---|---|---|
| Groq (Whisper + Llama) | ~6,000 audio seconds/day, 100 req/min | ~100 reels/day |
| Gemini 1.5 Pro | 1,500 req/day | |
| Render | 750 hours/month, 512MB RAM | Sleeps after 15min inactivity |
| Vercel | 100GB bandwidth | More than enough |
| Supabase | 500MB DB | More than enough for caching |

The Supabase cache means the same reel is never decoded twice — this saves API credits significantly.

---

## Common Issues

| Problem | Fix |
|---|---|
| `yt-dlp` download fails | Re-export `cookies.txt` — your Instagram session expired |
| `ffmpeg not found` | Install ffmpeg and ensure it's in your PATH |
| Gemini returns non-JSON | Normal occasionally — the app retries after stripping markdown |
| Render cold start (~30–60s) | Expected on free tier — the frontend shows a warning after 20s |
| Rate limited (429) | You've decoded 5 reels this hour — wait and try again |
