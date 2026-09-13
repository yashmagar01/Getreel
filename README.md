# 🎬 GetReel

### You know that reel. "Follow + comment DONE for the link." Just paste it here instead.

<p align="center">
  <img src="https://img.shields.io/badge/Made%20for-people%20who%20are%20tired%20of%20the%20follow%2Fcomment%20game-FF4785?style=for-the-badge" alt="tagline badge"/>
</p>

<p align="center">
  <a href="#-the-3am-scenario-this-was-built-for">Why this exists</a> •
  <a href="#-what-you-actually-get">What you get</a> •
  <a href="#-see-it-in-action">See it in action</a> •
  <a href="#-how-were-different">How we're different</a> •
  <a href="#-try-it-in-30-seconds">Try it</a> •
  <a href="#-for-developers">For developers</a>
</p>

---

## 😩 The 3am scenario this was built for

You're scrolling. You find a reel. Someone's giving away a genuinely good resource — a prompt, a tool, a template, a link to *something* — and then, right at the payoff, it's:

> *"Comment 'GUIDE' and I'll DM it to you 👇"*

So you comment. You wait. Maybe you get a DM. Maybe you don't. Maybe the "link" is just another reel telling you to follow *another* account. Twenty minutes later you have three new follows, one comment history you're mildly embarrassed about, and still no guide.

**GetReel skips all of that.** Paste the reel URL. Get the actual thing.

---

## 🎁 What you actually get

Paste an Instagram Reel, and in under a minute you get back:

- **The actual guide** — not a summary of the reel, a *complete, usable, step-by-step version* of whatever the creator was teasing. If they mentioned a tool, we name the tool. If they hinted at a technique, we reconstruct it.
- **The hidden link, if there was one** — we go looking in the caption, the bio, the comments, and even the creator's linked accounts, so you don't have to comment or DM anyone.
- **An honest answer if there's nothing there** — if the reel is just a meme, a dance, or a movie edit with no resource behind it, GetReel says exactly that instead of inventing a fake "guide" to seem useful. (More on this below — it matters more than it sounds.)
- **The reel itself, downloadable**, for as long as you need it.

Paste a **YouTube link** instead, and GetReel just downloads it — pick your quality, get your file. No separate app, no fifteen popup ads, no "your download is ready, click here" bait.

---

## 🖼️ See it in action

<!-- Screenshots live in docs/screenshots/ — drop progress.png and result.png there. -->

![Pasting a link — the live "Checking limits / Downloading / Transcribing…" progress screen](docs/screenshots/progress.png)

![The finished result — topic, hidden link card, downloadable roadmap](docs/screenshots/result.png)

---

## 🥊 How we're different

There are a hundred "Instagram video downloader" sites. None of them do what GetReel does, because they're solving a different, much smaller problem.

| | Generic downloader sites (SnapInsta, iGram, SSSInstagram, etc.) | Doing it yourself (screenshotting + asking ChatGPT) | **GetReel** |
|---|---|---|---|
| Downloads the raw video | ✅ | ❌ | ✅ |
| Understands what's actually being taught | ❌ | 🤷 depends how good your screenshots are | ✅ — watches *and listens* to the whole reel |
| Finds the hidden/gated link for you | ❌ | ❌ | ✅ |
| Gives you a complete, step-by-step guide, not just a summary | ❌ | 🤷 sometimes, with a lot of manual prompting | ✅ |
| Tells you honestly when a reel has nothing to teach | ❌ (not what they're for) | 🤷 | ✅ — no fake guides for genuinely fun/pointless reels |
| Ad-laden / sketchy popups | Often 😬 | N/A | Nope |
| Also handles YouTube | Rarely, and separately | N/A | ✅, same app |

The honest differentiator in one line: **downloader sites give you the file, GetReel gives you the point of the video.**

---

## 🧠 A quiet feature we're proud of: GetReel doesn't lie to you

Not every reel is hiding a tutorial. Some are just a good laugh, a dance, a movie edit. Earlier versions of GetReel would still try to force a "step-by-step guide" out of those — because the old pipeline always demanded one, whether there was anything to say or not. That's a real problem: a tool that invents fake instructions to seem smart isn't actually useful, it's just confidently wrong.

GetReel now figures out *what kind of reel it is* before deciding what to give you back:

- Got something to teach → you get the full reconstructed guide.
- Nothing to teach, but there's a story worth unpacking (a movie edit, a clever bit) → you get a breakdown of what's going on and why it works.
- Just pure fun with nothing under the hood → you get an honest, quick "here's what this is" — not a manufactured tutorial.

It's a small thing to put in a README, but it's the difference between a tool you trust and a tool that just sounds smart.

---

## 🚀 Try it in 30 seconds

1. Copy the link to any public Instagram Reel or YouTube video.
2. Paste it into GetReel.
3. Watch the progress bar (it's oddly satisfying).
4. Get your guide, your hidden link, and/or your download.

No account. No follow. No comment. No waiting on a DM.

---

<details>
<summary><b>🛠️ For developers — what's actually running under this</b></summary>

<br>

GetReel is a two-part app: a Next.js 15 frontend and a Python/FastAPI backend that runs the actual decode pipeline.

**The pipeline, per reel:**
```
URL → download (yt-dlp) → transcribe (Groq Whisper) → extract key frames
    → multimodal analysis (Groq Llama 4 Scout) → classify content type
    → generate result via the matching strategy → find hidden link (5-layer resolver)
```

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind | UI, routing, live SSE progress updates |
| Backend | Python 3.11 + FastAPI | REST API + streaming pipeline |
| Downloading | yt-dlp | Instagram + YouTube, cookie-authenticated |
| Transcription | Groq Whisper (`whisper-large-v3`) | Speech-to-text on the reel's audio |
| Vision | Groq Llama 4 Scout | Reads frames + transcript together |
| Guide generation | Content-type-aware strategy layer (teaser / commentary / recap) + Llama 3.3 70B | Produces the right *kind* of output for the *kind* of reel |
| Link resolution | Custom 5-layer resolver (caption → bio → comments → transcript → search) | Finds the gated link without following/commenting |
| Storage | Supabase (Postgres) | Result caching + IP rate limiting |
| Hosting | Vercel (frontend) / Render (backend) | |

See `frontend/TOKENS.md` for the design system (colors, type, radius scale) if you're touching UI.

**Local setup**, **environment variables**, and **API routes** — see the setup section further down / `backend/.env.example`.

</details>

---

## 🗺️ What's next

- Saved/collections so you can revisit past decoded reels without re-pasting the link.
- Account-free share links so you can send a decoded result to a friend.
- More content types recognized (right now: teaser-tutorial, entertainment-commentary, pure-entertainment — more genres to come).

---

## 📄 License

MIT — see `LICENSE`.
