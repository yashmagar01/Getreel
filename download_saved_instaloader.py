"""
Instagram Saved Posts/Reels Downloader (instaloader 4.15.3)
============================================================
Downloads ALL saved posts (reels, photos, carousels) from your
own Instagram account — with audio — using your browser session cookies.

HOW TO USE:
  1. Export cookies.txt from Chrome using "Get cookies.txt LOCALLY" extension
     while logged into instagram.com
  2. Put cookies.txt in the same folder as this script
  3. Run:  "C:/Users/Yash/AppData/Local/Programs/Python/Python313/python.exe" download_saved_instaloader.py

Downloads go to:  ./saved_downloads/<your_username>/
Audio is preserved natively (Instagram video files contain audio; no re-encoding needed).
"""

import instaloader
import http.cookiejar
import os
import sys
import time
import random

# ── Config ───────────────────────────────────────────────────────────────────
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
COOKIES_FILE = os.path.join(SCRIPT_DIR, "backend", "cookies.txt")
OUTPUT_DIR   = os.path.join(SCRIPT_DIR, "saved_downloads")
MIN_SLEEP    = 5     # seconds between posts (avoid rate-limit)
MAX_SLEEP    = 12
# ─────────────────────────────────────────────────────────────────────────────


def load_cookies(loader: instaloader.Instaloader, cookies_file: str):
    """Inject Netscape cookies.txt into instaloader's session."""
    jar = http.cookiejar.MozillaCookieJar(cookies_file)
    try:
        jar.load(ignore_discard=True, ignore_expires=True)
    except Exception as e:
        print(f"ERROR: Could not read cookies file: {e}")
        sys.exit(1)

    # update_cookies accepts a dict or a CookieJar
    cookie_dict = {c.name: c.value for c in jar if "instagram" in c.domain}
    loader.context.update_cookies(cookie_dict)
    print(f"✓ Loaded {len(cookie_dict)} Instagram cookies")


def main():
    # ── Pre-flight check ─────────────────────────────────────────────────────
    if not os.path.exists(COOKIES_FILE):
        print("=" * 60)
        print("ERROR: cookies.txt not found!")
        print()
        print("Steps:")
        print("  1. Install 'Get cookies.txt LOCALLY' extension in Chrome")
        print("  2. Visit https://www.instagram.com (make sure you're logged in)")
        print("  3. Click the extension → select instagram.com → Export as Netscape")
        print(f"  4. Save the file here:  {COOKIES_FILE}")
        print("=" * 60)
        sys.exit(1)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # ── Instaloader setup ────────────────────────────────────────────────────
    L = instaloader.Instaloader(
        dirname_pattern=os.path.join(OUTPUT_DIR, "{owner_username}"),
        filename_pattern="{date_utc:%Y-%m-%d}_{shortcode}",
        download_videos=True,           # reels/videos WITH audio
        download_video_thumbnails=True,
        download_geotags=False,
        download_comments=False,
        save_metadata=True,
        compress_json=False,
        post_metadata_txt_pattern="{caption}",
        max_connection_attempts=5,
        request_timeout=60,
    )

    # ── Load cookies ─────────────────────────────────────────────────────────
    load_cookies(L, COOKIES_FILE)

    # ── Detect logged-in username ─────────────────────────────────────────────
    # Accept as CLI arg: python download_saved_instaloader.py <username>
    if len(sys.argv) > 1:
        username = sys.argv[1].strip()
    else:
        username = L.context.username
    if not username:
        username = input("Enter your Instagram username: ").strip()

    if not username:
        print("ERROR: No username provided. Run as:")
        print("  python download_saved_instaloader.py <your_instagram_username>")
        sys.exit(1)

    print(f"✓ Logged in as: @{username}")
    print(f"  Output dir : {OUTPUT_DIR}/{username}/")
    print("-" * 50)

    # ── Load profile — prefer from_id (uses ds_user_id cookie, no web_profile_info call) ──
    # Extract ds_user_id from cookies file to avoid the rate-limited username lookup
    import http.cookiejar as _cj
    _jar = _cj.MozillaCookieJar(COOKIES_FILE)
    _jar.load(ignore_discard=True, ignore_expires=True)
    ds_user_id = next((c.value for c in _jar if c.name == "ds_user_id" and "instagram" in c.domain), None)

    try:
        if ds_user_id:
            print(f"  Using ds_user_id={ds_user_id} (skips rate-limited username lookup)")
            profile = instaloader.Profile.from_id(L.context, int(ds_user_id))
        else:
            profile = instaloader.Profile.from_username(L.context, username)
    except instaloader.exceptions.ProfileNotExistsException:
        print(f"ERROR: Profile not found. Check your cookies.")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR loading profile: {e}")
        sys.exit(1)

    print(f"✓ Profile: @{profile.username}  |  {profile.followers:,} followers")
    print("  Fetching saved posts collection… (this may take a moment)\n")

    # ── Download all saved posts ──────────────────────────────────────────────
    downloaded = 0
    skipped    = 0
    errors     = 0

    try:
        saved_iter = profile.get_saved_posts()
    except instaloader.exceptions.LoginRequiredException:
        print("ERROR: Not logged in. Your cookies may have expired.")
        print("Re-export cookies.txt from Chrome and try again.")
        sys.exit(1)

    for i, post in enumerate(saved_iter, start=1):
        try:
            target_dir = os.path.join(OUTPUT_DIR, username)
            os.makedirs(target_dir, exist_ok=True)

            label = f"[{i:04}] {post.typename:<15} {post.shortcode}  ({post.date_local.strftime('%Y-%m-%d')})"
            print(label, end="  ", flush=True)

            result = L.download_post(post, target=target_dir)

            if result:
                downloaded += 1
                print("✓ saved")
            else:
                skipped += 1
                print("(skip — already exists)")

            # Polite sleep
            time.sleep(random.uniform(MIN_SLEEP, MAX_SLEEP))

        except instaloader.exceptions.TooManyRequestsException:
            print("\n⚠  Rate limited! Sleeping 5 minutes before continuing…")
            time.sleep(300)
            continue
        except KeyboardInterrupt:
            print("\n\nInterrupted by user.")
            break
        except Exception as e:
            errors += 1
            print(f"✗ ERROR: {e}")
            time.sleep(5)
            continue

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print("Download complete!")
    print(f"  ✓ Downloaded : {downloaded}")
    print(f"  ~ Skipped   : {skipped}  (already existed)")
    print(f"  ✗ Errors    : {errors}")
    print(f"  📁 Output    : {OUTPUT_DIR}/{username}/")
    print()
    print("Audio note: Instagram video files (.mp4) already contain audio.")
    print("No conversion needed — files play as-is in VLC, Windows Media Player, etc.")


if __name__ == "__main__":
    main()
