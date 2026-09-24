# Solving Instagram and YouTube Auth Issues with cookies.txt

**Who this is for:** Beginners building Python scrapers or downloaders who keep
hitting errors like "Please log in", "429 Too Many Requests", or "Bot detected"
on Instagram or YouTube.

---

## Why Does This Happen?

When you visit Instagram or YouTube in your browser you are logged in. The site
recognizes you because your browser sends a tiny piece of data called a **cookie**
with every request. A cookie acts like a digital ID card: this person is logged in.

When your Python script tries to download the same content, the platforms see:

- No login session
- A request from a server or datacenter IP (not a home connection)
- Automated-looking traffic patterns

So they block you with errors like:

```
ERROR: Please log in to see this content.
ERROR: HTTP Error 429: Too Many Requests
ERROR: Sign in to confirm you are not a bot.
```

---

## The Fix: Give yt-dlp Your Browser Cookies

Instead of logging in with a username and password (risky and often broken by
2FA), you **export your browser cookies to a file** and hand that file to yt-dlp.

yt-dlp then sends those cookies with every request, so the platform thinks the
request is coming from your logged-in browser.

```
You (logged-in browser)
    --> Export cookies.txt
    --> yt-dlp uses the file
    --> Platform sees a valid session and allows the download
```

---

## Step-by-Step Setup

### Step 1: Install yt-dlp

```bash
pip install yt-dlp
pip install python-dotenv   # for loading .env files
```

### Step 2: Export Your Browser Cookies

#### Method A - Automatic (Recommended, no extension needed)

Run this in your terminal while your browser is open and you are logged in:

```bash
# Export Instagram cookies from Chrome
yt-dlp --cookies-from-browser chrome --cookies cookies.txt \
       "https://www.instagram.com/reel/ANY_REEL_ID/"

# Export YouTube cookies from Chrome
yt-dlp --cookies-from-browser chrome --cookies yt_cookies.txt \
       "https://www.youtube.com/watch?v=ANY_VIDEO_ID"
```

Replace `chrome` with `firefox`, `edge`, `safari`, or `brave` as needed.

#### Method B - Manual via Browser Extension

1. Install **Cookie-Editor** (https://cookie-editor.com/) in Chrome or Firefox.
2. Log into Instagram or YouTube normally in your browser.
3. Navigate to https://www.instagram.com or https://www.youtube.com.
4. Click the Cookie-Editor icon in your browser toolbar.
5. Click **Export** and choose the **Netscape** format.
6. Save as `cookies.txt` (Instagram) or `yt_cookies.txt` (YouTube).

---

## What Is Inside a cookies.txt File?

The file uses the Netscape cookie format: plain text, one cookie per line,
columns separated by tabs.

```
# Netscape HTTP Cookie File
.instagram.com  TRUE  /  TRUE  1824821750  csrftoken  abc123xyz
.instagram.com  TRUE  /  TRUE  1798037750  ds_user_id  42922184065
.instagram.com  TRUE  /  TRUE  1821797739  sessionid  42922184065%3A7Qy...
```

Column breakdown:

| Column     | Meaning                     | Example        |
|------------|-----------------------------|----------------|
| Domain     | Which website               | .instagram.com |
| Subdomains | Include subdomains?         | TRUE           |
| Path       | Which URL path              | /              |
| Secure     | HTTPS only?                 | TRUE           |
| Expiry     | Expires at (Unix timestamp) | 1824821750     |
| Name       | Cookie key                  | sessionid      |
| Value      | Cookie secret (login proof) | 42922...       |

> The `sessionid` cookie (Instagram) and `SID` / `__Secure-1PSID` (YouTube) are
> your actual login proof. **Never share these with anyone.**

---

## Using Cookies in Python with yt-dlp

### Basic Usage

```python
import yt_dlp

def download_instagram_reel(url: str, cookies_path: str = "cookies.txt"):
    ydl_opts = {
        "cookiefile": cookies_path,    # <-- Pass your cookies file here
        "outtmpl": "%(title)s.%(ext)s",
        "quiet": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=True)


def download_youtube_video(url: str, cookies_path: str = "yt_cookies.txt"):
    ydl_opts = {
        "cookiefile": cookies_path,    # <-- Pass your cookies file here
        "format": "bestvideo+bestaudio/best",
        "outtmpl": "%(title)s.%(ext)s",
        "quiet": True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=True)
```

### Better: Load Cookie Path from an Environment Variable

Hardcoding file paths is bad practice. Use a `.env` file so the same code works
locally and on any production server without any changes.

`.env` file:

```
INSTAGRAM_COOKIES_PATH=./cookies.txt
YOUTUBE_COOKIES_PATH=./yt_cookies.txt
```

Python code:

```python
import os
import yt_dlp
from dotenv import load_dotenv

load_dotenv()

def download_reel(url: str):
    cookies_path = os.getenv("INSTAGRAM_COOKIES_PATH")

    ydl_opts = {"outtmpl": "%(title)s.%(ext)s", "quiet": True}

    if cookies_path and os.path.isfile(cookies_path):
        ydl_opts["cookiefile"] = cookies_path
        print(f"Using cookies from: {cookies_path}")
    else:
        print("Warning: No cookies file found. Download may fail.")

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=True)
```

### Production-Ready: Full Error Handling and YouTube Fallback

```python
import os
import yt_dlp
from dotenv import load_dotenv

load_dotenv()


def download_instagram_reel(url: str) -> dict:
    # Downloads an Instagram reel using browser-exported cookies.
    # Returns the yt-dlp info dict on success.
    # Raises a descriptive Exception on failure.
    cookies_path = os.getenv("INSTAGRAM_COOKIES_PATH", "./cookies.txt")

    ydl_opts = {
        "format": "bv*+ba/b[acodec!=none]/b/best",
        "merge_output_format": "mp4",
        "outtmpl": "downloads/%(id)s.%(ext)s",
        "quiet": True,
        "no_warnings": True,
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0"
        },
    }

    if os.path.isfile(cookies_path):
        ydl_opts["cookiefile"] = cookies_path
    else:
        print(f"[WARNING] Cookie file not found at: {cookies_path}")

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(url, download=True)

    except yt_dlp.utils.DownloadError as e:
        msg = str(e).lower()

        if "private" in msg:
            raise Exception("Private account. Only public content is supported.")

        if "login" in msg or "rate" in msg or "429" in msg:
            raise Exception(
                "Instagram blocked the request. Your cookies may have expired. "
                "Re-export cookies.txt from your browser and try again."
            )

        if "not found" in msg or "does not exist" in msg:
            raise Exception("This content no longer exists or has been removed.")

        raise Exception(f"Download failed: {e}")


def download_youtube_video(url: str, quality: str = "best") -> dict:
    # Downloads a YouTube video with automatic bot-block fallback.
    # Attempt 1: Authenticated with cookies (required on server/datacenter IPs).
    # Attempt 2: Cookieless with a mobile User-Agent (fallback).
    quality_map = {
        "best":  "bestvideo+bestaudio/best",
        "1080p": "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
        "720p":  "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "audio": "bestaudio/best",
    }

    cookies_path = os.getenv("YOUTUBE_COOKIES_PATH", "./yt_cookies.txt")
    has_cookies = os.path.isfile(cookies_path)

    def build_opts(use_cookies: bool) -> dict:
        opts = {
            "format": quality_map.get(quality, quality_map["best"]),
            "merge_output_format": "mp4",
            "outtmpl": "downloads/%(title)s.%(ext)s",
            "quiet": True,
        }
        if use_cookies and has_cookies:
            opts["cookiefile"] = cookies_path
        else:
            # Mobile User-Agent is harder for YouTube to bot-detect
            opts["http_headers"] = {
                "User-Agent": "Mozilla/5.0 (Linux; Android 13) Chrome/122.0.0.0 Mobile"
            }
        return opts

    # Attempt 1: Authenticated with cookies
    try:
        with yt_dlp.YoutubeDL(build_opts(use_cookies=True)) as ydl:
            return ydl.extract_info(url, download=True)
    except Exception as e:
        msg = str(e).lower()
        if any(k in msg for k in ("bot", "sign in", "403", "forbidden", "unavailable")):
            print(f"[WARNING] Bot check triggered. Retrying with mobile client... ({e})")
        else:
            raise Exception(f"YouTube download failed: {e}")

    # Attempt 2: Cookieless mobile fallback
    try:
        with yt_dlp.YoutubeDL(build_opts(use_cookies=False)) as ydl:
            return ydl.extract_info(url, download=True)
    except Exception as e2:
        if not has_cookies:
            raise Exception(
                "YouTube blocked this request and no cookies are configured. "
                "Export yt_cookies.txt from your browser and set YOUTUBE_COOKIES_PATH."
            )
        raise Exception(
            "YouTube rejected the download. Cookies may be expired. "
            f"Re-export yt_cookies.txt from your browser. Details: {e2}"
        )
```

---

## When Cookies Stop Working

Cookies expire. You will know because you will see errors like:

```
Instagram blocked the request. Your cookies may have expired.
YouTube rejected the download. Cookies may be expired.
```

**Fix:** Re-export fresh cookies from your browser and replace the old file.

| Cookie                            | Typical Lifetime |
|-----------------------------------|-----------------|
| Instagram `sessionid`             | ~90 days        |
| YouTube `SID` / `__Secure-1PSID` | ~1-2 years      |

---

## Security: Keep These Files Safe

Your `cookies.txt` and `yt_cookies.txt` are **equivalent to your login password.**
Anyone who has them can act as you on Instagram and YouTube.

**Always do this:**

- Add both files to `.gitignore` and never commit them to Git
- Use environment variables for file paths (never hardcode paths in code)
- On production servers, store them as secret files

**Never do this:**

- Paste cookie values into Discord, email, or any chat
- Commit them to any GitHub repository (public or private)

Add this to every project that uses this method:

```gitignore
# Cookies -- NEVER commit these
cookies.txt
yt_cookies.txt
*.cookies
```

---

## Reusable Prompt for AI Assistants

Copy this into ChatGPT, Claude, Gemini, or any AI assistant to implement this
exact pattern in your own project:

```
I am building a Python backend that uses yt-dlp to download videos from
Instagram and YouTube. I need authentication using browser-exported cookies
files (Netscape format) to bypass login walls and bot detection.

Please implement:

1. Two separate cookie files:
   - cookies.txt for Instagram (path from INSTAGRAM_COOKIES_PATH env var)
   - yt_cookies.txt for YouTube (path from YOUTUBE_COOKIES_PATH env var)

2. For Instagram:
   - Read INSTAGRAM_COOKIES_PATH from environment (default: ./cookies.txt)
   - Pass cookiefile to yt_dlp.YoutubeDL options
   - Catch yt_dlp.utils.DownloadError and convert login, rate-limit, 429,
     and private errors into clear human-readable messages

3. For YouTube:
   - Attempt 1: Download WITH cookies (required on server IPs)
   - Attempt 2 (auto-fallback): If bot-blocked (403, sign in, forbidden),
     retry WITHOUT cookies using a mobile client User-Agent
   - If both fail and no cookies configured, raise a clear setup message

4. Security:
   - Both files must be in .gitignore
   - Paths from environment variables only, never hardcoded
   - Support production Secret Files (e.g. Render /etc/secrets/)

Use Python 3.11+. Show me the complete downloader.py with full error handling.
```

---

## How It All Flows

Instagram download:

```
Instagram URL
    |
    +-- Read INSTAGRAM_COOKIES_PATH from .env
    |       ./cookies.txt              (local dev)
    |       /etc/secrets/cookies.txt   (production server)
    |
    +-- Attach cookiefile to yt-dlp options
    |
    +-- yt-dlp sends cookies with every HTTP request
    |       Instagram sees a valid logged-in session
    |       Download is allowed
    |
    +-- On error: raise a clear human-readable message
```

YouTube download:

```
YouTube URL
    |
    +-- Read YOUTUBE_COOKIES_PATH from .env (default: ./yt_cookies.txt)
    |
    +-- Attempt 1: Download WITH cookies
    |       |
    |       +-- Bot error (403 / sign in / forbidden)?
    |               |
    +-- Attempt 2: Retry WITHOUT cookies using a mobile User-Agent
    |
    +-- Both failed? Raise clear message with re-export instructions
```

---

## FAQ

**Q: Can I use my main Instagram or YouTube account?**

Yes, but using a spare or burner account is safer. If something goes wrong you
do not risk losing your main account.

**Q: Will Instagram or YouTube ban me for this?**

Exporting cookies for personal downloading is low-risk. Mass scraping thousands
of posts per day is a completely different story.

**Q: The same cookies.txt stops working after a few days. Why?**

Instagram aggressively rotates `sessionid` tokens. Re-export every 2 to 4 weeks
if you use this method frequently.

**Q: Does this work on Linux, Mac, and Windows?**

Yes. yt-dlp is fully cross-platform.

**Q: What if I cannot log into my browser on the production server?**

Export the cookies on your local machine, then upload the file to your server
as a secret or environment file. That is the standard workflow for deployments.

---

Made freely available for students and developers. No attribution required.
