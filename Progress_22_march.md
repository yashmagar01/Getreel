# 📊 Reel Decoder — Project Progress Report

> **Date:** 22 March 2026  
> **Author:** Yash (with AI pair-programming assistance)  
> **Status:** ✅ MVP Working Locally | 🚧 Production Deployment In Progress

---

## 📌 Table of Contents

- [Executive Summary](#-executive-summary)
- [What Was Planned vs What Was Built](#-what-was-planned-vs-what-was-built)
- [The Big Tech Stack Shift](#-the-big-tech-stack-shift)
- [Current Tech Stack](#-current-tech-stack)
- [Features Implemented](#-features-implemented)
- [Backend Architecture](#-backend-architecture)
- [Frontend Architecture](#-frontend-architecture)
- [Application Flow](#-application-flow)
- [Database Schema](#-database-schema)
- [Environment Variables](#-environment-variables)
- [Project File Structure](#-project-file-structure)
- [Known Limitations](#-known-limitations)
- [Known Issues & Bugs](#-known-issues--bugs)
- [How to Overcome the Limitations](#-how-to-overcome-the-limitations)
- [API Rate Limits & Restrictions](#-api-rate-limits--restrictions)
- [Deployment Status](#-deployment-status)
- [What's Next](#-whats-next)

---

## 🎯 Executive Summary

**Reel Decoder** is an AI-powered web application that reverse-engineers Instagram "teaser reels" — those videos where creators show you something valuable but tell you to *"follow and comment to get the full guide."* Instead of playing their game, Reel Decoder:

1. Downloads the reel
2. Transcribes what the creator said
3. Extracts key video frames
4. Uses AI to understand what's being taught and what's being hidden
5. Generates a complete step-by-step guide
6. Finds the actual "promised link" the creator was gatekeeping

**The app is fully functional locally.** Both frontend (Next.js on `localhost:3000`) and backend (FastAPI on `localhost:8000`) work end-to-end with real Instagram reels.

---

## 🔄 What Was Planned vs What Was Built

### Original Plan (from `reel_decoder_super_prompt.md`)

The original super prompt described a system using **three different AI providers** for three different jobs:

| Role | Planned Provider | Planned Model |
|---|---|---|
| Audio Transcription | Groq | `whisper-large-v3` |
| Concept Extraction (multimodal) | Google Gemini | `gemini-1.5-pro` |
| Roadmap Generation | Anthropic | `claude-sonnet-4-20250514` |

### What Was Actually Built

| Role | Actual Provider | Actual Model | Why Changed |
|---|---|---|---|
| Audio Transcription | **Groq** ✅ | `whisper-large-v3` | *No change — kept as planned* |
| Concept Extraction | **Groq** 🔄 | `meta-llama/llama-4-scout-17b-16e-instruct` | Gemini → Groq Llama to consolidate providers and stay 100% free |
| Roadmap Generation | **Groq** 🔄 | `llama-3.3-70b-versatile` | Anthropic Claude requires paid API — shifted to free Groq |

### Bonus Features NOT in Original Plan

| Feature | Description | Status |
|---|---|---|
| 🔗 **Promised Link Finder** | 5-layer intelligent link resolver finds the actual URL the creator is gatekeeping | ✅ Built |
| 🎨 **PromisedLinkCTA Component** | Beautiful UI card with confidence badges showing the found link | ✅ Built |
| 💬 **Comment Extraction** | Downloads reel comments via yt-dlp to feed into analysis | ✅ Built |
| 🔍 **DuckDuckGo Search Integration** | Layers 4 & 5 of link finder use web search as fallback | ✅ Built |
| ⬇️ **Decode Another Reel Button** | Reset flow to decode multiple reels in one session | ✅ Built |

---

## 🔀 The Big Tech Stack Shift

### Why The Shift Happened

The original plan called for:
- **Google Gemini** for concept extraction (multimodal vision + transcript analysis)
- **Anthropic Claude** for roadmap generation (structured instruction writing)

**The shift to Groq's ecosystem happened because:**

1. **💰 Cost: Claude API is not free.** The `anthropic` Python package requires a paid API key. Since the entire project targets free-tier-only usage, Claude was replaced with **Groq Llama 3.3 70B** — a powerful open-source model available for free on Groq.

2. **🔧 Simplification: One provider instead of three.** By consolidating all three AI tasks (transcription, vision analysis, roadmap generation) under Groq, the project needs only **one API key** instead of three, reducing setup complexity and points of failure.

3. **🖼️ Multimodal: Llama 4 Scout handles vision.** The original plan used Gemini 1.5 Pro for its multimodal capability (understanding images + text together). Groq's **Llama 4 Scout 17B** supports the same multimodal input format, allowing frame analysis + transcript understanding in a single call.

4. **⚡ Speed: Groq is extremely fast.** Groq's custom LPU hardware provides the fastest inference speeds available, making the pipeline feel snappy even on the free tier.

### What Stayed the Same

| Component | Status |
|---|---|
| `whisper-large-v3` for transcription | ✅ Unchanged |
| Google Gemini API Key (kept in `.env`) | ✅ Still present but **not actively used** in the pipeline |
| Supabase for caching + rate limiting | ✅ Unchanged |
| yt-dlp for downloading | ✅ Unchanged |
| ffmpeg for audio/frame extraction | ✅ Unchanged |
| FastAPI backend | ✅ Unchanged |
| Next.js frontend | ✅ Unchanged |

---

## 🛠️ Current Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Next.js (App Router) | 16.2.1 | UI + Static export for Vercel |
| **Frontend Styling** | Tailwind CSS | Built-in | Dark-mode utility-first styling |
| **Frontend Font** | Inter (Google Fonts) | Latest | Clean modern typography |
| **Backend Framework** | Python FastAPI | 0.111.0 | REST API server |
| **Video Download** | yt-dlp | 2024.5.27 | Instagram reel downloading |
| **Audio Extraction** | ffmpeg-python + ffmpeg | 0.2.0 | Separate audio from video |
| **Transcription** | Groq Whisper API | `whisper-large-v3` | Speech-to-text |
| **Concept Analysis** | Groq Llama 4 Scout | `llama-4-scout-17b-16e-instruct` | Multimodal vision + text analysis |
| **Roadmap Generation** | Groq Llama 3.3 | `llama-3.3-70b-versatile` | Step-by-step guide writer |
| **Link Finder** | Custom + DuckDuckGo | `duckduckgo-search 6.2.4` | 5-layer intelligent URL resolver |
| **Database / Cache** | Supabase (PostgreSQL) | Free tier | Result caching + rate limiting |
| **HTTP Client** | httpx | 0.27.0 | Internal HTTP requests |
| **Image Processing** | Pillow | 10.3.0 | Frame resizing to 512×512 |
| **Deployment (Frontend)** | Vercel | Free tier | Static hosting |
| **Deployment (Backend)** | Render | Free tier | FastAPI hosting |

---

## ✅ Features Implemented

### Core Pipeline
- [x] **Instagram Reel Download** — yt-dlp with cookie authentication
- [x] **Audio Extraction** — ffmpeg separates audio track as MP3
- [x] **Speech Transcription** — Groq Whisper `whisper-large-v3`
- [x] **Key Frame Extraction** — 6 frames (or 2 for short videos), resized to 512×512
- [x] **Multimodal Concept Analysis** — Llama 4 Scout analyzes transcript + frames together
- [x] **Roadmap Generation** — Llama 3.3 70B creates structured 5-section guide
- [x] **Promised Link Finder** — 5-layer resolver finds the hidden resource URL

### Caching & Rate Limiting
- [x] **URL-based result caching** — SHA-256 hash of URL, stored in Supabase
- [x] **Instant cache hits** — Previously decoded reels return immediately
- [x] **IP-based rate limiting** — 5 requests per hour per IP
- [x] **Graceful rate limiter failures** — If Supabase is down, requests still go through

### Frontend UX
- [x] **URL Input with validation** — Regex check for valid Instagram reel URLs
- [x] **Animated loading state** — 5-step cycling status messages with progress bar
- [x] **Cold start warning** — Shows after 20 seconds of loading
- [x] **Structured roadmap display** — 5 color-coded section cards (not raw markdown)
- [x] **Copy Markdown button** — One-click clipboard copy of the full guide
- [x] **Cache badge** — "⚡ Instant — decoded before" indicator
- [x] **Promised Link CTA** — Beautiful card with source badge + confidence level
- [x] **Decode Another Reel** — Reset button for multiple sessions
- [x] **Responsive design** — Works on mobile and desktop

### Error Handling
- [x] **Private reel detection** — Clear error message
- [x] **Deleted reel detection** — Clear error message
- [x] **Duration guard** — Rejects reels over 5 minutes
- [x] **API key validation** — Checks for missing keys before processing
- [x] **Temp file cleanup** — `try/finally` ensures disk space is freed
- [x] **Structured logging** — Timestamped logs at every pipeline step

---

## ⚙️ Backend Architecture

### File Breakdown

| File | Lines | Purpose |
|---|---|---|
| `main.py` | 169 | FastAPI app, CORS, routes (`/health`, `/analyze`), pipeline orchestration |
| `downloader.py` | 86 | yt-dlp download + ffmpeg audio extraction, returns `{video_path, audio_path, info}` |
| `transcriber.py` | 46 | Groq Whisper API call, returns plain text transcript |
| `frame_extractor.py` | 66 | ffmpeg frame extraction at 6 timestamps, Pillow resize, base64 encoding |
| `analyzer.py` | 108 | Groq Llama 4 Scout multimodal analysis, returns structured JSON concept dict |
| `roadmap_generator.py` | 111 | Groq Llama 3.3 70B structured guide generation, returns Markdown string |
| `link_finder.py` | 373 | 5-layer promised link resolver (caption → transcript → bio → targeted search → generic search) |
| `cache.py` | 79 | Supabase read/write for result caching with SHA-256 URL hashing |
| `rate_limiter.py` | 81 | IP-based rate limiting (5 req/hr) via Supabase `rate_limits` table |
| `requirements.txt` | 14 | All Python dependencies with pinned versions |
| `render.yaml` | ~15 | Render deployment configuration |
| `build.sh` | ~20 | Build script for Render (installs ffmpeg + dependencies) |
| `.env` | 16 | Environment variables (API keys, DB credentials, CORS origins) |

### API Endpoints

| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/health` | Health check (Render uses this) | `{"status": "ok"}` |
| `POST` | `/analyze` | Main pipeline endpoint | `{roadmap, concept, promised_link, from_cache}` |

### Concept Analysis Output Structure

```json
{
  "topic": "one-sentence description of the skill/tool/trick",
  "what_creator_shows": "what the creator demonstrates",
  "what_creator_withholds": "what they deliberately hide",
  "target_audience": "who benefits from this",
  "tools_mentioned": ["list", "of", "tools"],
  "key_concepts": ["list", "of", "concepts"]
}
```

### Promised Link Resolver — 5 Layers

| Priority | Layer | Source | Confidence | How It Works |
|---|---|---|---|---|
| 1 | Caption | Reel description text | 🟢 High | Extract URLs from caption via regex, prefer resource domains |
| 2 | Transcript | Creator's spoken words | 🟢 High | Detect verbally mentioned URLs / domains |
| 3 | Creator Bio | Instagram profile | 🟡 Medium | Fetch profile HTML, find bio link, follow aggregators (Linktree etc.) |
| 4 | Targeted Search | DuckDuckGo | 🟡 Medium | `"@handle" topic site:gumroad.com` etc. |
| 5 | Generic Search | DuckDuckGo | 🔴 Low | `topic tools free guide tutorial` (broad fallback) |

---

## 🎨 Frontend Architecture

### File Breakdown

| File | Lines | Purpose |
|---|---|---|
| `app/page.tsx` | 123 | Main page — state management, conditional rendering (idle/loading/result) |
| `app/layout.tsx` | 36 | Root layout with Inter font, dark mode, SEO metadata |
| `app/globals.css` | — | Tailwind base styles + dark mode utilities |
| `components/UrlInput.tsx` | 120 | URL input form with regex validation, Instagram icon, gradient button |
| `components/LoadingState.tsx` | 95 | 5-stage animated loading with progress bar + cold start warning |
| `components/RoadmapDisplay.tsx` | 500 | Parses markdown into 5 color-coded section cards with custom renderers |
| `components/PromisedLinkCTA.tsx` | 204 | CTA card for the found link — source badge, confidence, open button |
| `lib/api.ts` | 82 | `analyzeReel()` function — health check warm-up + fetch with 5-min timeout |

### RoadmapDisplay — Custom Section Rendering

Instead of using raw `react-markdown`, the frontend **parses the AI output** into 5 structured sections and renders each with a unique, themed card:

| Section | Color Theme | Render Style |
|---|---|---|
| What This Reel Is Actually Teaching | 🟣 Purple/Violet | Single paragraph card |
| What You'll Need | 🟢 Green/Emerald | Pill-style tags |
| Step-by-Step Guide | 🔵 Blue/Indigo | Numbered accordion with expand/collapse |
| Common Mistakes to Avoid | 🔴 Red | ✕-prefixed list items |
| Free Resources to Learn More | 🟡 Yellow/Amber | Clickable link cards with ↗ arrows |

### State Management

```
[idle] → User pastes URL → [loading] → Backend returns → [result]
                                ↑                              ↓
                                └── "Decode another reel" ←────┘
```

---

## 🔁 Application Flow

```
User pastes Instagram Reel URL
         │
         ▼
┌─────────────────────────────┐
│  Frontend: URL Validation   │  ← Regex: /instagram\.com\/reel\/[A-Za-z0-9_-]+/
│  (UrlInput.tsx)             │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Frontend: Warm-Up          │  ← GET /health (retries every 5s for 60s max)
│  (lib/api.ts)               │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│  Frontend: POST /analyze    │  ← Send { instagram_url } with 5-min timeout
│  Show LoadingState          │
└────────────┬────────────────┘
             │
             ▼
┌══════════════════════════════════════════════════════════════════════┐
║                    BACKEND PIPELINE (main.py)                       ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  1. URL Validation          ← Regex check on server side too         ║
║  2. Rate Limit Check        ← Supabase: 5 req/hr per IP             ║
║  3. Cache Lookup            ← SHA-256 hash → Supabase reel_cache     ║
║     └─ HIT? Return cached result immediately (from_cache: true)      ║
║                                                                      ║
║  4. Download Reel           ← yt-dlp + cookies.txt authentication    ║
║     └─ Returns: video.mp4, audio.mp3, metadata dict                  ║
║                                                                      ║
║  5. Duration Guard           ← Reject if > 5 minutes (300 seconds)   ║
║                                                                      ║
║  6. Transcribe Audio        ← Groq Whisper (whisper-large-v3)        ║
║     └─ Returns: plain text transcript                                ║
║                                                                      ║
║  7. Extract Frames          ← ffmpeg → 6 JPEG frames → base64       ║
║     └─ Resized to 512×512 via Pillow                                 ║
║                                                                      ║
║  8. Concept Analysis        ← Groq Llama 4 Scout (multimodal)        ║
║     └─ Input: frames (images) + transcript (text)                    ║
║     └─ Output: structured JSON (topic, withheld, tools, etc.)        ║
║                                                                      ║
║  9. Find Promised Link      ← 5-layer resolver                       ║
║     └─ Caption → Transcript → Bio → Targeted → Generic search       ║
║                                                                      ║
║ 10. Generate Roadmap        ← Groq Llama 3.3 70B                     ║
║     └─ Input: concept dict                                            ║
║     └─ Output: 5-section Markdown guide                               ║
║                                                                      ║
║ 11. Cache Result            ← Save to Supabase reel_cache             ║
║ 12. Cleanup                 ← Delete temp dir (video, audio, frames)  ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
             │
             ▼
┌─────────────────────────────┐
│  Frontend: Render Result    │
│  ├─ PromisedLinkCTA         │  ← If link found
│  └─ RoadmapDisplay          │  ← 5 color-coded section cards
└─────────────────────────────┘
```

---

## 🗄️ Database Schema

### Supabase — `reel_cache` Table

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Auto-generated unique ID |
| `instagram_url` | `text` (UNIQUE) | Original Instagram URL |
| `url_hash` | `text` (UNIQUE, INDEXED) | SHA-256 hash for fast lookups |
| `transcript` | `text` | Whisper transcription output |
| `concept_summary` | `text` (JSON string) | AI concept analysis result |
| `roadmap_markdown` | `text` | Full generated roadmap |
| `promised_link` | `text` (JSON string, nullable) | Found link object or null |
| `created_at` | `timestamptz` | Auto-timestamp |

### Supabase — `rate_limits` Table

| Column | Type | Description |
|---|---|---|
| `ip_address` | `text` (PK) | Client IP address |
| `request_count` | `integer` | Current count in window |
| `window_start` | `timestamptz` | When the current 1-hour window started |

---

## 🔐 Environment Variables

### Backend (`.env`)

| Variable | Purpose | Required |
|---|---|---|
| `GROQ_API_KEY` | Groq API — Whisper, Llama 4 Scout, Llama 3.3 | ✅ Yes |
| `GOOGLE_API_KEY` | Google Gemini API (kept but not actively used) | ⚠️ Reserved |
| `SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | ✅ Yes |
| `INSTAGRAM_COOKIES_PATH` | Path to exported cookies.txt file | ✅ Yes |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins | ✅ Yes |

### Frontend (`.env.local`)

| Variable | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL (e.g., `http://localhost:8000`) | ✅ Yes |

---

## 📂 Project File Structure

```
reel-decoder/
├── frontend/                          # Next.js 16 App
│   ├── app/
│   │   ├── page.tsx                   # Main page — idle/loading/result states
│   │   ├── layout.tsx                 # Root layout, Inter font, SEO metadata
│   │   └── globals.css                # Tailwind dark-mode base styles
│   ├── components/
│   │   ├── UrlInput.tsx               # URL input form with validation
│   │   ├── LoadingState.tsx           # 5-step animated loading
│   │   ├── RoadmapDisplay.tsx         # Custom 5-section card renderer
│   │   └── PromisedLinkCTA.tsx        # Found-link CTA card
│   ├── lib/
│   │   └── api.ts                     # analyzeReel() with warm-up + timeout
│   ├── .env.local                     # NEXT_PUBLIC_BACKEND_URL
│   ├── next.config.ts                 # Static export + allowedDevOrigins
│   ├── package.json                   # Dependencies
│   └── tsconfig.json                  # TypeScript config
│
├── backend/                           # Python FastAPI App
│   ├── main.py                        # App entry + /analyze route
│   ├── downloader.py                  # yt-dlp + ffmpeg download
│   ├── transcriber.py                 # Groq Whisper transcription
│   ├── frame_extractor.py            # ffmpeg frame extraction + Pillow resize
│   ├── analyzer.py                    # Groq Llama 4 Scout concept analysis
│   ├── roadmap_generator.py           # Groq Llama 3.3 roadmap generation
│   ├── link_finder.py                 # 5-layer promised link resolver
│   ├── cache.py                       # Supabase caching (read/write)
│   ├── rate_limiter.py                # IP-based rate limiting
│   ├── requirements.txt               # Pinned Python dependencies
│   ├── render.yaml                    # Render deployment config
│   ├── build.sh                       # Render build script
│   ├── cookies.txt                    # Instagram session cookies
│   ├── .env                           # API keys + config
│   └── .env.example                   # Template for new setups
│
├── reel_decoder_super_prompt.md       # Original project plan
└── Progress_22_march.md               # THIS DOCUMENT
```

---

## ⚠️ Known Limitations

### 1. Instagram Cookie Expiry
- **Problem:** Cookies expire every few weeks when the Instagram session expires
- **Impact:** Downloads start failing with auth errors
- **Workaround:** Manually re-export cookies from a logged-in browser and update `cookies.txt`

### 2. Render Free Tier Cold Starts
- **Problem:** Backend spins down after 15 minutes of inactivity
- **Impact:** First request takes 30–60 seconds while the server wakes up
- **Mitigation:** Frontend has a warm-up loop that pings `/health` for up to 60 seconds

### 3. Reel Duration Limit
- **Problem:** Reels over 5 minutes are rejected
- **Impact:** Long-form content can't be processed
- **Reason:** Free tier API limits + processing time become impractical on free infrastructure

### 4. Music-Only / No Speech Reels
- **Problem:** Reels with no spoken content can't be transcribed meaningfully
- **Impact:** The decoder works best on tutorial / talking-head style reels
- **Handling:** Whisper returns empty → clean error message to user

### 5. Private / Deleted Reels
- **Problem:** yt-dlp can't download private or deleted content
- **Impact:** Clear error messages are shown, but there's no workaround
- **Handling:** Error messages explain why and suggest using public reels

### 6. Render Disk Space (512 MB)
- **Problem:** Free tier has limited temporary storage
- **Mitigation:** `try/finally` block ensures temp files are always cleaned up

### 7. parseSteps Regex Sensitivity
- **Problem:** The frontend Step-by-Step Guide parser originally only matched `1. **Bold Title**: description` format
- **Impact:** When the AI generated plain numbered lists (without bold titles), steps didn't render
- **Fix Applied (22 March):** Updated `parseSteps()` to also match plain `1. description` format

---

## 🐛 Known Issues & Bugs

| # | Issue | Status | Impact |
|---|---|---|---|
| 1 | CORS errors when accessing from network IP | ✅ Fixed (22 Mar) | Added IP to `allowedDevOrigins` + backend CORS |
| 2 | Step-by-Step Guide not rendering for plain numbered steps | ✅ Fixed (22 Mar) | Updated `parseSteps()` regex in `RoadmapDisplay.tsx` |
| 3 | Google Gemini API key present but unused | ⚠️ Cosmetic | Can be removed from `.env` to avoid confusion |
| 4 | `anthropic` package removed from requirements | ✅ Done | Was planned but not needed after Groq shift |
| 5 | `google-generativeai` package removed from requirements | ✅ Done | Not used after shifting to Groq Llama 4 Scout |
| 6 | Render deployment CORS preflight errors | ✅ Fixed (21 Mar) | Corrected CORS middleware configuration |
| 7 | Pillow build errors on Render | ✅ Fixed (21 Mar) | Resolved setuptools/version compatibility |

---

## 🚀 How to Overcome the Limitations

### Cookie Expiry → Automation
- **Short-term:** Set a calendar reminder to refresh cookies every 2 weeks
- **Long-term:** Use a headless browser (Playwright/Puppeteer) to auto-login and export cookies on a schedule
- **Alternative:** Use Instagram's Graph API (requires Meta developer account + app review)

### Cold Starts → Cron Ping
- **Quick fix:** Use a free cron service (cron-job.org, UptimeRobot) to ping `/health` every 14 minutes
- **Long-term:** Upgrade to Render's paid tier ($7/mo) for always-on instances

### Reel Duration → Chunked Processing
- **Future:** Split long videos into 60-second chunks, transcribe each, merge transcripts
- **Alternative:** Use a cheaper/faster transcription model for longer content

### AI Quality → Model Upgrades
- **Current models are good** but can occasionally produce generic outputs
- **Future:** When budget allows, re-introduce Claude for roadmap generation (superior structured writing)
- **Alternative:** Fine-tune an open-source model specifically for "teaser content" analysis

### Link Finder Accuracy → More Data Sources
- **Add YouTube search** as Layer 6 for video-referenced resources  
- **Add Wayback Machine** to find bio links that creators may have removed
- **Improve aggregator parsing** for more link-in-bio services

---

## 📏 API Rate Limits & Restrictions

### Groq (Free Tier) — Our Primary AI Provider

| Model | Requests/Min | Requests/Day | Tokens/Min | Notes |
|---|---|---|---|---|
| `whisper-large-v3` | 100 | ~6,000 audio seconds/day | N/A | ~100 reels/day max |
| `llama-4-scout-17b-16e-instruct` | 30 | 14,400 | 20,000 | Image inputs count as tokens |
| `llama-3.3-70b-versatile` | 30 | 14,400 | 20,000 | `max_tokens=2000` per request |

### Supabase (Free Tier)

| Resource | Limit | Our Usage |
|---|---|---|
| Database size | 500 MB | Low (text-only cache) |
| Storage | 1 GB | Not used |
| API requests | 500K/month | Well within limits |
| Edge functions | 500K invocations/month | Not used |

### Render (Free Tier)

| Resource | Limit | Our Usage |
|---|---|---|
| Hours/month | 750 | Shared across all free services |
| RAM | 512 MB | Tight — ffmpeg + yt-dlp can spike |
| Disk | 1 GB | Temp files cleaned after each request |
| Bandwidth | 100 GB/month | More than enough |

### Vercel (Free Tier)

| Resource | Limit | Our Usage |
|---|---|---|
| Bandwidth | 100 GB | Static export — minimal usage |
| Deployments | 6,000/month | More than enough |
| Build time | 6,000 min/month | Quick builds (~30s each) |

### App-Level Rate Limiting

| Rule | Value |
|---|---|
| Max requests per IP per hour | **5** |
| Max reel duration | **5 minutes (300 seconds)** |
| Backend request timeout | **5 minutes (300 seconds)** |
| Frontend warm-up timeout | **60 seconds** |

---

## 🌐 Deployment Status

| Component | Platform | Status | URL |
|---|---|---|---|
| Backend | Render | 🚧 Deployed (fixing cookie/CORS issues) | `https://[your-service].onrender.com` |
| Frontend | Vercel | 🚧 Deployed (static export) | `https://[your-app].vercel.app` |
| Database | Supabase | ✅ Live | `twhpqbubxztgxklowimc.supabase.co` |
| Local Dev | localhost | ✅ Fully Working | `localhost:3000` + `localhost:8000` |

---

## 🔮 What's Next

### Immediate Priorities
- [ ] Fix production deployment on Render (cookies + CORS stability)
- [ ] Verify full end-to-end flow on deployed URLs
- [ ] Set up UptimeRobot / cron-job.org to prevent Render cold starts

### Short-Term Improvements
- [ ] Add error retry logic in the frontend for transient failures
- [ ] Improve the roadmap parser to handle more AI output variations
- [ ] Add a "Share This Guide" button (copy link / Twitter / WhatsApp)
- [ ] Add analytics tracking (how many reels decoded, cache hit rate)

### Long-Term Vision
- [ ] Chrome extension: decode directly from Instagram
- [ ] Support for TikTok, YouTube Shorts
- [ ] User accounts with saved decoded reels
- [ ] Premium tier with Claude-powered higher quality roadmaps
- [ ] Mobile app (React Native / Flutter)

---

## 📝 Summary of Changes Made Today (22 March 2026)

| Change | File(s) Modified | Description |
|---|---|---|
| CORS fix for network IP | `backend/.env` | Added `http://192.168.56.1:3000` to `ALLOWED_ORIGINS` |
| Dev origins fix | `frontend/next.config.ts` | Added `192.168.56.1` to `allowedDevOrigins` |
| Step parser fix | `frontend/components/RoadmapDisplay.tsx` | Updated `parseSteps()` to support plain numbered lists |

---

> *This document was generated by auditing every file in the `reel-decoder/` project directory. It reflects the actual state of the codebase as of 22 March 2026, 9:19 AM IST.*
