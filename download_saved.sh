#!/usr/bin/env bash
# ============================================================
# Instagram Saved Posts/Reels Downloader
# Usage: bash download_saved.sh <your_instagram_username>
# Requires: cookies.txt in the same folder as this script
# ============================================================

YTDLP="/c/Users/Yash/AppData/Local/Programs/Python/Python313/Scripts/yt-dlp"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COOKIES="$SCRIPT_DIR/cookies.txt"
OUTPUT_DIR="$SCRIPT_DIR/saved_downloads"
USERNAME="${1:-}"

if [ -z "$USERNAME" ]; then
  echo "Usage: bash download_saved.sh <your_instagram_username>"
  exit 1
fi

if [ ! -f "$COOKIES" ]; then
  echo "ERROR: cookies.txt not found at $COOKIES"
  echo "Export it from Chrome using 'Get cookies.txt LOCALLY' extension while logged into Instagram."
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

echo "=========================================="
echo "Downloading Instagram saved posts for: $USERNAME"
echo "Output folder: $OUTPUT_DIR"
echo "=========================================="

"$YTDLP" \
  --cookies "$COOKIES" \
  --output "$OUTPUT_DIR/%(uploader)s - %(title).100s [%(id)s].%(ext)s" \
  --format "bestvideo+bestaudio/best" \
  --merge-output-format mp4 \
  --no-playlist \
  --write-thumbnail \
  --write-info-json \
  --ignore-errors \
  --sleep-interval 3 \
  --max-sleep-interval 8 \
  --retries 5 \
  "https://www.instagram.com/${USERNAME}/saved/all-posts/"

echo ""
echo "Done! Files saved to: $OUTPUT_DIR"
echo "Total files:"
ls "$OUTPUT_DIR" | wc -l
