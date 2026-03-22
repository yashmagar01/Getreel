# 🎬 Reel Decoder

> **Get the actual guide, not the teaser.**

Reel Decoder reverse-engineers Instagram "teaser reels" — the ones where creators show you something valuable and then say *"follow and comment to get the full guide."* Instead of playing that game, paste the URL and get a complete step-by-step breakdown in seconds.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Groq](https://img.shields.io/badge/AI-Groq_LPU-orange?style=flat-square)](https://groq.com)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

---

## ✨ What It Does

Paste any public Instagram Reel URL. The pipeline runs automatically:

```
URL → Download → Transcribe audio → Extract frames → AI analysis → Generate guide + Find hidden link
```

1. **Downloads** the reel using yt-dlp with cookie authentication
2. **Transcribes** the spoken audio using Groq Whisper (`whisper-large-v3`)
3. **Extracts** 6 key video frames at strategic timestamps
4. **Analyzes** frames + transcript together using Llama 4 Scout (multimodal)
5. **Finds** the promised link the creator is gatekeeping — via a 5-layer resolver
6. **Generates** a complete structured guide using Llama 3.3 70B
7. **Downloads** the reel as `.mp4` for 15 minutes after decoding

---

## 🖥️ Demo

| Loading Screen | Result Page |
|---|---|
| Real-time pipeline progress via SSE | Sidebar navigation with 6 sections |
| Stage-by-stage updates from backend | Hero insight card + promised link + download |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 15 (App Router) + Tailwind CSS | UI, routing, dark-mode styling |
| **Backend** | Python 3.11 + FastAPI | REST API + SSE streaming |
| **Downloading** | yt-dlp | Instagram reel download with cookie auth |
| **Audio/Video** | ffmpeg + ffmpeg-python | Audio extraction, frame capture |
| **Transcription** | Groq Whisper (`whisper-large-v3`) | Speech-to-text |
| **Vision AI** | Groq Llama 4 Scout (`llama-4-scout-17b-16e-instruct`) | Multimodal frame + transcript analysis |
| **Guide Gen** | Groq Llama 3.3 (`llama-3.3-70b-versatile`) | Step-by-step roadmap generation |
| **Link Finder** | Custom resolver + DuckDuckGo search | 5-layer promised link detection |
| **Database** | Supabase (PostgreSQL) | Result caching + IP rate limiting |
| **Frontend Deploy** | Vercel | Static hosting |
| **Backend Deploy** | Render | FastAPI server |

---

## 🚀 Local Setup

### Prerequisites

Make sure you have these installed before starting:

- **Python 3.11+** — [Download](https://python.org/downloads)
- **Node.js 18+** — [Download](https://nodejs.org)
- **ffmpeg** — [Download](https://ffmpeg.org/download.html) and add to PATH
- **Git** — [Download](https://git-scm.com)

Verify installations:
```bash
python --version    # should be 3.11+
node --version      # should be 18+
ffmpeg -version     # should show version info
```

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/yashmagar01/reel-decoder.git
cd reel-decoder
```

---

### Step 2 — Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### Step 3 — Get your API keys

You need accounts on two free services:

**Groq** (for all AI — transcription, vision, guide generation)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for free
3. Navigate to API Keys → Create API Key
4. Copy the key — it starts with `gsk_`

**Supabase** (for caching decoded reels + rate limiting)
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to Project Settings → API
3. Copy your **Project URL** and **service_role secret key**
4. Run this SQL in the Supabase SQL Editor to create the tables:

```sql
-- Cache table: stores decoded reel results
create table reel_cache (
  id uuid primary key default gen_random_uuid(),
  instagram_url text unique not null,
  url_hash text unique not null,
  transcript text,
  concept_summary text,
  roadmap_markdown text,
  promised_link text,
  created_at timestamptz default now()
);
create index on reel_cache(url_hash);

-- Rate limiting table: 5 requests per IP per hour
create table rate_limits (
  ip_address text primary key,
  request_count integer default 0,
  window_start timestamptz default now()
);
```

---

### Step 4 — Export Instagram cookies

The downloader needs your Instagram session to access reels.

1. Install the **Cookie-Editor** browser extension ([Chrome](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) / [Firefox](https://addons.mozilla.org/en-US/firefox/addon/cookie-editor/))
2. Log into [instagram.com](https://instagram.com) in your browser
3. Click the Cookie-Editor extension icon
4. Click **Export → Export as Netscape** (this copies to clipboard)
5. Create a file at `backend/cookies.txt` and paste the contents

> ⚠️ **Important:** Use a secondary Instagram account for this, not your main account. Cookies expire every 2–3 weeks — re-export when downloads start failing.

---

### Step 5 — Configure environment variables

Copy the example file and fill in your values:

```bash
# In the backend/ directory
cp .env.example .env
```

Open `backend/.env` and fill in:

```env
# Groq — get from console.groq.com (free)
GROQ_API_KEY=gsk_your_key_here

# Supabase — get from your project settings
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Path to your exported Instagram cookies
INSTAGRAM_COOKIES_PATH=./cookies.txt

# Allowed CORS origins (add your frontend URL here)
ALLOWED_ORIGINS=http://localhost:3000
```

---

### Step 6 — Frontend setup

```bash
# From the root of the project
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local
```

Open `frontend/.env.local` and set:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

### Step 7 — Run the app

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd backend
# Activate venv first if not already active
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

uvicorn main:app --reload --port 8000
```

You should see:
```
INFO: Application startup complete.
INFO: Server is warm and ready ✅
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste an Instagram Reel URL.

---

## 📂 Project Structure

```
reel-decoder/
├── frontend/                    # Next.js 15 App
│   ├── app/
│   │   ├── page.tsx             # Main page — sidebar layout, state management
│   │   ├── layout.tsx           # Root layout, fonts, metadata
│   │   └── globals.css          # CSS variables, animations
│   ├── components/
│   │   ├── LoadingState.tsx     # Real-time SSE progress display
│   │   ├── ResultLayout.tsx     # Sidebar + main content wrapper
│   │   ├── RoadmapDisplay.tsx   # 5-section structured guide renderer
│   │   ├── PromisedLinkCTA.tsx  # Found link card with source badge
│   │   └── DownloadButton.tsx   # .mp4 download with countdown timer
│   └── lib/
│       └── api.ts               # SSE-based analyzeReel() + getDownloadUrl()
│
└── backend/                     # Python FastAPI App
    ├── main.py                  # App entry, SSE endpoint, download endpoint
    ├── downloader.py            # yt-dlp + ffmpeg download pipeline
    ├── transcriber.py           # Groq Whisper transcription
    ├── frame_extractor.py       # ffmpeg frame extraction + Pillow resize
    ├── analyzer.py              # Groq Llama 4 Scout multimodal analysis
    ├── roadmap_generator.py     # Groq Llama 3.3 guide generation
    ├── link_finder.py           # 5-layer promised link resolver
    ├── job_store.py             # In-memory SSE job registry + download tokens
    ├── cache.py                 # Supabase result caching
    ├── rate_limiter.py          # IP-based rate limiting (5 req/hr)
    ├── cookies.txt              # Your exported Instagram session (git-ignored)
    ├── requirements.txt         # Python dependencies
    └── .env                     # Your secrets (git-ignored)
```

---

## 🔗 How the Promised Link Finder Works

The app uses a 5-layer resolver to find the URL the creator is hiding:

| Layer | Source | Confidence | Method |
|---|---|---|---|
| 1 | Reel caption | 🟢 High | Regex URL extraction from description text |
| 2 | Audio transcript | 🟢 High | Detects verbally mentioned domains/URLs |
| 3 | Creator bio | 🟡 Medium | Fetches profile, follows Linktree/aggregators |
| 4 | Targeted search | 🟡 Medium | DuckDuckGo: `"@handle" topic site:gumroad.com` |
| 5 | Generic search | 🔴 Low | DuckDuckGo broad fallback search |

If a creator uses a keyword-triggered DM bot (ManyChat, Chatrace), the app detects the trigger keyword from comments and displays it so you can get the link directly.

---

## ⚡ Caching & Rate Limiting

- **Result caching** — each decoded reel is cached by SHA-256 URL hash. The same reel URL returns instantly on subsequent requests.
- **Rate limiting** — 5 requests per IP per hour. Prevents abuse on the free tier.
- **Download tokens** — `.mp4` downloads are single-use, expire after 15 minutes, then the file is deleted.

---

## ⚠️ Known Limitations

| Limitation | Cause | Workaround |
|---|---|---|
| Cookies expire every 2–3 weeks | Instagram session timeout | Re-export cookies.txt from browser |
| First request is slow (30–60s) | Render free tier cold start | Frontend pings `/health` during warmup |
| Reels over 5 minutes are rejected | Free tier API + storage limits | Use shorter reels |
| Music-only reels can't be decoded | Nothing to transcribe | Works best on talking-head tutorials |
| Private/deleted reels fail | yt-dlp can't access them | Only public reels are supported |

---

## 🌐 Deploying to Production

### Backend → Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect your repo
3. Set **Root Directory** to `backend`
4. Set **Build Command** to `./build.sh`
5. Set **Start Command** to `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add all environment variables from `backend/.env` in Render's Environment tab
7. Upload your `cookies.txt` contents as an environment variable or use Render's persistent disk

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable: `NEXT_PUBLIC_BACKEND_URL` = your Render service URL
4. Deploy

### After deploying

Update `ALLOWED_ORIGINS` in your Render environment to include your Vercel URL:
```
ALLOWED_ORIGINS=https://your-app.vercel.app
```

> **Tip:** Set up a free cron job at [cron-job.org](https://cron-job.org) to ping your Render `/health` endpoint every 14 minutes — this prevents cold starts entirely.

---

## 📊 Free Tier Limits At a Glance

| Service | Key Limit | Our Usage |
|---|---|---|
| Groq Whisper | ~100 reels/day | Audio transcription |
| Groq Llama 4 Scout | 30 req/min, 14,400/day | Vision + text analysis |
| Groq Llama 3.3 70B | 30 req/min, 14,400/day | Guide generation |
| Supabase | 500MB DB, 500K API calls/month | Cache + rate limits |
| Render | 750 hours/month | Backend hosting |
| Vercel | 100GB bandwidth/month | Frontend hosting |

Everything used here is **100% free tier**. No credit card required for any service.

---

## 🔮 Roadmap

- [ ] Chrome extension — decode directly from Instagram without leaving the page
- [ ] TikTok + YouTube Shorts support
- [ ] User accounts with saved decoded reels history
- [ ] Share decoded guide via link
- [ ] Analytics dashboard (decode count, cache hit rate, top creators)

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit: `git commit -m 'Add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a pull request

---

## 📄 License

MIT — do whatever you want with it.

---

<p align="center">
  Built by <a href="https://github.com/yashmagar01">Yash Magar</a> · No follows. No comments. No waiting.
</p>
